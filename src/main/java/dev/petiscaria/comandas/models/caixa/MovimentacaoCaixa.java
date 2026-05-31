package dev.petiscaria.comandas.models.caixa;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import dev.petiscaria.comandas.enuns.caixa.TipoMovimentacaoCaixa;
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
@Table(name = "movimentacao_caixa")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovimentacaoCaixa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sessao_caixa_id", nullable = false)
    @JsonIgnoreProperties("movimentacoes")
    private SessaoCaixa sessaoCaixa;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoMovimentacaoCaixa tipo;

    @Column(nullable = false)
    private BigDecimal valor;

    public void setValor(BigDecimal valor) {
        this.valor = valor.setScale(2, RoundingMode.HALF_UP);
    }

    @Column(nullable = false)
    private String motivo;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private String usuario;
}
