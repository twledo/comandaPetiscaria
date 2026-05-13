package dev.petiscaria.comandas.enuns;

import lombok.Getter;

@Getter
public enum SetorPreparacao {
    BEBIDAS("Bar / Bebidas"),
    COZINHA("Cozinha / Preparo"),
    ESPETINHO("Churrasqueira / Espetinhos");

    private final String descricao;

    SetorPreparacao(String descricao) {
        this.descricao = descricao;
    }
}