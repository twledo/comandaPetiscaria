package dev.petiscaria.comandas.src.controller;

import dev.petiscaria.comandas.src.enuns.StatusComanda;
import dev.petiscaria.comandas.src.models.Comanda;
import dev.petiscaria.comandas.src.models.ItemPedido;
import dev.petiscaria.comandas.src.repository.ComandaRepository;
import dev.petiscaria.comandas.src.service.ComandaService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comandas")
@RequiredArgsConstructor
public class ComandaController {

    private final ComandaService service;
    private final ComandaRepository repository;

    // --- PERFIL GARÇOM ---

    @PostMapping("/abrir/{mesaId}")
    public Comanda abrir(@PathVariable Integer mesaId) {
        return service.abrirComanda(mesaId);
    }

    @PostMapping("/{id}/itens")
    public Comanda adicionarItem(@PathVariable Long id, @RequestBody ItemPedido item) {
        return service.adicionarItem(id, item);
    }

    // --- PERFIL ADMIN / COBRANÇA ---

    @GetMapping("/ativas")
    public List<Comanda> listarAbertas() {
        return repository.findAll().stream()
                .filter(c -> c.getStatus() == StatusComanda.ABERTA)
                .toList();
    }

    @GetMapping("/{id}")
    public Comanda buscarDetalhes(@PathVariable Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Comanda não encontrada"));
    }

    @PatchMapping("/{id}/fechar")
    public Comanda fechar(@PathVariable Long id) {
        return service.fecharComanda(id);
    }
}