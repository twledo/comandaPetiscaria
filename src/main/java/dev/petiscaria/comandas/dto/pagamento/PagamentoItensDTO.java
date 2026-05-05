package dev.petiscaria.comandas.dto.pagamento;

import dev.petiscaria.comandas.enuns.MetodoPagamento;

import java.util.List;

public record PagamentoItensDTO(
        List<Long> itensIds,
        MetodoPagamento metodoPagamento
) {}