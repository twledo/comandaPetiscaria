package dev.petiscaria.comandas.enuns;

import lombok.Getter;

@Getter
public enum MetodoPagamento {
    PIX("Pix"),
    CARTAO_CREDITO("Cartão de Crédito"),
    CARTAO_DEBITO("Cartão de Débito"),
    DINHEIRO("Dinheiro");

    private final String descricao;

    MetodoPagamento(String descricao) {
        this.descricao = descricao;
    }
}