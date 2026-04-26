package dev.petiscaria.comandas.src.models.comanda;

import com.fasterxml.jackson.annotation.JsonIgnore;
import dev.petiscaria.comandas.src.enuns.StatusPreparo;
import dev.petiscaria.comandas.src.models.produto.Produto;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "itens_pedido")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemPedido {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comanda_id")
    @JsonIgnore // Importante: evita que o Jackson tente carregar a comanda dentro do item
    private Comanda comanda;

    private String nomeProduto;
    private Integer quantidade;
    private BigDecimal precoUnitario;
    private String observacao;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private StatusPreparo statusPreparo = StatusPreparo.PENDENTE;

    private boolean meiaPorcao = false;

    // Metodo utilitário para calcular o preço real na hora de somar na comanda
    public BigDecimal getPrecoEfetivo() {
        if (meiaPorcao) {
        //Cobra 60% da porção inteira
            return precoUnitario.multiply(new BigDecimal("0.6"));
        }
        return precoUnitario;
    }
}