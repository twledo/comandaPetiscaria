package dev.petiscaria.comandas.models.comanda;

import dev.petiscaria.comandas.enuns.MetodoPagamento;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Entity
@Table(name = "comanda_recebimentos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComandaRecebimento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comanda_id", nullable = false)
    private Comanda comanda;

    private BigDecimal valorEntregue; // O que o cliente deu
    private BigDecimal valorTroco; // O troco calculado (valorEntregue - valor)

    public void setValor(BigDecimal valor) {
        this.valor = valor.setScale(2, RoundingMode.HALF_UP);
        calcularTroco();
    }

    public void setValorEntregue(BigDecimal valorEntregue) {
        this.valorEntregue = valorEntregue.setScale(2, RoundingMode.HALF_UP);
        calcularTroco();
    }

    private void calcularTroco() {
        if (this.valor != null && this.valorEntregue != null) {
            BigDecimal troco = this.valorEntregue.subtract(this.valor);
            this.valorTroco = troco.compareTo(BigDecimal.ZERO) > 0 ? troco.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        }
    }

    private BigDecimal valor;

    @Enumerated(EnumType.STRING)
    private MetodoPagamento metodoPagamento;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime dataRecebimento;

    @Column(nullable = false)
    private String usuario;

    private String observacao;
}
