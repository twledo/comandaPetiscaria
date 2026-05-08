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

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda iniciarAtendimento(Long mesaId, String usuario, String nomeCliente) {
        boolean possuiAberta = comandaRepository.existsByMesaIdAndStatus(mesaId, StatusComanda.ABERTA);
        if (possuiAberta) throw new RuntimeException("Já existe um atendimento ativo para esta mesa!");
        if (nomeCliente == null || nomeCliente.trim().isEmpty()) throw new RuntimeException("O nome do cliente é obrigatório.");

        Mesa mesa = mesaRepository.findById(mesaId).orElseThrow(() -> new RuntimeException("Mesa não encontrada."));

        if (mesa.getStatus() == StatusMesa.OCUPADA) {
            List<Comanda> comandasAtivas = comandaRepository.findByMesaIdAtiva(mesa.getId());
            if (comandasAtivas.isEmpty()) throw new RuntimeException("Mesa ocupada mas comanda não encontrada.");
            return comandasAtivas.get(0);
        }

        mesa.setStatus(StatusMesa.OCUPADA);
        mesaRepository.save(mesa);

        Comanda comanda = comandaRepository.saveAndFlush(Comanda.builder()
                .mesa(mesa)
                .nomeCliente(nomeCliente)
                .total(BigDecimal.ZERO)
                .status(StatusComanda.ABERTA)
                .build());

        auditoriaService.registrarAcao(comanda, AcaoComanda.ABERTA, String.format("Abertura de comanda: Mesa %s ocupada pelo cliente '%s'.", mesa.getNumero(), nomeCliente), usuario);
        notificarMudancaMesas();
        return comanda;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda registrarConsumo(Long comandaId, Long produtoId, ItemPedido dadosItem, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        garantirMesaOcupada(comanda.getMesa());

        Produto produto = produtoRepository.findById(produtoId).orElseThrow(() -> new RuntimeException("Produto não encontrado."));

        comanda.getItens().stream()
                .filter(item -> item.getProduto().getId().equals(produtoId) && item.isMeiaPorcao() == dadosItem.isMeiaPorcao() && Objects.equals(item.getObservacao(), dadosItem.getObservacao()))
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

        String detalheLog = String.format("Lançamento: %d un. de '%s' %s(R$ %.2f/un).", dadosItem.getQuantidade(), produto.getNome(), dadosItem.isMeiaPorcao() ? "[Meia] " : "", dadosItem.getPrecoUnitario());
        auditoriaService.registrarAcaoItem(comanda, AcaoComanda.ITEM_ADICIONADO, detalheLog, usuario, produto.getId(), produto.getNome(), dadosItem.getQuantidade().intValue(), dadosItem.getTotalItem());

        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda estornarItem(Long comandaId, Long itemId, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        garantirMesaOcupada(comanda.getMesa());

        ItemPedido item = comanda.getItens().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Item não encontrado nesta comanda."));

        String detalheLog;
        BigDecimal valorUnitarioEstornado = item.isMeiaPorcao() ? item.getPrecoUnitario().multiply(new BigDecimal("0.6")) : item.getPrecoUnitario();

        if (item.getQuantidade() > 1) {
            item.setQuantidade(item.getQuantidade() - 1);
            detalheLog = String.format("Estorno parcial: Removida 1 un. de '%s'. Restam %d un.", item.getNomeProduto(), item.getQuantidade());
        } else {
            comanda.getItens().remove(item);
            detalheLog = String.format("Estorno total: Removida a última unidade de '%s'.", item.getNomeProduto());
        }

        atualizarSaldoTotal(comanda);
        auditoriaService.registrarAcaoItem(comanda, AcaoComanda.ITEM_REMOVIDO, detalheLog, usuario, item.getProduto().getId(), item.getNomeProduto(), 1, valorUnitarioEstornado);

        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public Comanda reabrirAtendimento(Long comandaId, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        Mesa mesa = comanda.getMesa();

        if (mesa.getStatus() != StatusMesa.AGUARDANDO_PAGAMENTO) throw new IllegalStateException("Apenas mesas em 'Aguardando Pagamento' podem ser reabertas.");

        comanda.setStatus(StatusComanda.ABERTA);
        mesa.setStatus(StatusMesa.OCUPADA);
        mesaRepository.save(mesa);

        auditoriaService.registrarAcao(comanda, AcaoComanda.REABERTA, "Atendimento reaberto: mesa retornou ao status de ocupada.", usuario);
        notificarMudancaMesas();
        return comanda;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda solicitarFechamento(Long comandaId, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        Mesa mesa = comanda.getMesa();

        if (mesa.getStatus() != StatusMesa.OCUPADA) throw new IllegalStateException("A mesa precisa estar ocupada para solicitar o fechamento.");

        mesa.setStatus(StatusMesa.AGUARDANDO_PAGAMENTO);
        comanda.setStatus(StatusComanda.AGUARDANDO_PAGAMENTO);
        mesaRepository.save(mesa);

        auditoriaService.registrarAcao(comanda, AcaoComanda.CONTA_PEDIDA, String.format("Conta solicitada. Valor: R$ %.2f.", comanda.getTotal()), usuario);
        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public Comanda pagarItensEspecificos(Long comandaId, List<PagamentoItensDTO.ItemSelecionado> itensSelecionados, MetodoPagamento metodo, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);

        if (itensSelecionados == null || itensSelecionados.isEmpty()) throw new RuntimeException("Nenhum item selecionado para pagamento.");

        BigDecimal totalPagoAgora = BigDecimal.ZERO;
        List<String> detalhesDescritivos = new ArrayList<>();
        List<ItemPedido> itensParaRemover = new ArrayList<>();

        for (PagamentoItensDTO.ItemSelecionado sel : itensSelecionados) {
            ItemPedido itemBanco = comanda.getItens().stream()
                    .filter(i -> i.getId().equals(sel.itemId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Item #" + sel.itemId() + " não pertence a esta comanda."));

            long qtdSolicitada = sel.quantidadePagar();
            long qtdDisponivel = itemBanco.getQuantidade();

            if (qtdSolicitada <= 0 || qtdSolicitada > qtdDisponivel) {
                throw new IllegalArgumentException(String.format("Fraude/Erro detectado: '%s' tem %d un, tentou pagar %d.", itemBanco.getNomeProduto(), qtdDisponivel, qtdSolicitada));
            }

            BigDecimal precoUnitarioEfetivo = itemBanco.isMeiaPorcao() ? itemBanco.getPrecoUnitario().multiply(new BigDecimal("0.6")) : itemBanco.getPrecoUnitario();
            BigDecimal valorCalculadoParaEsteItem = precoUnitarioEfetivo.multiply(new BigDecimal(qtdSolicitada));

            totalPagoAgora = totalPagoAgora.add(valorCalculadoParaEsteItem);
            detalhesDescritivos.add(String.format("%d un. de %s", qtdSolicitada, itemBanco.getNomeProduto()));

            if (qtdSolicitada == qtdDisponivel) {
                itensParaRemover.add(itemBanco);
            } else {
                itemBanco.setQuantidade(qtdDisponivel - qtdSolicitada);
            }
        }

        comanda.getItens().removeAll(itensParaRemover);

        ComandaRecebimento recebimento = ComandaRecebimento.builder()
                .comanda(comanda)
                .valor(totalPagoAgora.setScale(2, RoundingMode.HALF_UP))
                .metodoPagamento(metodo)
                .dataRecebimento(LocalDateTime.now())
                .usuario(usuario)
                .observacao("Pgto Itens: " + String.join(", ", detalhesDescritivos))
                .build();
        recebimentoRepository.save(recebimento);

        atualizarSaldoTotal(comanda);

        auditoriaService.registrarAcaoPagamento(comanda, AcaoComanda.PAGAMENTO_PARCIAL, String.format("Recebido R$ %.2f via %s.", totalPagoAgora, metodo.getDescricao()), usuario, totalPagoAgora, metodo);

        verificarEFinalizarSeZerada(comanda, usuario);
        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public Comanda registrarDivisaoConta(Long comandaId, PagamentoParcialDTO dto, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        List<ComandaRecebimento> novosRecebimentos = new ArrayList<>();
        String detalheAuditoria = "";

        switch (dto.modalidade()) {
            case IGUALITARIO -> {
                if (dto.numeroPessoas() == null || dto.numeroPessoas() < 2) throw new IllegalArgumentException("Pelo menos 2 pessoas.");
                BigDecimal valorPorPessoa = comanda.getTotal().divide(new BigDecimal(dto.numeroPessoas()), 2, RoundingMode.HALF_UP);
                for (int i = 1; i <= dto.numeroPessoas(); i++) {
                    novosRecebimentos.add(ComandaRecebimento.builder().comanda(comanda).valor(valorPorPessoa).metodoPagamento(dto.metodoPagamento()).dataRecebimento(LocalDateTime.now()).usuario(usuario).observacao(String.format("Divisão Igual - Pessoa %d", i)).build());
                }
                detalheAuditoria = String.format("Divisão Igualitária: %d pessoas, R$ %.2f cada via %s.", dto.numeroPessoas(), valorPorPessoa, dto.metodoPagamento().getDescricao());
            }
            case VALOR_LIVRE -> {
                if (dto.parcelas() == null || dto.parcelas().isEmpty()) throw new IllegalArgumentException("Informe as parcelas.");
                BigDecimal somaInformada = dto.parcelas().stream().map(PagamentoParcialDTO.ParcelaPessoa::valor).reduce(BigDecimal.ZERO, BigDecimal::add);
                if (somaInformada.subtract(comanda.getTotal()).abs().compareTo(new BigDecimal("0.02")) > 0) {
                    throw new IllegalArgumentException(String.format("Soma (R$ %.2f) não bate com total (R$ %.2f).", somaInformada, comanda.getTotal()));
                }
                for (PagamentoParcialDTO.ParcelaPessoa p : dto.parcelas()) {
                    novosRecebimentos.add(ComandaRecebimento.builder().comanda(comanda).valor(p.valor()).metodoPagamento(dto.metodoPagamento()).dataRecebimento(LocalDateTime.now()).usuario(usuario).observacao(String.format("Divisão Livre — %s pagou R$ %.2f", p.nomePessoa(), p.valor())).build());
                }
                detalheAuditoria = String.format("Divisão Livre: %d pessoas pagaram R$ %.2f via %s.", dto.parcelas().size(), somaInformada, dto.metodoPagamento().getDescricao());
            }
        }

        recebimentoRepository.saveAll(novosRecebimentos);
        auditoriaService.registrarAcao(comanda, AcaoComanda.PAGAMENTO_PARCIAL, detalheAuditoria, usuario);

        BigDecimal totalRecebido = recebimentoRepository.somarRecebimentosPorComanda(comandaId);
        if (totalRecebido.compareTo(comanda.getTotal()) >= 0) {
            auditoriaService.salvarSnapshotVenda(comanda, usuario);
            comanda.setStatus(StatusComanda.FINALIZADA);
            comanda.getMesa().setStatus(StatusMesa.DISPONIVEL);
            mesaRepository.save(comanda.getMesa());
            auditoriaService.registrarAcao(comanda, AcaoComanda.PAGA, "Total atingido. Comanda encerrada.", usuario);
        }

        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void finalizarAtendimento(Long comandaId, String usuarioCaixa) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        Mesa mesa = comanda.getMesa();
        if (mesa.getStatus() != StatusMesa.AGUARDANDO_PAGAMENTO) throw new IllegalStateException("Mesa precisa estar em conferência.");

        auditoriaService.salvarSnapshotVenda(comanda, usuarioCaixa);
        ComandaRecebimento recebimento = ComandaRecebimento.builder().comanda(comanda).valor(comanda.getTotal()).usuario(usuarioCaixa).observacao("Pgto Integral Caixa").build();
        recebimentoRepository.save(recebimento);

        mesa.setStatus(StatusMesa.DISPONIVEL);
        mesaRepository.save(mesa);
        comanda.setStatus(StatusComanda.FINALIZADA);
        comandaRepository.save(comanda);

        auditoriaService.registrarAcao(comanda, AcaoComanda.PAGA, "Fechamento Integral no caixa.", usuarioCaixa);
        notificarMudancaMesas();
    }

    private void garantirMesaOcupada(Mesa mesa) {
        if (mesa.getStatus() != StatusMesa.OCUPADA) throw new IllegalStateException("A mesa não está em estado de lançamento. Reabra a comanda para alterar itens.");
    }

    private void atualizarSaldoTotal(Comanda comanda) {
        comanda.setTotal(comanda.getItens().stream().map(ItemPedido::getTotalItem).reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    private Comanda buscarPorIdOuFalhar(Long comandaId) {
        return comandaRepository.findById(comandaId).orElseThrow(() -> new RuntimeException("Comanda não encontrada."));
    }

    private void notificarMudancaMesas() {
        messagingTemplate.convertAndSend("/topic/mesas", mesaService.listarTodas());
    }

    private void verificarEFinalizarSeZerada(Comanda comanda, String usuario) {
        if (comanda.getItens().isEmpty()) {
            auditoriaService.salvarSnapshotVenda(comanda, usuario);
            comanda.setStatus(StatusComanda.FINALIZADA);
            comanda.getMesa().setStatus(StatusMesa.DISPONIVEL);
            mesaRepository.save(comanda.getMesa());
            auditoriaService.registrarAcao(comanda, AcaoComanda.PAGA, "Comanda zerada após pagamento. Mesa liberada.", usuario);
        }
    }
}