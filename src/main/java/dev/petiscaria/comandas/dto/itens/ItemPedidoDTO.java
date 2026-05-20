package dev.petiscaria.comandas.dto.itens;

public record ItemPedidoDTO(
        Long produtoId,
        Integer quantidade,
        Boolean meiaPorcao,
        String observacao
) {}