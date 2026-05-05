package dev.petiscaria.comandas.enuns;

import lombok.Getter;

@Getter
public enum StatusComanda {
    ABERTA("Em atendimento"),
    AGUARDANDO_PAGAMENTO("Conta solicitada"),
    FINALIZADA("Paga e encerrada"),
    CANCELADA("Cancelada por erro");

    private final String descricao;

    StatusComanda(String descricao) {
        this.descricao = descricao;
    }
}