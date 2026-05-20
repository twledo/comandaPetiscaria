package dev.petiscaria.comandas.service.comanda;

import dev.petiscaria.comandas.dto.itens.ItemPedidoDTO;
import dev.petiscaria.comandas.dto.itens.LancamentoLoteDTO;
import dev.petiscaria.comandas.dto.pagamento.PagamentoItensDTO;
import dev.petiscaria.comandas.dto.pagamento.PagamentoParcialDTO;
import dev.petiscaria.comandas.enuns.*;
import dev.petiscaria.comandas.models.comanda.Comanda;
import dev.petiscaria.comandas.models.comanda.ComandaRecebimento;
import dev.petiscaria.comandas.models.comanda.ItemPedido;
import dev.petiscaria.comandas.models.mesa.Mesa;
import dev.petiscaria.comandas.models.pedido.Pedido;
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
import java.util.Map;
import java.util.stream.Collectors;

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
        if (nomeCliente == null || nomeCliente.trim().isEmpty())
            throw new RuntimeException("O nome do cliente é obrigatório.");

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
                .ultimoAtendente(usuario)
                .total(BigDecimal.ZERO)
                .status(StatusComanda.ABERTA)
                .build());

        auditoriaService.registrarAcao(comanda, AcaoComanda.ABERTA, String.format("Abertura de comanda: Mesa %s ocupada pelo cliente '%s'.", mesa.getNumero(), nomeCliente), usuario);
        notificarMudancaMesas();
        return comanda;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda registrarConsumoEmLote(Long comandaId, LancamentoLoteDTO lote, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        garantirMesaOcupada(comanda.getMesa());

        Pedido novoPedido = new Pedido();
        novoPedido.setComanda(comanda);
        novoPedido.setUsuarioResponsavel(usuario);
        novoPedido.setStatus(StatusPedido.PENDENTE);

        for (ItemPedidoDTO itemDto : lote.itens()) {
            Produto produto = produtoRepository.findById(itemDto.produtoId())
                    .orElseThrow(() -> new RuntimeException("Produto não encontrado."));

            String obs = (itemDto.observacao() == null) ? "" : itemDto.observacao().trim();
            boolean ehMeia = (itemDto.meiaPorcao() != null && itemDto.meiaPorcao());

            // REGRA: Se houver observação, NUNCA agrupa.
            // Se não houver, tenta agrupar apenas com outros sem observação.
            boolean temObs = !obs.isEmpty();

            ItemPedido itemExistente = null;
            if (!temObs) { // Só tentamos agrupar itens comuns, sem observações
                itemExistente = novoPedido.getItens().stream()
                        .filter(i -> i.getProduto().getId().equals(produto.getId()))
                        .filter(i -> i.isMeiaPorcao() == ehMeia)
                        .filter(i -> (i.getObservacao() == null || i.getObservacao().trim().isEmpty()))
                        .findFirst()
                        .orElse(null);
            }

            if (itemExistente != null) {
                itemExistente.setQuantidade(itemExistente.getQuantidade() + itemDto.quantidade());
            } else {
                // Aqui criamos um novo registro sempre que houver observação
                ItemPedido novoItem = new ItemPedido();
                novoItem.setPedido(novoPedido);
                novoItem.setProduto(produto);
                novoItem.setNomeProduto(produto.getNome());
                novoItem.setPrecoUnitario(produto.getPreco());
                novoItem.setQuantidade(itemDto.quantidade().longValue());
                novoItem.setMeiaPorcao(ehMeia);
                novoItem.setObservacao(itemDto.observacao());
                novoPedido.getItens().add(novoItem);
            }
        }

        comanda.getPedidos().add(novoPedido);
        comanda.setUltimoAtendente(usuario);
        atualizarSaldoTotal(comanda);

        Comanda comandaSalva = comandaRepository.saveAndFlush(comanda);

        Pedido pedidoSalvo = comandaSalva.getPedidos().get(comandaSalva.getPedidos().size() - 1);
        String numeroPedido = "PED-" + pedidoSalvo.getId();

        for (ItemPedido item : pedidoSalvo.getItens()) {
            String detalheLog = String.format("Novo Pedido: %d un. de '%s'.", item.getQuantidade(), item.getNomeProduto());
            auditoriaService.registrarAcaoItem(comandaSalva, AcaoComanda.ITEM_ADICIONADO, detalheLog, usuario, numeroPedido, item.getProduto().getId(), item.getNomeProduto(), Math.toIntExact(item.getQuantidade()), item.getTotalItem());
        }

        // Impressão dos tickets (mantida a lógica de agrupamento por setor)
        Map<SetorPreparacao, List<ItemPedido>> itensPorSetor = pedidoSalvo.getItens().stream()
                .collect(Collectors.groupingBy(item -> item.getProduto().getCategoria().getSetor()));

        for (Map.Entry<SetorPreparacao, List<ItemPedido>> grupoSetor : itensPorSetor.entrySet()) {
            StringBuilder ticket = new StringBuilder();
            ticket.append("=================================");
            ticket.append("\n    ").append(grupoSetor.getKey().getDescricao().toUpperCase());
            ticket.append("\n    MESA ").append(comandaSalva.getMesa().getNumero());
            if (comandaSalva.getNomeCliente() != null && !comandaSalva.getNomeCliente().trim().isEmpty()) {
                ticket.append("\n    CLIENTE: ").append(comandaSalva.getNomeCliente().toUpperCase());
            }
            ticket.append("\n    PEDIDO: ").append(numeroPedido);
            ticket.append("\n=================================");

            Map<CategoriaProduto, List<ItemPedido>> itensDaCategoria = grupoSetor.getValue().stream()
                    .collect(Collectors.groupingBy(item -> item.getProduto().getCategoria()));

            for (Map.Entry<CategoriaProduto, List<ItemPedido>> grupoCat : itensDaCategoria.entrySet()) {
                ticket.append("\n\n--- ").append(grupoCat.getKey().name().replace("_", " ")).append(" ---");
                for (ItemPedido item : grupoCat.getValue()) {
                    ticket.append(String.format("\n%dx %-15s %s", item.getQuantidade(), item.getNomeProduto(), item.isMeiaPorcao() ? "(MEIA)" : ""));
                    if (item.getObservacao() != null && !item.getObservacao().trim().isEmpty()) {
                        ticket.append("\n   >> Obs: ").append(item.getObservacao().toUpperCase());
                    }
                }
            }
            ticket.append("\n\n---------------------------------");
            ticket.append("\nEnviado por: ").append(usuario);
            ticket.append("\n=================================\n");
            System.out.println(ticket.toString());
        }

        notificarMudancaMesas();
        return comandaSalva;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda estornarItem(Long comandaId, Long itemId, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        garantirMesaOcupada(comanda.getMesa());

        ItemPedido itemParaEstornar = comanda.getPedidos().stream()
                .flatMap(pedido -> pedido.getItens().stream())
                .filter(item -> item.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Item não encontrado nesta comanda."));

        Pedido pedidoPai = itemParaEstornar.getPedido();
        BigDecimal valorUnitarioEstornado = itemParaEstornar.getPrecoEfetivo();
        String detalheLog;

        if (itemParaEstornar.getQuantidade() > 1) {
            itemParaEstornar.setQuantidade(itemParaEstornar.getQuantidade() - 1);
            detalheLog = String.format("Estorno parcial: Removida 1 un. de '%s'. Restam %d un.",
                    itemParaEstornar.getNomeProduto(), itemParaEstornar.getQuantidade());
        } else {
            pedidoPai.getItens().remove(itemParaEstornar);
            detalheLog = String.format("Estorno total: Removida a última unidade de '%s'.",
                    itemParaEstornar.getNomeProduto());

            if (pedidoPai.getItens().isEmpty()) {
                comanda.getPedidos().remove(pedidoPai);
                detalheLog += " O pedido vazio foi removido.";
            }
        }

        atualizarSaldoTotal(comanda);

        auditoriaService.registrarAcaoItem(comanda, AcaoComanda.ITEM_REMOVIDO, detalheLog, usuario,
                "PED-" + pedidoPai.getId(), itemParaEstornar.getProduto().getId(),
                itemParaEstornar.getNomeProduto(), 1, valorUnitarioEstornado);

        notificarMudancaMesas();

        return comandaRepository.save(comanda);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public Comanda reabrirAtendimento(Long comandaId, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        Mesa mesa = comanda.getMesa();

        if (mesa.getStatus() != StatusMesa.AGUARDANDO_PAGAMENTO)
            throw new IllegalStateException("Apenas mesas em 'Aguardando Pagamento' podem ser reabertas.");

        comanda.setStatus(StatusComanda.ABERTA);
        mesa.setStatus(StatusMesa.OCUPADA);
        mesaRepository.save(mesa);

        auditoriaService.registrarAcao(comanda, AcaoComanda.REABERTA, "Atendimento reaberto.", usuario);
        notificarMudancaMesas();
        return comanda;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda solicitarFechamento(Long comandaId, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        Mesa mesa = comanda.getMesa();

        if (mesa.getStatus() != StatusMesa.OCUPADA)
            throw new IllegalStateException("A mesa precisa estar ocupada.");

        boolean temPendente = comanda.getPedidos().stream()
                .anyMatch(p -> p.getStatus() == StatusPedido.PENDENTE);

        if (temPendente) {
            throw new IllegalStateException("Não é possível fechar a conta. Existem pedidos pendentes de entrega.");
        }

        mesa.setStatus(StatusMesa.AGUARDANDO_PAGAMENTO);
        comanda.setStatus(StatusComanda.AGUARDANDO_PAGAMENTO);
        comanda.setUltimoAtendente(usuario);
        mesaRepository.save(mesa);

        auditoriaService.registrarAcao(comanda, AcaoComanda.CONTA_PEDIDA, String.format("Conta solicitada. Valor: R$ %.2f.", comanda.getTotal()), usuario);
        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public Comanda pagarItensEspecificos(Long comandaId, List<PagamentoItensDTO.ItemSelecionado> itensSelecionados, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);

        if (itensSelecionados == null || itensSelecionados.isEmpty())
            throw new RuntimeException("Nenhum item selecionado.");

        BigDecimal totalPagoAgora = BigDecimal.ZERO;

        for (PagamentoItensDTO.ItemSelecionado sel : itensSelecionados) {
            ItemPedido itemBanco = comanda.getPedidos().stream()
                    .flatMap(p -> p.getItens().stream())
                    .filter(i -> i.getId().equals(sel.itemId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Item #" + sel.itemId() + " não pertence a esta comanda."));

            long qtdSolicitada = sel.quantidadePagar();
            long qtdDisponivel = itemBanco.getQuantidade();

            if (qtdSolicitada <= 0 || qtdSolicitada > qtdDisponivel) {
                throw new IllegalArgumentException("Quantidade inválida.");
            }

            BigDecimal precoUnitarioEfetivo = itemBanco.getPrecoEfetivo();
            BigDecimal valorCalculadoParaEsteItem = precoUnitarioEfetivo.multiply(new BigDecimal(qtdSolicitada));

            // Salva um recebimento atômico para este item usando o método selecionado
            ComandaRecebimento recebimento = ComandaRecebimento.builder()
                    .comanda(comanda)
                    .valor(valorCalculadoParaEsteItem.setScale(2, RoundingMode.HALF_UP))
                    .metodoPagamento(sel.metodoPagamento())
                    .dataRecebimento(LocalDateTime.now())
                    .usuario(usuario)
                    .observacao(String.format("Pgto Item: %d un. de %s", qtdSolicitada, itemBanco.getNomeProduto()))
                    .build();
            recebimentoRepository.save(recebimento);

            totalPagoAgora = totalPagoAgora.add(valorCalculadoParaEsteItem);

            if (qtdSolicitada == qtdDisponivel) {
                itemBanco.getPedido().getItens().remove(itemBanco);
            } else {
                itemBanco.setQuantidade(qtdDisponivel - qtdSolicitada);
            }
        }

        atualizarSaldoTotal(comanda);

        // O método do primeiro item é registrado na auditoria global para histórico resumido
        MetodoPagamento metodoAuditoria = itensSelecionados.get(0).metodoPagamento();
        auditoriaService.registrarAcaoPagamento(comanda, AcaoComanda.PAGAMENTO_PARCIAL, "Recebido pagamento parcial de itens.", usuario, totalPagoAgora, metodoAuditoria);

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
                for (PagamentoParcialDTO.ParcelaPessoa p : dto.parcelas()) {
                    novosRecebimentos.add(ComandaRecebimento.builder()
                            .comanda(comanda)
                            .valor(p.valor())
                            .metodoPagamento(p.metodoPagamento())
                            .dataRecebimento(LocalDateTime.now())
                            .usuario(usuario)
                            .observacao("Divisão Igual: " + p.nomePessoa())
                            .build());
                }
                detalheAuditoria = "Divisão Igualitária registrada com múltiplos métodos.";
            }

            case VALOR_LIVRE -> {
                for (PagamentoParcialDTO.ParcelaPessoa p : dto.parcelas()) {
                    novosRecebimentos.add(ComandaRecebimento.builder()
                            .comanda(comanda)
                            .valor(p.valor())
                            .metodoPagamento(p.metodoPagamento())
                            .dataRecebimento(LocalDateTime.now())
                            .usuario(usuario)
                            .observacao("Divisão Livre")
                            .build());
                }
                detalheAuditoria = "Divisão Livre registrada com múltiplos métodos.";
            }
        }

        recebimentoRepository.saveAll(novosRecebimentos);
        auditoriaService.registrarAcao(comanda, AcaoComanda.PAGAMENTO_PARCIAL, detalheAuditoria, usuario);

        BigDecimal totalRecebido = recebimentoRepository.somarRecebimentosPorComanda(comandaId);
        if (totalRecebido.compareTo(comanda.getTotal()) >= 0) {
            finalizarProcesso(comanda, usuario);
        }

        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void finalizarAtendimento(Long comandaId, String usuarioCaixa) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        Mesa mesa = comanda.getMesa();
        if (mesa.getStatus() != StatusMesa.AGUARDANDO_PAGAMENTO)
            throw new IllegalStateException("Mesa não está em conferência.");

        ComandaRecebimento recebimento = ComandaRecebimento.builder()
                .comanda(comanda)
                .valor(comanda.getTotal())
                .usuario(usuarioCaixa)
                .observacao("Pgto Integral")
                .build();
        recebimentoRepository.save(recebimento);

        finalizarProcesso(comanda, usuarioCaixa);
        notificarMudancaMesas();
    }

    private void finalizarProcesso(Comanda comanda, String usuario) {
        auditoriaService.salvarSnapshotVenda(comanda, usuario);
        comanda.setStatus(StatusComanda.FINALIZADA);
        comanda.getMesa().setStatus(StatusMesa.DISPONIVEL);
        mesaRepository.save(comanda.getMesa());
        auditoriaService.registrarAcao(comanda, AcaoComanda.PAGA, "Atendimento finalizado.", usuario);
    }

    private void garantirMesaOcupada(Mesa mesa) {
        if (mesa.getStatus() != StatusMesa.OCUPADA)
            throw new IllegalStateException("Mesa não está ocupada.");
    }

    private void atualizarSaldoTotal(Comanda comanda) {
        BigDecimal total = comanda.getPedidos().stream()
                .filter(pedido -> pedido.getStatus() != StatusPedido.CANCELADO)
                .flatMap(pedido -> pedido.getItens().stream())
                .map(ItemPedido::getTotalItem)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        comanda.setTotal(total);
    }

    private Comanda buscarPorIdOuFalhar(Long comandaId) {
        return comandaRepository.findById(comandaId).orElseThrow(() -> new RuntimeException("Comanda não encontrada."));
    }

    public void notificarMudancaMesas() {
        messagingTemplate.convertAndSend("/topic/mesas", mesaService.listarTodas());
    }

    private void verificarEFinalizarSeZerada(Comanda comanda, String usuario) {
        boolean comandaVazia = comanda.getPedidos().stream().allMatch(p -> p.getItens().isEmpty());
        if (comandaVazia) {
            finalizarProcesso(comanda, usuario);
        }
    }
}