package dev.petiscaria.comandas.dto.itens;

import lombok.Data;

@Data
public class ItemPedidoDTO {
    private Long produtoId;
    private Integer quantidade;
    private Boolean meiaPorcao;
}