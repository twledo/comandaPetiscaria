package dev.petiscaria.comandas.service.comanda;

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
import java.time.LocalDateTime;
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

        if (possuiAberta) {
            throw new RuntimeException("Já existe um atendimento ativo para esta mesa!");
        }

        if (nomeCliente == null || nomeCliente.trim().isEmpty()) {
            throw new RuntimeException("O nome do cliente é obrigatório para iniciar o atendimento.");
        }

        Mesa mesa = mesaRepository.findById(mesaId)
                .orElseThrow(() -> new RuntimeException("Mesa não encontrada."));

        // Se a mesa já está OCUPADA, precisamos achar a comanda que está "segurando" ela
        if (mesa.getStatus() == StatusMesa.OCUPADA) {
            // Mudamos para buscar uma LISTA para evitar o erro de 'NonUniqueResult'
            List<Comanda> comandasAtivas = comandaRepository.findByMesaIdAtiva(mesa.getId());

            if (comandasAtivas.isEmpty()) {
                throw new RuntimeException("Mesa ocupada mas comanda não encontrada.");
            }

            // Retornamos a mais recente (assumindo que a lista vem ordenada ou pegando a primeira)
            return comandasAtivas.get(0);
        }

        // 1. Atualiza o status físico da Mesa
        mesa.setStatus(StatusMesa.OCUPADA);
        mesaRepository.save(mesa);

        Comanda comanda = Comanda.builder()
                .mesa(mesa)
                .nomeCliente(nomeCliente)
                .total(BigDecimal.ZERO)
                .status(StatusComanda.ABERTA)
                .build();

        comanda = comandaRepository.saveAndFlush(comanda);
        auditoriaService.registrarAcao(comanda, AcaoComanda.ABERTA, "Atendimento iniciado na mesa " + mesa.getNumero(), usuario);

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
        auditoriaService.registrarAcao(comanda, AcaoComanda.ITEM_ADICIONADO,
                String.format("Lançado: %s x%d", produto.getNome(), dadosItem.getQuantidade()), usuario);

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

        String detalheEstorno = String.format("ESTORNO: %s (Qtd: %d) - Valor: R$ %s",
                itemParaEstornar.getNomeProduto(),
                itemParaEstornar.getQuantidade(),
                itemParaEstornar.getTotalItem());

        auditoriaService.registrarAcao(comanda, AcaoComanda.ITEM_REMOVIDO, detalheEstorno, usuario);

        comanda.getItens().remove(itemParaEstornar);
        atualizarSaldoTotal(comanda);

        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')") // Geralmente restrito ao Admin/Gerente
    public Comanda reabrirAtendimento(Long comandaId, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        Mesa mesa = comanda.getMesa();

        if (mesa.getStatus() != StatusMesa.AGUARDANDO_PAGAMENTO) {
            throw new IllegalStateException("Apenas mesas em 'Aguardando Pagamento' podem ser reabertas.");
        }

        comanda.setStatus(StatusComanda.ABERTA);
        mesa.setStatus(StatusMesa.OCUPADA);
        mesaRepository.save(mesa);

        auditoriaService.registrarAcao(
                comanda,
                AcaoComanda.REABERTA,
                "Atendimento reaberto para lançamento de novos itens.",
                usuario
        );

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

        // A Mesa passa a aguardar o financeiro
        mesa.setStatus(StatusMesa.AGUARDANDO_PAGAMENTO);
        comanda.setStatus(StatusComanda.AGUARDANDO_PAGAMENTO); // Atualiza a comanda

        mesaRepository.save(mesa);
        auditoriaService.registrarAcao(comanda, AcaoComanda.FECHADA, "Pedido de conta realizado.", usuario);

        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

    @Transactional
    public Comanda pagarItensEspecificos(Long comandaId, List<Long> itensIds, MetodoPagamento metodo) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);

        // 1. Filtrar os itens da comanda que foram selecionados no Front
        List<ItemPedido> itensParaPagar = comanda.getItens().stream()
                .filter(item -> itensIds.contains(item.getId()))
                .toList();

        if (itensParaPagar.isEmpty()) {
            throw new RuntimeException("Nenhum item válido selecionado para pagamento.");
        }

        // 2. Calcular o valor total desse grupo de itens (usando sua regra de 60% se for meia)
        BigDecimal totalPagoAgora = itensParaPagar.stream()
                .map(ItemPedido::getTotalItem)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 3. Registrar o Recebimento no Financeiro
        ComandaRecebimento recebimento = ComandaRecebimento.builder()
                .comanda(comanda)
                .valor(totalPagoAgora)
                .metodoPagamento(metodo)
                .dataRecebimento(LocalDateTime.now())
                .build();
        recebimentoRepository.save(recebimento);

        // 4. Remover os itens da comanda ativa (eles já foram pagos)
        comanda.getItens().removeAll(itensParaPagar);

        // 5. Recalcular o saldo devedor da comanda
        atualizarSaldoTotal(comanda);

        // 6. Se a comanda ficar vazia, fechar o atendimento automaticamente
        if (comanda.getItens().isEmpty()) {
            comanda.setStatus(StatusComanda.FINALIZADA);
            comanda.getMesa().setStatus(StatusMesa.DISPONIVEL);
        }

        notificarMudancaMesas();
        return comandaRepository.save(comanda);
    }

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
                .usuario(usuarioCaixa)
                .build();
        recebimentoRepository.save(recebimento);

        mesa.setStatus(StatusMesa.DISPONIVEL);
        mesaRepository.save(mesa);

        comanda.setStatus(StatusComanda.FINALIZADA);
        comandaRepository.save(comanda);

        auditoriaService.registrarAcao(comanda, AcaoComanda.FECHADA, "Pagamento confirmado e mesa liberada.", usuarioCaixa);
        notificarMudancaMesas();
    }

    // --- AUXILIARES ---

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
        log.info("Enviando atualização de mesas via WebSocket para todos os dispositivos...");
        List<Mesa> listaAtualizada = mesaService.listarTodas();
        messagingTemplate.convertAndSend("/topic/mesas", listaAtualizada);
    }
}