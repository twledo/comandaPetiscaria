package dev.petiscaria.comandas.models.mesa;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import dev.petiscaria.comandas.enuns.StatusMesa;
import dev.petiscaria.comandas.models.comanda.Comanda;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "mesas")
@Getter // Melhor que @Data para evitar loops
@Setter
@ToString(exclude = "comandaAtiva") // ESSENCIAL: Impede o loop no log
@EqualsAndHashCode(exclude = "comandaAtiva") // ESSENCIAL: Impede o loop em coleções
public class Mesa {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long numero;

    @Enumerated(EnumType.STRING)
    private StatusMesa status;

    @Transient
    @JsonIgnoreProperties("mesa")
    private Comanda comandaAtiva;
}