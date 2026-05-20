package dev.petiscaria.comandas.repository.comanda;

import dev.petiscaria.comandas.enuns.StatusComanda;
import dev.petiscaria.comandas.models.comanda.Comanda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ComandaRepository extends JpaRepository<Comanda, Long> {

    @Query("SELECT c FROM Comanda c WHERE c.mesa.id = :mesaId AND c.status IN ('ABERTA', 'AGUARDANDO_PAGAMENTO')")
    List<Comanda> findByMesaIdAtiva(@Param("mesaId") Long mesaId);

    boolean existsByMesaIdAndStatus(Long mesaId, StatusComanda status);

    @Query("SELECT COALESCE(SUM(i.precoUnitario * i.quantidade), 0) FROM ItemPedido i " +
            "WHERE i.pedido.comanda.id = :comandaId " +
            "AND i.pedido.status <> dev.petiscaria.comandas.enuns.StatusPedido.CANCELADO")
    BigDecimal calcularTotalSemCancelados(@Param("comandaId") Long comandaId);
}
