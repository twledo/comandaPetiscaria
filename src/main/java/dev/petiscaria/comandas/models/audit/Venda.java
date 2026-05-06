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

    // IDs originais para rastreabilidade técnica
    private Long mesaId;
    private Long comandaOriginalId;

    // --- Dados Denormalizados (Snapshot) ---
    // Importante: Guardamos o número e nome para que o relatório
    // permaneça íntegro mesmo se a mesa for excluída ou o cliente mudar de nome.
    private Long numeroMesa;
    private String nomeCliente;

    private BigDecimal totalVenda;

    // --- Controle Temporal ---
    private LocalDateTime dataAbertura; // Vindo da Comanda.createdAt

    @CreationTimestamp
    @Column(name = "data_fechamento")
    private LocalDateTime dataVenda;

    private String usuarioCaixa;

    // Relacionamento com itens consumidos
    // orphanRemoval = true garante que ao limpar a lista, os itens sejam deletados do banco
    @OneToMany(mappedBy = "venda", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VendaItem> itensConsumidos;
}