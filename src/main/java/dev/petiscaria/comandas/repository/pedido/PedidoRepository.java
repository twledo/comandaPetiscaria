package dev.petiscaria.comandas.repository.pedido;

import dev.petiscaria.comandas.enuns.StatusPedido;
import dev.petiscaria.comandas.models.pedido.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    List<Pedido> findByComandaIdOrderByCreatedAtDesc(Long comandaId);
}
