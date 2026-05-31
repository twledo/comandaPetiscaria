package dev.petiscaria.comandas.models.caixa;

import dev.petiscaria.comandas.enuns.caixa.StatusCaixa;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sessao_caixa")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessaoCaixa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime dataAbertura;

    private LocalDateTime dataFechamento;

    @Embedded
    private ContagemDinheiro contagemDinheiro;

    @Column(nullable = false)
    private BigDecimal saldoInicial;

    public void setSaldoInicial(BigDecimal saldoInicial) {
        this.saldoInicial = saldoInicial.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal saldoDinheiroFechamento;

    public void setSaldoDinheiroFechamento(BigDecimal saldoDinheiroFechamento) {
        if (saldoDinheiroFechamento != null) {
            this.saldoDinheiroFechamento = saldoDinheiroFechamento.setScale(2, RoundingMode.HALF_UP);
        } else {
            this.saldoDinheiroFechamento = null;
        }
    }

    @Column(nullable = false)
    private String usuarioAbertura;

    private String usuarioFechamento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StatusCaixa status = StatusCaixa.ABERTO;

    @Column(length = 255)
    private String observacoes;

    @OneToMany(mappedBy = "sessaoCaixa", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MovimentacaoCaixa> movimentacoes = new ArrayList<>();
}
