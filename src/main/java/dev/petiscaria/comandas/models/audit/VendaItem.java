package dev.petiscaria.comandas.models.audit;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "venda_itens")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendaItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long produtoId;
    private String nomeProduto;
    private Long quantidade;
    private BigDecimal precoVendido; // Preço unitário final com descontos/meia-porção
    private BigDecimal subtotal;
}