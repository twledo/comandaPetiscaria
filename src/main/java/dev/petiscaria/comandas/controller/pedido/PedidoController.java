package dev.petiscaria.comandas.controller.pedido;

import dev.petiscaria.comandas.models.pedido.Pedido;
import dev.petiscaria.comandas.service.pedido.PedidoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pedidos")
@RequiredArgsConstructor
public class PedidoController {

    private final PedidoService pedidoService;

    private String getUsuarioLogado() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    // Este método agora é o protagonista da entrega
    @PatchMapping("/item/{itemId}/entregar")
    public ResponseEntity<Void> entregarItem(@PathVariable Long itemId) {
        pedidoService.entregarItem(itemId, getUsuarioLogado());
        return ResponseEntity.noContent().build();
    }

//    @PatchMapping("/{id}/cancelar")
//    public ResponseEntity<Void> cancelar(@PathVariable Long id) {
//        pedidoService.cancelarPedido(id);
//        return ResponseEntity.noContent().build();
//    }

    @GetMapping("/comanda/{comandaId}")
    public ResponseEntity<List<Pedido>> listarPorComanda(@PathVariable Long comandaId) {
        return ResponseEntity.ok(pedidoService.listarPorComanda(comandaId));
    }
}