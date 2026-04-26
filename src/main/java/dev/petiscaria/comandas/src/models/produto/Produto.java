package dev.petiscaria.comandas.src.models.produto;

import dev.petiscaria.comandas.src.enuns.CategoriaProduto;
import dev.petiscaria.comandas.src.enuns.UnidadeMedida;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "produtos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Produto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private BigDecimal preco;

    @Column(name = "categoria_id")
    private CategoriaProduto categoria;

    private String descricao;

    private boolean permiteMeia;

    @Builder.Default
    private Boolean disponivel = true;

    @Enumerated(EnumType.STRING)
    private UnidadeMedida unidadeMedida;
}