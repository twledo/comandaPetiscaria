package dev.petiscaria.comandas.repository.comanda;

import dev.petiscaria.comandas.enuns.StatusItemPedido;
import dev.petiscaria.comandas.models.comanda.ItemPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItemPedidoRepository extends JpaRepository<ItemPedido, Long> {
    Long countByPedidoIdAndStatus(Long pedidoId, StatusItemPedido status);
}
