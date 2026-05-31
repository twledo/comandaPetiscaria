package dev.petiscaria.comandas.dto.caixa;

public record FechamentoCaixaDTO(
        Integer qtd200, Integer qtd100, Integer qtd50, Integer qtd20, Integer qtd10, Integer qtd5, Integer qtd2,
        Integer qtd1, Integer qtd050, Integer qtd025, Integer qtd010, Integer qtd005,
        String observacoes
) {
}