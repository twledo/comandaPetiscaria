package dev.petiscaria.comandas.dto.itens;

import java.util.List;

public record LancamentoLoteDTO (
        List<ItemPedidoDTO> itens
) {}