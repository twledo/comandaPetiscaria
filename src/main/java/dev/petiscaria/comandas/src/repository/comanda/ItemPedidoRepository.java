package dev.petiscaria.comandas.src.repository.comanda;

import dev.petiscaria.comandas.src.models.comanda.ItemPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItemPedidoRepository extends JpaRepository <ItemPedido, Long>{
}
