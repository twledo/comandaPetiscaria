package dev.petiscaria.comandas.models.comanda;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import dev.petiscaria.comandas.models.produto.Produto;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "itens_pedido")
@Getter
@Setter
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

    private String numeroPedido;
    private String nomeProduto; // Snapshot: Nome no momento da compra
    private Long quantidade;
    private BigDecimal precoUnitario; // Snapshot: Preço no momento da compra
    private String observacao;
    private boolean meiaPorcao = false;


    @JsonProperty("totalItem") // Aparecerá no seu JSON do Frontend
    public BigDecimal getTotalItem() {
        if (this.precoUnitario == null) return BigDecimal.ZERO;
        BigDecimal total = this.precoUnitario.multiply(new BigDecimal(this.quantidade));
        if (this.meiaPorcao) {
            return total.multiply(new BigDecimal("0.6"));
        }
        return total;
    }

    @JsonProperty("precoEfetivo") // Útil para mostrar o preço de 1 unidade de "meia"
    public BigDecimal getPrecoEfetivo() {
        if (this.precoUnitario == null) return BigDecimal.ZERO;
        return this.meiaPorcao ?
                this.precoUnitario.multiply(new BigDecimal("0.6")) :
                this.precoUnitario;
    }
}