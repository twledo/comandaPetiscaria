package dev.petiscaria.comandas.repository.produto;

import dev.petiscaria.comandas.enuns.CategoriaProduto;
import dev.petiscaria.comandas.models.produto.Produto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProdutoRepository extends JpaRepository<Produto, Long> {
    Page<Produto> findByDisponivelTrue(Pageable pageable);

    Page<Produto> findByNomeContainingIgnoreCase(String nome, Pageable pageable);

    Page<Produto> findByDisponivelTrueAndNomeContainingIgnoreCaseAndCategoria(String nome, CategoriaProduto categoria, Pageable pageable);

    Page<Produto> findByDisponivelTrueAndCategoria(CategoriaProduto categoria, Pageable pageable);

    Page<Produto> findByDisponivelTrueAndNomeContainingIgnoreCase(String nome, Pageable pageable);
}
