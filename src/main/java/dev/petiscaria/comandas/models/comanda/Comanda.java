package dev.petiscaria.comandas.models.comanda;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import dev.petiscaria.comandas.enuns.StatusComanda;
import dev.petiscaria.comandas.models.mesa.Mesa;
import dev.petiscaria.comandas.models.pedido.Pedido;
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
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comanda {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "mesa_id", nullable = false)
    @JsonIgnoreProperties({"comandaAtiva"}) // Simplifique para ignorar o que volta
    private Mesa mesa;

    private String nomeCliente;

    @Builder.Default
    private BigDecimal total = BigDecimal.ZERO;

    private String ultimoAtendente;

    // NOVO: A comanda agora guarda uma lista de PEDIDOS, e não de Itens soltos.
    @OneToMany(mappedBy = "comanda", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("comanda") // Para não repetir os dados da comanda dentro de cada pedido
    @Builder.Default
    private List<Pedido> pedidos = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private StatusComanda status = StatusComanda.ABERTA;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @JsonProperty("total") // Garante que o Jackson envie este cálculo para o Front
    public BigDecimal getTotal() {
        if (pedidos == null || pedidos.isEmpty()) {
            return BigDecimal.ZERO;
        }

        return pedidos.stream()
                // 🚀 O FILTRO CRÍTICO: Ignora pedidos CANCELADOS
                .filter(pedido -> pedido.getStatus() != dev.petiscaria.comandas.enuns.StatusPedido.CANCELADO)
                .map(pedido -> {
                    // Soma todos os itens dentro de cada pedido não cancelado
                    return pedido.getItens().stream()
                            .map(ItemPedido::getTotalItem)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}