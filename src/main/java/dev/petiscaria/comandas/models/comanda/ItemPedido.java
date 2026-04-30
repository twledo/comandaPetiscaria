package dev.petiscaria.comandas.models.comanda;

import com.fasterxml.jackson.annotation.JsonIgnore;
import dev.petiscaria.comandas.models.produto.Produto;
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
    @JsonIgnore
    private Comanda comanda;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "produto_id")
    private Produto produto;

    private String nomeProduto; // Snapshot: Nome no momento da compra
    private Long quantidade;
    private BigDecimal precoUnitario; // Snapshot: Preço no momento da compra
    private String observacao;
    private boolean meiaPorcao = false;

    public BigDecimal getPrecoEfetivo() {
        BigDecimal preco = (precoUnitario != null) ? precoUnitario : BigDecimal.ZERO;
        if (meiaPorcao) {
            return preco.multiply(new BigDecimal("0.6"));
        }
        return preco;
    }

    // Método utilitário para calcular o total deste item (Preço * Qtd)
    public BigDecimal getTotalItem() {
        return getPrecoEfetivo().multiply(new BigDecimal(quantidade));
    }
}