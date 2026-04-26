package dev.petiscaria.comandas.src.controller;

import dev.petiscaria.comandas.src.models.comanda.Comanda;
import dev.petiscaria.comandas.src.models.comanda.ItemPedido;
import dev.petiscaria.comandas.src.service.comanda.ComandaService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comandas")
@RequiredArgsConstructor
public class ComandaController {

    private final ComandaService service;

    @PostMapping("/abrir/{mesaId}")
    public Comanda abrir(@PathVariable Integer mesaId) {
        return service.abrirComanda(mesaId);
    }

    @PostMapping("/{comandaId}/itens")
    public Comanda adicionarItem(
            @PathVariable Long comandaId,
            @RequestParam Long produtoId,
            @RequestBody ItemPedido item) {
        return service.adicionarItem(comandaId, produtoId, item);
    }

    @GetMapping("/ativas")
    public List<Comanda> listarAbertas() {
        return service.listarAbertas();
    }

    @GetMapping("/{id}")
    public Comanda buscarDetalhes(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    @PatchMapping("/{id}/fechar")
    public Comanda fechar(@PathVariable Long id) {
        return service.fecharComanda(id);
    }

    @PutMapping("/{id}/enviar")
    public void enviarParaCozinha(@PathVariable Long id) {
        service.enviarParaCozinha(id);
    }

    @PatchMapping("/{comandaId}/itens/{itemId}")
    public Comanda editarItem(
            @PathVariable Long comandaId,
            @PathVariable Long itemId,
            @RequestParam Integer quantidade) {
        return service.editarItem(comandaId, itemId, quantidade);
    }

    @DeleteMapping("/{comandaId}/itens/{itemId}")
    public Comanda removerItem(
            @PathVariable Long comandaId,
            @PathVariable Long itemId) {
        return service.removerItem(comandaId, itemId);
    }
}
