package dev.petiscaria.comandas.enuns;

import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum UnidadeMedida {
    GRAMAS("G"),
    UNIDADE("UN"),
    UM_LITRO ("1L"),
    DOIS_LITROS("2L"),
    LATA("LT"),
    DOSE("DS");

    private final String sigla;

    UnidadeMedida(String sigla) {
        this.sigla = sigla;
    }

    @JsonValue
    public String getSigla() {
        return sigla;
    }
}