package dev.petiscaria.comandas.enuns;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum CategoriaProduto {
    ESPETINHO(1),
    PORCOES(2),
    BEBIDAS(3),
    MINI_PIZZA(4),
    LANCHE(5),
    ACOMPANHAMENTO(6),
    REFEICAO(7),
    OUTROS(8);

    private final int id;

    CategoriaProduto(int id) {
        this.id = id;
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