package dev.petiscaria.comandas.controller.produto;

import dev.petiscaria.comandas.enuns.CategoriaProduto;
import dev.petiscaria.comandas.models.produto.Produto;
import dev.petiscaria.comandas.service.produto.ProdutoService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/produtos")
@RequiredArgsConstructor
public class ProdutoController {

    private final ProdutoService service;

    // --- ROTAS DO ADMIN ---
    @PostMapping("/cadastrar")
    public Produto cadastrarProduto(@RequestBody Produto produto) {
        return service.cadastrar(produto);
    }

    @PutMapping("/{id}")
    public Produto atualizar(@PathVariable Long id, @RequestBody Produto dadosAtualizados) {
        return service.atualizar(id, dadosAtualizados);
    }

    @GetMapping("/todos")
    public List<Produto> listarTodos() {
        return service.listarTodos();
    }

    @PatchMapping("/{id}/estoque")
    public Produto alternarEstoque(@PathVariable Long id) {
        return service.alternarDisponibilidade(id);
    }

    // ProdutoController.java
    @GetMapping("/cardapio/filtro")
    public Page<Produto> filtrar(
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) Integer categoria, // Receba como Integer
            Pageable pageable
    ) {
        // Converte usando seu método fromId
        CategoriaProduto categoriaEnum = (categoria != null) ? CategoriaProduto.fromId(categoria) : null;
        return service.buscarCardapio(nome, categoriaEnum, pageable);
    }
}