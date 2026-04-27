package dev.petiscaria.comandas.models.comanda;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import dev.petiscaria.comandas.enuns.StatusComanda;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "comandas")
@Data // ESSENCIAL: Cria Getters, Setters, Equals e HashCode
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comanda {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer mesaId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private StatusComanda status = StatusComanda.DISPONIVEL;

    @Builder.Default
    private BigDecimal total = BigDecimal.ZERO;

    @OneToMany(mappedBy = "comanda", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    @JsonManagedReference // Adicione isso para permitir que a comanda mostre seus itens
    private List<ItemPedido> itens = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}