package dev.petiscaria.comandas.models.comanda;

import dev.petiscaria.comandas.enuns.AcaoComanda;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "comanda_historico")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
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

    // NOVO: Auditoria de autoria
    private String usuario;

    // NOVO: Valor da comanda no exato momento da ação
    private BigDecimal valorMomento;
}
