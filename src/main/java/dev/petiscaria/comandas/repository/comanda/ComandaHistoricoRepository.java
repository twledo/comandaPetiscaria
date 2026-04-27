package dev.petiscaria.comandas.repository.comanda;

import dev.petiscaria.comandas.models.comanda.ComandaHistorico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ComandaHistoricoRepository extends JpaRepository<ComandaHistorico, Long> {
}
