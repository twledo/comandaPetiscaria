package dev.petiscaria.comandas.dto.pagamento;

import dev.petiscaria.comandas.enuns.MetodoPagamento;
import java.math.BigDecimal;
import java.util.List;

public record PagamentoParcialDTO(
        ModalidadeDivisao modalidade,
        Integer numeroPessoas,
        List<ParcelaPessoa> parcelas
) {
    public enum ModalidadeDivisao { IGUALITARIO, VALOR_LIVRE }

    public record ParcelaPessoa(
            String nomePessoa,
            BigDecimal valor,
            MetodoPagamento metodoPagamento // Obrigatório por pessoa
    ) {}
}