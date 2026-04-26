package dev.petiscaria.comandas.src.enuns;

import lombok.Getter;

@Getter
public enum CategoriaProduto {
    PORCOES (1),
    BEBIDAS (2);

    private final int id;

    CategoriaProduto(int id) {
        this.id = id;
    }

    public static CategoriaProduto fromId(int id) {
        for (CategoriaProduto c : values()) {
            if (c.id == id) return c;
        }
        throw new IllegalArgumentException("ID de categoria inválido: " + id);
    }
}