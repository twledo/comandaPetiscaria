package dev.petiscaria.comandas.enuns;

import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum UnidadeMedida {
    UNIDADE("UN"),
    GARRAFA("GF"),
    LATA("LT"),
    DOSE("DS"),
    GRAMAS("G"),
    QUILO("KG"),
    MILILITROS("ML"),
    PORCAO("PORCAO");

    private final String sigla;

    UnidadeMedida(String sigla) {
        this.sigla = sigla;
    }

    @JsonValue // O SEGREDO ESTÁ AQUI
    public String getSigla() {
        return sigla;
    }
}