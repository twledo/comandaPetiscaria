package dev.petiscaria.comandas.controller.comanda;

import dev.petiscaria.comandas.dto.pagamento.PagamentoItensDTO;
import dev.petiscaria.comandas.dto.pagamento.PagamentoParcialDTO;
import dev.petiscaria.comandas.models.comanda.Comanda;
import dev.petiscaria.comandas.models.comanda.ItemPedido;
import dev.petiscaria.comandas.service.comanda.ComandaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/comandas")
@RequiredArgsConstructor
public class ComandaController {

    private final ComandaService comandaService;

    private String getUsuarioLogado() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    // ─── Fluxo principal ────────────────────────────────────────────

    @PostMapping("/abrir/{mesaId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public ResponseEntity<Comanda> iniciarAtendimento(
            @PathVariable Long mesaId,
            @RequestParam("nomeCliente") String nomeCliente) {
        return ResponseEntity.ok(
                comandaService.iniciarAtendimento(mesaId, getUsuarioLogado(), nomeCliente));
    }

    @PostMapping("/{comandaId}/itens")
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public ResponseEntity<Comanda> registrarConsumo(
            @PathVariable Long comandaId,
            @RequestParam Long produtoId,
            @RequestBody ItemPedido item) {
        return ResponseEntity.ok(
                comandaService.registrarConsumo(comandaId, produtoId, item, getUsuarioLogado()));
    }

    @DeleteMapping("/{comandaId}/itens/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public ResponseEntity<Comanda> estornarItem(
            @PathVariable Long comandaId,
            @PathVariable Long itemId) {
        return ResponseEntity.ok(
                comandaService.estornarItem(comandaId, itemId, getUsuarioLogado()));
    }

    @PatchMapping("/{id}/fechar")
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public ResponseEntity<Comanda> solicitarFechamento(@PathVariable Long id) {
        return ResponseEntity.ok(
                comandaService.solicitarFechamento(id, getUsuarioLogado()));
    }

    @PatchMapping("/{id}/reabrir")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Comanda> reabrirComanda(@PathVariable Long id) {
        return ResponseEntity.ok(
                comandaService.reabrirAtendimento(id, getUsuarioLogado()));
    }

    // ─── Pagamento — por itens selecionados ─────────────────────────

    /**
     * POST /api/comandas/{id}/pagar-itens
     * Remove os itens da comanda e registra recebimento.
     * Body: { "itensIds": [1, 3], "metodoPagamento": "PIX" }
     */
    /**
     * POST /api/comandas/{id}/pagar-itens
     * Suporta quantidade parcial por item.
     * Body: { "itens": [{ "itemId": 1, "quantidadePagar": 1 }], "metodoPagamento": "PIX" }
     */
    @PostMapping("/{comandaId}/pagar-itens")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Comanda> pagarItens(
            @PathVariable Long comandaId,
            @RequestBody PagamentoItensDTO dto) {
        return ResponseEntity.ok(
                comandaService.pagarItensEspecificos(
                        comandaId, dto.itens(), dto.metodoPagamento(), getUsuarioLogado()));
    }

    // ─── Pagamento — divisão igualitária ou por valor livre ─────────

    /**
     * POST /api/comandas/{id}/dividir-conta
     *
     * Modalidade IGUALITARIO:
     * {
     *   "modalidade": "IGUALITARIO",
     *   "numeroPessoas": 3,
     *   "metodoPagamento": "PIX"
     * }
     *
     * Modalidade VALOR_LIVRE:
     * {
     *   "modalidade": "VALOR_LIVRE",
     *   "parcelas": [
     *     { "nomePessoa": "Ana",  "valor": 70.00 },
     *     { "nomePessoa": "João", "valor": 30.00 }
     *   ],
     *   "metodoPagamento": "CREDITO"
     * }
     */
    @PostMapping("/{id}/dividir-conta")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Comanda> dividirConta(
            @PathVariable Long id,
            @RequestBody PagamentoParcialDTO dto) {
        return ResponseEntity.ok(
                comandaService.registrarDivisaoConta(id, dto, getUsuarioLogado()));
    }

    // ─── Finalização integral (caixa) ────────────────────────────────

    @PostMapping("/{id}/recebimento")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> finalizarAtendimento(@PathVariable Long id) {
        comandaService.finalizarAtendimento(id, getUsuarioLogado());
        return ResponseEntity.ok().build();
    }
}