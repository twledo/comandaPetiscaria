package dev.petiscaria.comandas.controller.comanda;

import dev.petiscaria.comandas.models.comanda.Comanda;
import dev.petiscaria.comandas.models.comanda.ItemPedido;
import dev.petiscaria.comandas.service.comanda.ComandaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comandas")
@RequiredArgsConstructor
public class ComandaController {

    private final ComandaService comandaService;

    @GetMapping("/ativas")
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public ResponseEntity<?> listarComandasAtivas() {
        try {
            List<Comanda> comandas = comandaService.listarComandasAtivas();

            if (comandas.isEmpty()) {
                return ResponseEntity.noContent().build(); // 204
            }

            return ResponseEntity.ok(comandas); // 200
        } catch (Exception e) {
            // Retorna o erro em formato JSON para o Front-end ler
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/abrir/{mesaId}")
    public Comanda abrir(@PathVariable Long mesaId) {
        return comandaService.abrirComanda(mesaId);
    }

    @PostMapping("/{comandaId}/itens")
    public Comanda adicionarItem(
            @PathVariable Long comandaId,
            @RequestParam Long produtoId,
            @RequestBody ItemPedido item) {
        return comandaService.adicionarItem(comandaId, produtoId, item);
    }

    @DeleteMapping("/{comandaId}/itens/{itemId}")
    public Comanda removerItem(@PathVariable Long comandaId, @PathVariable Long itemId) {
        return comandaService.removerItem(comandaId, itemId);
    }

    @PatchMapping("/{id}/fechar")
    public Comanda fechar(@PathVariable Long id) {
        return comandaService.fecharComanda(id);
    }

    @PostMapping("/{id}/recebimento")
    public ResponseEntity<Void> confirmarRecebimento(@PathVariable Long id) {
        // Em um cenário real, o nome do usuário viria de um token JWT (SecurityContextHolder)
        String usuarioLogado = "Caixa";
        comandaService.confirmarRecebimento(id, usuarioLogado);
        return ResponseEntity.ok().build();
    }
}