package dev.petiscaria.comandas.dto.pagamento;

import dev.petiscaria.comandas.enuns.MetodoPagamento;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO para as modalidades de divisão de conta:
 * - IGUALITARIO: total dividido em N partes iguais
 * - VALOR_LIVRE: cada pessoa paga um valor específico
 *
 * Para IGUALITARIO: informar apenas numeroPessoas e metodoPagamento.
 * Para VALOR_LIVRE: informar a lista de parcelas e metodoPagamento.
 */
public record PagamentoParcialDTO(
        ModalidadeDivisao modalidade,
        Integer numeroPessoas,                // usado em IGUALITARIO
        List<ParcelaPessoa> parcelas,          // usado em VALOR_LIVRE
        MetodoPagamento metodoPagamento
) {
    public enum ModalidadeDivisao {
        IGUALITARIO,
        VALOR_LIVRE
    }

    public record ParcelaPessoa(
            String nomePessoa,
            BigDecimal valor
    ) {}
}