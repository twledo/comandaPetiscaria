package dev.petiscaria.comandas.src.repository.comanda;

import dev.petiscaria.comandas.src.enuns.StatusComanda;
import dev.petiscaria.comandas.src.models.comanda.Comanda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComandaRepository extends JpaRepository<Comanda, Long> {
    Optional<Comanda> findByMesaIdAndStatus(Integer mesaId, StatusComanda status);
    List<Comanda> findByStatus(StatusComanda status);
}

