package dev.petiscaria.comandas.src.controller;

import dev.petiscaria.comandas.src.enuns.StatusComanda;
import dev.petiscaria.comandas.src.models.comanda.Comanda;
import dev.petiscaria.comandas.src.models.comanda.ItemPedido;
import dev.petiscaria.comandas.src.service.comanda.ComandaService;
import dev.petiscaria.comandas.src.repository.comanda.ComandaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comandas")
@RequiredArgsConstructor
public class ComandaController {

    private final ComandaService service;
    private final ComandaRepository repository;

    @PostMapping("/abrir/{mesaId}")
    public Comanda abrir(@PathVariable Integer mesaId) {
        return service.abrirComanda(mesaId);
    }

    // Corrigido: Apenas UM @RequestBody. O produtoId vem via URL (Query Param)
    @PostMapping("/{comandaId}/itens")
    public Comanda adicionarItem(
            @PathVariable Long comandaId,
            @RequestParam Long produtoId,
            @RequestBody ItemPedido item) {
        return service.adicionarItem(comandaId, produtoId, item);
    }

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

    @PutMapping("/{id}/enviar")
    public void enviarParaCozinha(@PathVariable Long id) {
        service.enviarParaCozinha(id);
    }
}