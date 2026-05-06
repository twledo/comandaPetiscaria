package dev.petiscaria.comandas.models.comanda;

import dev.petiscaria.comandas.enuns.AcaoComanda;
import dev.petiscaria.comandas.enuns.MetodoPagamento;
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

    // O "Delta": Quanto essa ação específica movimentou? (Ex: 35.00 do pagamento ou do item)
    private BigDecimal valorOperacao;

    // Se for uma ação de ITEM (Adicionado/Removido), estruturamos aqui
    private Long produtoId;
    private String nomeProduto;
    private Integer quantidade;

    // Se for uma ação de PAGAMENTO, estruturamos aqui
    @Enumerated(EnumType.STRING)
    private MetodoPagamento metodoPagamento;
}
