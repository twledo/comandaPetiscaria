package dev.petiscaria.comandas.models.audit;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "vendas")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Venda {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long mesaId;
    private Long comandaOriginalId;

    private BigDecimal totalVenda;

    @CreationTimestamp
    private LocalDateTime dataVenda;

    private String usuarioCaixa;

    // Relacionamento com os itens que foram consumidos
    @OneToMany(cascade = CascadeType.ALL)
    @JoinColumn(name = "venda_id")
    private List<VendaItem> itensConsumidos;
}