package dev.petiscaria.comandas.src.service.produto;

import dev.petiscaria.comandas.src.models.produto.Produto;
import dev.petiscaria.comandas.src.repository.produto.ProdutoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public Page<Produto> listarCardapioAtivo(Pageable pageable) {
        // O garçom só pode ver o que está disponível
        return produtoRepository.findByDisponivelTrue(pageable);
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