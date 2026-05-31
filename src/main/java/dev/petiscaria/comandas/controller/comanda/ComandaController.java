package dev.petiscaria.comandas.controller.comanda;

import dev.petiscaria.comandas.dto.itens.LancamentoLoteDTO;
import dev.petiscaria.comandas.dto.pagamento.PagamentoItensDTO;
import dev.petiscaria.comandas.dto.pagamento.PagamentoParcialDTO;
import dev.petiscaria.comandas.enuns.MetodoPagamento;
import dev.petiscaria.comandas.models.comanda.Comanda;
import dev.petiscaria.comandas.service.comanda.ComandaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
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

    @PostMapping("/{comandaId}/lancar-itens")
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public ResponseEntity<Comanda> lancarItensLote(
            @PathVariable Long comandaId,
            @RequestBody LancamentoLoteDTO lote) {
        return ResponseEntity.ok(
                comandaService.registrarConsumoEmLote(comandaId, lote, getUsuarioLogado()));
    }

    @DeleteMapping("/{comandaId}/itens/{itemId}")
    public ResponseEntity<Comanda> estornarItem(
            @PathVariable Long comandaId,
            @PathVariable Long itemId,
            @RequestParam String motivo) {

        Comanda comanda = comandaService.estornarItem(comandaId, itemId, motivo, getUsuarioLogado());
        return ResponseEntity.ok(comanda);
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
     * Suporta quantidade parcial por item e métodos de pagamento independentes.
     * Body:
     * {
     * "itens": [
     * { "itemId": 1, "quantidadePagar": 1, "metodoPagamento": "PIX" },
     * { "itemId": 2, "quantidadePagar": 2, "metodoPagamento": "DEBITO" }
     * ]
     * }
     */
    @PostMapping("/{comandaId}/pagar-itens")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Comanda> pagarItens(
            @PathVariable Long comandaId,
            @RequestBody PagamentoItensDTO dto) {
        return ResponseEntity.ok(
                comandaService.pagarItensEspecificos(
                        comandaId, dto.itens(), getUsuarioLogado()));
    }

    // ─── Pagamento — divisão igualitária ou por valor livre ─────────

    /**
     * POST /api/comandas/{id}/dividir-conta
     *
     * Modalidade IGUALITARIO (Agora envia a lista de parcelas para processar os métodos atômicos):
     * {
     * "modalidade": "IGUALITARIO",
     * "numeroPessoas": 2,
     * "parcelas": [
     * { "nomePessoa": "Pessoa 1", "valor": 50.00, "metodoPagamento": "PIX" },
     * { "nomePessoa": "Pessoa 2", "valor": 50.00, "metodoPagamento": "CREDITO" }
     * ]
     * }
     *
     * Modalidade VALOR_LIVRE:
     * {
     * "modalidade": "VALOR_LIVRE",
     * "parcelas": [
     * { "nomePessoa": "Ana",  "valor": 70.00, "metodoPagamento": "DINHEIRO" },
     * { "nomePessoa": "João", "valor": 30.00, "metodoPagamento": "PIX" }
     * ]
     * }
     */
    @PostMapping("/{id}/dividir-conta")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Comanda> dividirConta(
            @PathVariable Long id,
            @Validated @RequestBody PagamentoParcialDTO dto) {
        return ResponseEntity.ok(
                comandaService.registrarDivisaoConta(id, dto, getUsuarioLogado()));
    }

    // ─── Finalização integral (caixa) ────────────────────────────────

    @PostMapping("/{id}/recebimento")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> finalizarAtendimento(
            @PathVariable Long id,
            @RequestParam MetodoPagamento metodoPagamento) {
        comandaService.finalizarAtendimento(id, getUsuarioLogado(), metodoPagamento);
        return ResponseEntity.ok().build();
    }
}