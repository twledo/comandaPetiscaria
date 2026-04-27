package dev.petiscaria.comandas.service.produto;

import dev.petiscaria.comandas.enuns.CategoriaProduto;
import dev.petiscaria.comandas.models.produto.Produto;
import dev.petiscaria.comandas.repository.produto.ProdutoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProdutoService {

    private final ProdutoRepository produtoRepository;

    @Transactional
    public Produto cadastrar(Produto produto) {
        // Regra simples: Todo produto novo já entra disponível por padrão
        if (produto.getDisponivel() == null) {
            produto.setDisponivel(true);
        }
        return produtoRepository.save(produto);
    }

    @Transactional
    public Produto atualizar(Long id, Produto novosDados) {
        Produto produto = produtoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produto não encontrado"));

        produto.setNome(novosDados.getNome());
        produto.setPreco(novosDados.getPreco());
        produto.setCategoria(novosDados.getCategoria());
        produto.setDescricao(novosDados.getDescricao());
        produto.setPermiteMeia(novosDados.isPermiteMeia());
        produto.setUnidadeMedida(novosDados.getUnidadeMedida());

        return produtoRepository.save(produto);
    }

    // --- PARA O GARÇOM (TABLET/CELULAR) ---
    public Page<Produto> buscarCardapio(String nome, CategoriaProduto categoria, Pageable pageable) {
        boolean hasNome = StringUtils.hasText(nome);
        boolean hasCategoria = categoria != null;

        if (hasNome && hasCategoria) {
            return produtoRepository.findByDisponivelTrueAndNomeContainingIgnoreCaseAndCategoria(nome, categoria, pageable);
        } else if (hasNome) {
            return produtoRepository.findByDisponivelTrueAndNomeContainingIgnoreCase(nome, pageable);
        } else if (hasCategoria) {
            return produtoRepository.findByDisponivelTrueAndCategoria(categoria, pageable);
        } else {
            return produtoRepository.findByDisponivelTrue(pageable);
        }
    }

    // --- PARA O ADMIN (GERENCIAMENTO) ---
    public List<Produto> listarTodos() {
        return produtoRepository.findAll();
    }

    @Transactional
    public Produto alternarDisponibilidade(Long id) {
        Produto produto = produtoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produto não encontrado"));

        // Se estava true vira false, se estava false vira true (Acabou no estoque / Voltou)
        produto.setDisponivel(!produto.getDisponivel());
        return produtoRepository.save(produto);
    }
}
