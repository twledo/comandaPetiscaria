package dev.petiscaria.comandas.models.caixa;

import jakarta.persistence.Embeddable;
import lombok.Data;

@Embeddable
@Data
public class ContagemDinheiro {
    private Integer qtd200 = 0;
    private Integer qtd100 = 0;
    private Integer qtd50 = 0;
    private Integer qtd20 = 0;
    private Integer qtd10 = 0;
    private Integer qtd5 = 0;
    private Integer qtd2 = 0;
    private Integer qtd1 = 0;
    private Integer qtd050 = 0;
    private Integer qtd025 = 0;
    private Integer qtd010 = 0;
    private Integer qtd005 = 0;
}