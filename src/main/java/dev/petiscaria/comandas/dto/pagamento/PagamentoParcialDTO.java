package dev.petiscaria.comandas.dto.pagamento;

import dev.petiscaria.comandas.enuns.MetodoPagamento;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record PagamentoParcialDTO(
        @NotNull(message = "Modalidade de divisão é obrigatória")
        ModalidadeDivisao modalidade,

        @NotNull(message = "Número de pessoas é obrigatório")
        Integer numeroPessoas,

        @NotNull(message = "Parcelas são obrigatórias")
        List<ParcelaPessoa> parcelas
) {
    public enum ModalidadeDivisao { IGUALITARIO, VALOR_LIVRE }

    public record ParcelaPessoa(
            @NotNull(message = "Nome da pessoa é obrigatório")
            String nomePessoa,

            @NotNull(message = "Valor é obrigatório")
            BigDecimal valor,

            @NotNull(message = "Método de pagamento é obrigatório")
            MetodoPagamento metodoPagamento
    ) {}
}