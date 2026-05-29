package dev.petiscaria.comandas.models.audit;

import dev.petiscaria.comandas.enuns.CategoriaProduto;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venda_id")
    private Venda venda;

    private Long produtoId;

    // Salvar o nome evita que o relatório fique vazio se o produto for excluído
    private String nomeProduto;

    // No seu VendaItem.java
    @Enumerated(EnumType.STRING) // Ou apenas String se preferir desnormalizar
    private CategoriaProduto categoria;

    private Long quantidade;

    // O preço real do cadastro no momento da venda
    private BigDecimal precoTabela;

    // O preço que saiu para o cliente (ex: se era 20.00 e foi meia-porção, aqui fica 12.00)
    private BigDecimal precoVendido;

    private BigDecimal subtotal;

    public void setPrecoTabela(BigDecimal precoTabela) {
        this.precoTabela = precoTabela.setScale(2, RoundingMode.HALF_UP);
    }

    public void setPrecoVendido(BigDecimal precoVendido) {
        this.precoVendido = precoVendido.setScale(2, RoundingMode.HALF_UP);
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal.setScale(2, RoundingMode.HALF_UP);
    }

    // Gravar se foi meia porção ajuda a entender o comportamento de consumo
    private boolean meiaPorcao;
}