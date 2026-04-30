package dev.petiscaria.comandas.models.mesa;

import dev.petiscaria.comandas.enuns.StatusMesa;
import dev.petiscaria.comandas.models.comanda.Comanda;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "mesas")
@Data
public class Mesa {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long numero;

    @Enumerated(EnumType.STRING)
    private StatusMesa status;

    @Transient // Não cria coluna no banco
    private Comanda comandaAtiva;
}