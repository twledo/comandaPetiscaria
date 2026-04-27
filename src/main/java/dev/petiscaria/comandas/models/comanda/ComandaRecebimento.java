package dev.petiscaria.comandas.models.comanda;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

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

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime dataRecebimento;

    @Column(nullable = false)
    private String usuario; // Nome ou ID do usuário que confirmou

    private String observacao;
}
