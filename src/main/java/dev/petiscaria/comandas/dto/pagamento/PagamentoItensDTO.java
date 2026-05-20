package dev.petiscaria.comandas.dto.pagamento;

import dev.petiscaria.comandas.enuns.MetodoPagamento;

import java.util.List;

/**
 * DTO para pagamento por itens selecionados.
 * Cada entrada pode pagar uma quantidade parcial do item e com um método específico
 * (ex: pagar 1 de 3 cervejas no PIX e outra no Cartão).
 */
public record PagamentoItensDTO(
        List<ItemSelecionado> itens
) {
    /**
     * @param itemId           ID do ItemPedido na comanda
     * @param quantidadePagar  Quantas unidades desta linha pagar (1 ≤ n ≤ quantidade total)
     * @param metodoPagamento  O método de pagamento escolhido apenas para este(s) item(ns)
     */
    public record ItemSelecionado(
            Long itemId,
            Long quantidadePagar,
            MetodoPagamento metodoPagamento
    ) {}
}