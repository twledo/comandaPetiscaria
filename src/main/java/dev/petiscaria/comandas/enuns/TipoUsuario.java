package dev.petiscaria.comandas.enuns;

import lombok.Getter;

@Getter
public enum TipoUsuario {
    ADMIN("ADMIN"),
    GARCOM("GARCOM");

    private final String role;

    TipoUsuario(String role) {
        this.role = role;
    }
}