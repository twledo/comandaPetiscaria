package dev.petiscaria.comandas.enuns;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum CategoriaProduto {

    // 1. Vai pra Churrasqueira
    ESPETINHO(1, SetorPreparacao.ESPETINHO),

    // 2. Vai tudo pra Cozinha
    PORCOES(2, SetorPreparacao.COZINHA),
    MINI_PIZZA(4, SetorPreparacao.COZINHA),
    LANCHE(5, SetorPreparacao.COZINHA),
    ACOMPANHAMENTO(6, SetorPreparacao.COZINHA),
    REFEICAO(7, SetorPreparacao.COZINHA),
    OUTROS(8, SetorPreparacao.COZINHA),

    // 3. Vai pro Bar
    BEBIDAS(3, SetorPreparacao.BEBIDAS);

    private final int id;
    private final SetorPreparacao setor;

    CategoriaProduto(int id, SetorPreparacao setor) {
        this.id = id;
        this.setor = setor;
    }

    @JsonValue
    public int getId() {
        return id;
    }

    @JsonCreator
    public static CategoriaProduto fromId(int id) {
        for (CategoriaProduto c : values()) {
            if (c.id == id) {
                return c;
            }
        }
        throw new IllegalArgumentException("Categoria inválida: " + id);
    }
}