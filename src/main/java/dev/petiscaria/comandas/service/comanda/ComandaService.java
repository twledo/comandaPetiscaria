package dev.petiscaria.comandas.service.comanda;

import dev.petiscaria.comandas.dto.pagamento.PagamentoItensDTO;
import dev.petiscaria.comandas.dto.pagamento.PagamentoParcialDTO;
import dev.petiscaria.comandas.enuns.AcaoComanda;
import dev.petiscaria.comandas.enuns.MetodoPagamento;
import dev.petiscaria.comandas.enuns.StatusComanda;
import dev.petiscaria.comandas.enuns.StatusMesa;
import dev.petiscaria.comandas.models.comanda.Comanda;
import dev.petiscaria.comandas.models.comanda.ComandaRecebimento;
import dev.petiscaria.comandas.models.comanda.ItemPedido;
import dev.petiscaria.comandas.models.mesa.Mesa;
import dev.petiscaria.comandas.models.produto.Produto;
import dev.petiscaria.comandas.repository.comanda.ComandaRecebimentoRepository;
import dev.petiscaria.comandas.repository.comanda.ComandaRepository;
import dev.petiscaria.comandas.repository.mesa.MesaRepository;
import dev.petiscaria.comandas.repository.produto.ProdutoRepository;
import dev.petiscaria.comandas.service.audit.AuditoriaService;
import dev.petiscaria.comandas.service.mesa.MesaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ComandaService {

    private final ComandaRepository comandaRepository;
    private final MesaRepository mesaRepository;
    private final MesaService mesaService;
    private final ProdutoRepository produtoRepository;
    private final ComandaRecebimentoRepository recebimentoRepository;
    private final AuditoriaService auditoriaService;
    private final SimpMessagingTemplate messagingTemplate;

    // ─────────────────────────────────────────────────────────────────
    // FLUXO PRINCIPAL
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda iniciarAtendimento(Long mesaId, String usuario, String nomeCliente) {
        boolean possuiAberta = comandaRepository.existsByMesaIdAndStatus(mesaId, StatusComanda.ABERTA);

        if (possuiAberta) {
            throw new RuntimeException("Já existe um atendimento ativo para esta mesa!");
        }

        if (nomeCliente == null || nomeCliente.trim().isEmpty()) {
            throw new RuntimeException("O nome do cliente é obrigatório para iniciar o atendimento.");
        }

        Mesa mesa = mesaRepository.findById(mesaId)
                .orElseThrow(() -> new RuntimeException("Mesa não encontrada."));

        if (mesa.getStatus() == StatusMesa.OCUPADA) {
            List<Comanda> comandasAtivas = comandaRepository.findByMesaIdAtiva(mesa.getId());
            if (comandasAtivas.isEmpty()) {
                throw new RuntimeException("Mesa ocupada mas comanda não encontrada.");
            }
            return comandasAtivas.get(0);
        }

        mesa.setStatus(StatusMesa.OCUPADA);
        mesaRepository.save(mesa);

        Comanda comanda = Comanda.builder()
                .mesa(mesa)
                .nomeCliente(nomeCliente)
                .total(BigDecimal.ZERO)
                .status(StatusComanda.ABERTA)
                .build();

        comanda = comandaRepository.saveAndFlush(comanda);

        String detalheLog = String.format("Abertura de comanda: Mesa %s ocupada pelo cliente '%s'.", mesa.getNumero(), nomeCliente);
        auditoriaService.registrarAcao(comanda, AcaoComanda.ABERTA, detalheLog, usuario);

        notificarMudancaMesas();
        return comanda;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda registrarConsumo(Long comandaId, Long produtoId, ItemPedido dadosItem, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        garantirMesaOcupada(comanda.getMesa());

        Produto produto = produtoRepository.findById(produtoId)
                .orElseThrow(() -> new RuntimeException("Produto não encontrado."));

        comanda.getItens().stream()
                .filter(item -> item.getProduto().getId().equals(produtoId) &&
                        item.isMeiaPorcao() == dadosItem.isMeiaPorcao() &&
                        Objects.equals(item.getObservacao(), dadosItem.getObservacao()))
                .findFirst()
                .ifPresentOrElse(
                        item -> item.setQuantidade(item.getQuantidade() + dadosItem.getQuantidade()),
                        () -> {
                            dadosItem.setComanda(comanda);
                            dadosItem.setProduto(produto);
                            dadosItem.setNomeProduto(produto.getNome());
                            dadosItem.setPrecoUnitario(produto.getPreco());
                            comanda.getItens().add(dadosItem);
                        }
                );

        atualizarSaldoTotal(comanda);

        String detalheLog = String.format("Lançamento: %d un. de '%s' %s(R$ %.2f/un). Incremento total: R$ %.2f.",
                dadosItem.getQuantidade(),
                produto.getNome(),
                dadosItem.isMeiaPorcao() ? "[Meia Porção] " : "",
                dadosItem.getPrecoUnitario(),
                dadosItem.getTotalItem());

        auditoriaService.registrarAcaoItem(
                comanda,
                AcaoComanda.ITEM_ADICIONADO,
                detalheLog,
                usuario,
                produto.getId(),
                produto.getNome(),
                dadosItem.getQuantidade().intValue(), // Converte Long para Integer se necessário
                dadosItem.getTotalItem() // O valor da operação
        );

        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda estornarItem(Long comandaId, Long itemId, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        garantirMesaOcupada(comanda.getMesa());

        ItemPedido itemParaEstornar = comanda.getItens().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Item não encontrado nesta comanda."));

        String detalheEstorno = String.format("Estorno realizado: Remoção total de %d un. de '%s'. Valor devolvido: R$ %.2f.",
                itemParaEstornar.getQuantidade(),
                itemParaEstornar.getNomeProduto(),
                itemParaEstornar.getTotalItem());

        auditoriaService.registrarAcao(comanda, AcaoComanda.ITEM_REMOVIDO, detalheEstorno, usuario);

        comanda.getItens().remove(itemParaEstornar);
        atualizarSaldoTotal(comanda);

        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public Comanda reabrirAtendimento(Long comandaId, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        Mesa mesa = comanda.getMesa();

        if (mesa.getStatus() != StatusMesa.AGUARDANDO_PAGAMENTO) {
            throw new IllegalStateException("Apenas mesas em 'Aguardando Pagamento' podem ser reabertas.");
        }

        comanda.setStatus(StatusComanda.ABERTA);
        mesa.setStatus(StatusMesa.OCUPADA);
        mesaRepository.save(mesa);

        auditoriaService.registrarAcao(comanda, AcaoComanda.REABERTA,
                "Atendimento reaberto: mesa retornou ao status de ocupada para novos lançamentos.", usuario);

        notificarMudancaMesas();
        return comanda;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda solicitarFechamento(Long comandaId, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        Mesa mesa = comanda.getMesa();

        if (mesa.getStatus() != StatusMesa.OCUPADA) {
            throw new IllegalStateException("A mesa precisa estar ocupada para solicitar o fechamento.");
        }

        mesa.setStatus(StatusMesa.AGUARDANDO_PAGAMENTO);
        comanda.setStatus(StatusComanda.AGUARDANDO_PAGAMENTO);

        mesaRepository.save(mesa);

        String detalheLog = String.format("Conta solicitada pelo cliente. Valor total a conferir: R$ %.2f.", comanda.getTotal());

        auditoriaService.registrarAcao(comanda, AcaoComanda.CONTA_PEDIDA, detalheLog, usuario);
        
        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

    // ─────────────────────────────────────────────────────────────────
    // PAGAMENTO — POR ITENS SELECIONADOS
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public Comanda pagarItensEspecificos(Long comandaId,
                                         List<PagamentoItensDTO.ItemSelecionado> itensSelecionados,
                                         MetodoPagamento metodo,
                                         String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);

        if (itensSelecionados == null || itensSelecionados.isEmpty()) {
            throw new RuntimeException("Nenhum item selecionado para pagamento.");
        }

        BigDecimal totalPagoAgora = BigDecimal.ZERO;
        List<String> detalhes = new ArrayList<>();

        for (PagamentoItensDTO.ItemSelecionado sel : itensSelecionados) {
            ItemPedido item = comanda.getItens().stream()
                    .filter(i -> i.getId().equals(sel.itemId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Item #" + sel.itemId() + " não encontrado na comanda."));

            long qtdPagar = sel.quantidadePagar();
            long qtdTotal = item.getQuantidade();

            if (qtdPagar <= 0 || qtdPagar > qtdTotal) {
                throw new IllegalArgumentException(
                        String.format("Quantidade inválida para '%s': solicitado %d, disponível %d.",
                                item.getNomeProduto(), qtdPagar, qtdTotal));
            }

            BigDecimal precoUnitEfetivo = item.isMeiaPorcao()
                    ? item.getPrecoUnitario().multiply(new BigDecimal("0.6"))
                    : item.getPrecoUnitario();

            BigDecimal valorPago = precoUnitEfetivo.multiply(new BigDecimal(qtdPagar));
            totalPagoAgora = totalPagoAgora.add(valorPago);
            detalhes.add(String.format("%d un. de %s", qtdPagar, item.getNomeProduto()));

            if (qtdPagar == qtdTotal) {
                comanda.getItens().remove(item);
            } else {
                item.setQuantidade(qtdTotal - qtdPagar);
            }
        }

        ComandaRecebimento recebimento = ComandaRecebimento.builder()
                .comanda(comanda)
                .valor(totalPagoAgora)
                .metodoPagamento(metodo)
                .dataRecebimento(LocalDateTime.now())
                .usuario(usuario)
                .observacao("Pgto Itens: " + String.join(", ", detalhes))
                .build();
        recebimentoRepository.save(recebimento);

        atualizarSaldoTotal(comanda);

        String detalheAuditoria = String.format("Pagamento Parcial (Itens): Abatimento de R$ %.2f via %s. Itens pagos: %s.",
                totalPagoAgora, metodo.getDescricao(), String.join("; ", detalhes));

        auditoriaService.registrarAcaoPagamento(
                comanda,
                AcaoComanda.PAGAMENTO_PARCIAL,
                detalheAuditoria,
                usuario,
                totalPagoAgora, // Valor da operação
                metodo // O enum (PIX, DINHEIRO, etc)
        );

        verificarEFinalizarSeZerada(comanda, usuario);

        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

    // ─────────────────────────────────────────────────────────────────
    // PAGAMENTO — DIVISÃO IGUALITÁRIA OU POR VALOR LIVRE
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public Comanda registrarDivisaoConta(Long comandaId, PagamentoParcialDTO dto, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        List<ComandaRecebimento> novosRecebimentos = new ArrayList<>();
        String detalheAuditoria = "";

        switch (dto.modalidade()) {
            case IGUALITARIO -> {
                if (dto.numeroPessoas() == null || dto.numeroPessoas() < 2) {
                    throw new IllegalArgumentException("Número de pessoas deve ser pelo menos 2.");
                }
                BigDecimal valorPorPessoa = comanda.getTotal()
                        .divide(new BigDecimal(dto.numeroPessoas()), 2, RoundingMode.HALF_UP);

                for (int i = 1; i <= dto.numeroPessoas(); i++) {
                    novosRecebimentos.add(ComandaRecebimento.builder()
                            .comanda(comanda)
                            .valor(valorPorPessoa)
                            .metodoPagamento(dto.metodoPagamento())
                            .dataRecebimento(LocalDateTime.now())
                            .usuario(usuario)
                            .observacao(String.format("Divisão Igualitária — Pessoa %d de %d", i, dto.numeroPessoas()))
                            .build());
                }

                detalheAuditoria = String.format("Pagamento Parcial (Divisão Igualitária): Total da comanda dividido para %d pessoas. Cada um pagou R$ %.2f via %s.",
                        dto.numeroPessoas(), valorPorPessoa, dto.metodoPagamento().getDescricao());
            }

            case VALOR_LIVRE -> {
                if (dto.parcelas() == null || dto.parcelas().isEmpty()) {
                    throw new IllegalArgumentException("Informe pelo menos uma parcela para divisão por valor livre.");
                }

                BigDecimal somaInformada = dto.parcelas().stream()
                        .map(PagamentoParcialDTO.ParcelaPessoa::valor)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                if (somaInformada.subtract(comanda.getTotal()).abs().compareTo(new BigDecimal("0.02")) > 0) {
                    throw new IllegalArgumentException(
                            String.format("A soma das parcelas (R$ %.2f) não corresponde ao total da comanda (R$ %.2f).",
                                    somaInformada, comanda.getTotal()));
                }

                for (PagamentoParcialDTO.ParcelaPessoa parcela : dto.parcelas()) {
                    novosRecebimentos.add(ComandaRecebimento.builder()
                            .comanda(comanda)
                            .valor(parcela.valor())
                            .metodoPagamento(dto.metodoPagamento())
                            .dataRecebimento(LocalDateTime.now())
                            .usuario(usuario)
                            .observacao(String.format("Divisão Livre — %s pagou R$ %.2f", parcela.nomePessoa(), parcela.valor()))
                            .build());
                }

                detalheAuditoria = String.format("Pagamento Parcial (Valor Livre): Conta dividida entre %d pessoas, totalizando R$ %.2f pagos via %s.",
                        dto.parcelas().size(), somaInformada, dto.metodoPagamento().getDescricao());
            }
        }

        recebimentoRepository.saveAll(novosRecebimentos);
        auditoriaService.registrarAcao(comanda, AcaoComanda.PAGAMENTO_PARCIAL, detalheAuditoria, usuario);

        BigDecimal totalRecebido = recebimentoRepository.somarRecebimentosPorComanda(comandaId);

        // Verifica se o total recebido já cobriu o total da comanda
        if (totalRecebido.compareTo(comanda.getTotal()) >= 0) {
            auditoriaService.salvarSnapshotVenda(comanda, usuario);

            comanda.setStatus(StatusComanda.FINALIZADA);
            comanda.getMesa().setStatus(StatusMesa.DISPONIVEL);
            mesaRepository.save(comanda.getMesa());

            String finalizacaoLog = String.format("Conclusão de Pagamentos Parciais: O valor total de R$ %.2f foi atingido. Comanda encerrada e mesa liberada.", comanda.getTotal());
            auditoriaService.registrarAcao(comanda, AcaoComanda.PAGA, finalizacaoLog, usuario);
        }

        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

    // ─────────────────────────────────────────────────────────────────
    // FINALIZAÇÃO TOTAL (caixa confirma pagamento integral)
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void finalizarAtendimento(Long comandaId, String usuarioCaixa) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        Mesa mesa = comanda.getMesa();

        if (mesa.getStatus() != StatusMesa.AGUARDANDO_PAGAMENTO) {
            throw new IllegalStateException("A mesa precisa estar em conferência para ser finalizada.");
        }

        auditoriaService.salvarSnapshotVenda(comanda, usuarioCaixa);

        ComandaRecebimento recebimento = ComandaRecebimento.builder()
                .comanda(comanda)
                .valor(comanda.getTotal())
                // .metodoPagamento(MetodoPagamento.DINHEIRO) // Opcional: Adicione o recebimento via parâmetro no futuro
                .usuario(usuarioCaixa)
                .observacao("Pagamento Integral no Caixa")
                .build();
        recebimentoRepository.save(recebimento);

        mesa.setStatus(StatusMesa.DISPONIVEL);
        mesaRepository.save(mesa);

        comanda.setStatus(StatusComanda.FINALIZADA);
        comandaRepository.save(comanda);

        String detalheLog = String.format("Fechamento Integral: O valor de R$ %.2f foi pago em sua totalidade no caixa. Mesa liberada.", comanda.getTotal());
        auditoriaService.registrarAcao(comanda, AcaoComanda.PAGA, detalheLog, usuarioCaixa);

        notificarMudancaMesas();
    }

    // ─────────────────────────────────────────────────────────────────
    // AUXILIARES
    // ─────────────────────────────────────────────────────────────────

    private void garantirMesaOcupada(Mesa mesa) {
        if (mesa.getStatus() == StatusMesa.DISPONIVEL) {
            throw new IllegalStateException("A mesa está livre. Inicie o atendimento primeiro.");
        }
        if (mesa.getStatus() == StatusMesa.AGUARDANDO_PAGAMENTO) {
            throw new IllegalStateException("Mesa em fechamento. Reabra para alterar itens.");
        }
    }

    private void atualizarSaldoTotal(Comanda comanda) {
        BigDecimal novoTotal = comanda.getItens().stream()
                .map(ItemPedido::getTotalItem)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        comanda.setTotal(novoTotal);
    }

    private Comanda buscarPorIdOuFalhar(Long comandaId) {
        return comandaRepository.findById(comandaId)
                .orElseThrow(() -> new RuntimeException("Comanda não encontrada."));
    }

    private void notificarMudancaMesas() {
        log.info("Enviando atualização de mesas via WebSocket...");
        List<Mesa> listaAtualizada = mesaService.listarTodas();
        messagingTemplate.convertAndSend("/topic/mesas", listaAtualizada);
    }

    private void verificarEFinalizarSeZerada(Comanda comanda, String usuario) {
        if (comanda.getItens().isEmpty()) {
            auditoriaService.salvarSnapshotVenda(comanda, usuario);

            comanda.setStatus(StatusComanda.FINALIZADA);
            comanda.getMesa().setStatus(StatusMesa.DISPONIVEL);
            mesaRepository.save(comanda.getMesa());

            String detalheLog = "Conclusão Automática: Todos os itens da comanda foram pagos individualmente. Comanda zerada, encerrada e mesa liberada.";
            auditoriaService.registrarAcao(comanda, AcaoComanda.PAGA, detalheLog, usuario);
        }
    }
}