package dev.petiscaria.comandas.enuns;

import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum CategoriaProduto {
    BEBIDAS(1),
    PORCOES(2),
    ESPETINHO(3);

    private final int id;

    CategoriaProduto(int id) {
        this.id = id;
    }

     @JsonValue
     public int getId() { return id; }
}