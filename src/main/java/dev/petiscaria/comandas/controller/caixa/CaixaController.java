package dev.petiscaria.comandas.controller.caixa;

import dev.petiscaria.comandas.dto.caixa.FechamentoCaixaDTO;
import dev.petiscaria.comandas.enuns.caixa.TipoMovimentacaoCaixa;
import dev.petiscaria.comandas.models.caixa.MovimentacaoCaixa;
import dev.petiscaria.comandas.models.caixa.SessaoCaixa;
import dev.petiscaria.comandas.service.caixa.CaixaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/caixa")
@RequiredArgsConstructor
public class CaixaController {
    private final CaixaService caixaService;

    private String getUsuarioLogado() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @PostMapping("/abrir")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SessaoCaixa> abrirCaixa(@RequestBody FechamentoCaixaDTO dto) {
        return ResponseEntity.ok(caixaService.abrirCaixa(dto, getUsuarioLogado()));
    }

    @PostMapping("/fechar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SessaoCaixa> fecharCaixa(@RequestBody FechamentoCaixaDTO dto) {
        return ResponseEntity.ok(caixaService.fecharCaixa(dto, getUsuarioLogado()));
    }

    @PostMapping("/movimentar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MovimentacaoCaixa> registrarMovimentacao(
            @RequestParam TipoMovimentacaoCaixa tipo,
            @RequestParam BigDecimal valor,
            @RequestParam String motivo) {
        return ResponseEntity.ok(caixaService.registrarMovimentacao(tipo, valor, motivo, getUsuarioLogado()));
    }

    @GetMapping("/ativo")
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public ResponseEntity<SessaoCaixa> buscarCaixaAtivo() {
        return caixaService.buscarCaixaAtivo()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/relatorio/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> gerarRelatorioTurno(@PathVariable Long id) {
        return ResponseEntity.ok(caixaService.gerarRelatorioTurno(id));
    }

    @GetMapping("/historico")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SessaoCaixa>> listarHistorico() {
        return ResponseEntity.ok(caixaService.listarHistorico());
    }
}