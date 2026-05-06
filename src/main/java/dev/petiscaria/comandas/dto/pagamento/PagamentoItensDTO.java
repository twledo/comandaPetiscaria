package dev.petiscaria.comandas.dto.pagamento;

import dev.petiscaria.comandas.enuns.MetodoPagamento;

import java.util.List;

/**
 * DTO para pagamento por itens selecionados.
 * Cada entrada pode pagar uma quantidade parcial do item
 * (ex: pagar 1 de 3 cervejas).
 */
public record PagamentoItensDTO(
        List<ItemSelecionado> itens,
        MetodoPagamento metodoPagamento
) {
    /**
     * @param itemId            ID do ItemPedido na comanda
     * @param quantidadePagar   Quantas unidades desta linha pagar (1 ≤ n ≤ quantidade total)
     */
    public record ItemSelecionado(
            Long itemId,
            Long quantidadePagar
    ) {}
}