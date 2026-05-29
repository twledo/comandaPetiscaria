package dev.petiscaria.comandas.models.comanda;

import dev.petiscaria.comandas.enuns.AcaoComanda;
import dev.petiscaria.comandas.enuns.MetodoPagamento;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Entity
@Table(name = "comanda_historico")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "comanda")
public class ComandaHistorico {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comanda_id")
    private Comanda comanda;

    @Enumerated(EnumType.STRING)
    private AcaoComanda acao;

    @CreationTimestamp
    private LocalDateTime dataEvento;

    private String detalhes;

    private String usuario;

    private String numeroPedido;

    private Long numeroMesa;

    private BigDecimal valorMomento;

    private BigDecimal valorOperacao;

    public void setValorMomento(BigDecimal valorMomento) {
        this.valorMomento = valorMomento.setScale(2, RoundingMode.HALF_UP);
    }

    public void setValorOperacao(BigDecimal valorOperacao) {
        this.valorOperacao = valorOperacao.setScale(2, RoundingMode.HALF_UP);
    }

    private Long produtoId;
    private String nomeProduto;
    private Integer quantidade;

    @Enumerated(EnumType.STRING)
    private MetodoPagamento metodoPagamento;
}