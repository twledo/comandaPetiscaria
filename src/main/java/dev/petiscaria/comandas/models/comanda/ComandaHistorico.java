package dev.petiscaria.comandas.models.comanda;

import dev.petiscaria.comandas.enuns.AcaoComanda;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

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
    @JoinColumn(name = "comanda_id", nullable = false)
    private Comanda comanda;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AcaoComanda acao;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime dataEvento;

    private String detalhes; // Ex: "Item: Coca-Cola (2x)"
}
