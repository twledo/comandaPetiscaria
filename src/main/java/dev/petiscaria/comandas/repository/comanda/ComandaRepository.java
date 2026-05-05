package dev.petiscaria.comandas.repository.comanda;

import dev.petiscaria.comandas.enuns.StatusComanda;
import dev.petiscaria.comandas.models.comanda.Comanda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComandaRepository extends JpaRepository<Comanda, Long> {

    @Query("SELECT c FROM Comanda c WHERE c.mesa.id = :mesaId AND c.status IN ('ABERTA', 'AGUARDANDO_PAGAMENTO')")
    List<Comanda> findByMesaIdAtiva(@Param("mesaId") Long mesaId);

    boolean existsByMesaIdAndStatus(Long mesaId, StatusComanda status);
}
