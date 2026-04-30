package dev.petiscaria.comandas.repository.comanda;

import dev.petiscaria.comandas.enuns.StatusMesa;
import dev.petiscaria.comandas.models.comanda.Comanda;
import dev.petiscaria.comandas.models.mesa.Mesa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComandaRepository extends JpaRepository<Comanda, Long> {
    @Query("SELECT c FROM Comanda c WHERE c.mesa = :mesa AND c.mesa.status != 'DISPONIVEL'")
    Optional<Comanda> findByMesaAndStatusAtivo(@Param("mesa") Mesa mesa);

    @Query("SELECT c FROM Comanda c WHERE c.mesa.id = :mesaId AND c.mesa.status != 'DISPONIVEL'")
    Optional<Comanda> findByMesaIdAtiva(@Param("mesaId") Long mesaId);
}