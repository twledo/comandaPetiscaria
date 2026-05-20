package dev.petiscaria.comandas.service.pedido;

import dev.petiscaria.comandas.enuns.StatusPedido;
import dev.petiscaria.comandas.models.comanda.Comanda;
import dev.petiscaria.comandas.models.comanda.ItemPedido;
import dev.petiscaria.comandas.models.pedido.Pedido;
import dev.petiscaria.comandas.repository.comanda.ComandaRepository;
import dev.petiscaria.comandas.repository.comanda.ItemPedidoRepository;
import dev.petiscaria.comandas.repository.pedido.PedidoRepository;
import dev.petiscaria.comandas.service.comanda.ComandaService;
import dev.petiscaria.comandas.service.mesa.MesaService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final ItemPedidoRepository itemPedidoRepository;
    private final ComandaRepository comandaRepository;
    private final MesaService mesaService;
    private final ComandaService comandaService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public void entregarItem(Long itemId) {
        ItemPedido item = itemPedidoRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item não encontrado"));

        if (item.getPedido().getStatus() == StatusPedido.CANCELADO) {
            throw new IllegalStateException("Não é possível entregar itens de um pedido cancelado.");
        }

        // 1. Marca o item como entregue e SALVA
        item.setEntregue(true);
        itemPedidoRepository.saveAndFlush(item); // O Flush força a gravação imediata

        Pedido pedido = item.getPedido();

        // 2. 🚀 Lógica Blindada: Pergunta ao banco se ainda existe algum item FALSE
        long itensRestantes = itemPedidoRepository.countByPedidoIdAndEntregueFalse(pedido.getId());

        // 3. Se o contador for 0, o pedido todo está entregue
        if (itensRestantes == 0 && pedido.getStatus() == StatusPedido.PENDENTE) {
            pedido.setStatus(StatusPedido.ENTREGUE);
            pedidoRepository.save(pedido);
        }

        comandaService.notificarMudancaMesas();
    }

//    @Transactional
//    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
//    public void cancelarPedido(Long pedidoId) {
//        Pedido pedido = pedidoRepository.findById(pedidoId)
//                .orElseThrow(() -> new RuntimeException("Pedido não encontrado"));
//
//        pedido.setStatus(StatusPedido.CANCELADO);
//        pedidoRepository.save(pedido);
//
//        Comanda comanda = pedido.getComanda();
//        // Chamamos o cálculo que você criou na própria entidade
//        BigDecimal novoTotal = comanda.getTotal();
//        comanda.setTotal(novoTotal);
//        comandaRepository.save(comanda);
//
//        comandaService.notificarMudancaMesas();
//    }

    public List<Pedido> listarPorComanda(Long comandaId) {
        return pedidoRepository.findByComandaIdOrderByCreatedAtDesc(comandaId);
    }
}