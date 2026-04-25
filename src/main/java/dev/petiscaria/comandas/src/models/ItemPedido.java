package dev.petiscaria.comandas.src.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import dev.petiscaria.comandas.src.enuns.StatusPreparo;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Data
@Table(name = "itens_pedido")
public class ItemPedido {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "comanda_id")
    @JsonIgnore
    private Comanda comanda;

    private String produto;
    private Integer quantidade;
    private BigDecimal precoUnitario;
    private String observacao;

    @Enumerated(EnumType.STRING)
    private StatusPreparo statusPreparo = StatusPreparo.PENDENTE;
}