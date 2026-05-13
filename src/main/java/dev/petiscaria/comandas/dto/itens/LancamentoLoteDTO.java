package dev.petiscaria.comandas.dto.itens;

import lombok.Data;

import java.util.List;

@Data
public class LancamentoLoteDTO {
    private List<ItemPedidoDTO> itens;
}