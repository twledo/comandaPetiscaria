package dev.petiscaria.comandas.controller.comanda;

import dev.petiscaria.comandas.dto.pagamento.PagamentoItensDTO;
import dev.petiscaria.comandas.models.comanda.Comanda;
import dev.petiscaria.comandas.models.comanda.ItemPedido;
import dev.petiscaria.comandas.service.comanda.ComandaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comandas")
@RequiredArgsConstructor
public class ComandaController {

    private final ComandaService comandaService;

    /**
     * Extrai o username do Token JWT para auditoria.
     */
    private String getUsuarioLogado() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @PostMapping("/abrir/{mesaId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public ResponseEntity<Comanda> iniciarAtendimento(
            @PathVariable Long mesaId,
            @RequestParam("nomeCliente") String nomeCliente
    ) {
        return ResponseEntity.ok(comandaService.iniciarAtendimento(mesaId, getUsuarioLogado(), nomeCliente));
    }

    @PostMapping("/{comandaId}/itens")
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public ResponseEntity<Comanda> registrarConsumo(
            @PathVariable Long comandaId,
            @RequestParam Long produtoId,
            @RequestBody ItemPedido item) {
        return ResponseEntity.ok(comandaService.registrarConsumo(comandaId, produtoId, item, getUsuarioLogado()));
    }

    @DeleteMapping("/{comandaId}/itens/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public ResponseEntity<Comanda> estornarItem(@PathVariable Long comandaId, @PathVariable Long itemId) {
        return ResponseEntity.ok(comandaService.estornarItem(comandaId, itemId, getUsuarioLogado()));
    }

    @PatchMapping("/{id}/fechar")
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public ResponseEntity<Comanda> solicitarFechamento(@PathVariable Long id) {
        return ResponseEntity.ok(comandaService.solicitarFechamento(id, getUsuarioLogado()));
    }

    @PatchMapping("/{id}/reabrir")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Comanda> reabrirComanda(@PathVariable Long id) {
        return ResponseEntity.ok(comandaService.reabrirAtendimento(id, getUsuarioLogado()));
    }

    @PostMapping("/{comandaId}/pagar-itens")
    @PreAuthorize("hasRole('ADMIN')")
    public Comanda pagarItens(
            @PathVariable Long comandaId,
            @RequestBody PagamentoItensDTO dto
    ) {
        return comandaService.pagarItensEspecificos(comandaId, dto.itensIds(), dto.metodoPagamento());
    }

    @PostMapping("/{id}/recebimento")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> finalizarAtendimento(@PathVariable Long id) {
        comandaService.finalizarAtendimento(id, getUsuarioLogado());
        return ResponseEntity.ok().build();
    }
}