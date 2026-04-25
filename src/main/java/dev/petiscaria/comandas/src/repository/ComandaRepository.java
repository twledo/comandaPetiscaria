package dev.petiscaria.comandas.src.repository;

import dev.petiscaria.comandas.src.enuns.StatusComanda;
import dev.petiscaria.comandas.src.models.Comanda;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ComandaRepository extends JpaRepository<Comanda, Long> {
    Optional<Comanda>findByMesaIdAndStatus(Integer mesaId, StatusComanda status);
}

