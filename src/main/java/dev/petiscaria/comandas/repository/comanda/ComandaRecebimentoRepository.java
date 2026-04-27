package dev.petiscaria.comandas.repository.comanda;

import dev.petiscaria.comandas.models.comanda.ComandaRecebimento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ComandaRecebimentoRepository extends JpaRepository<ComandaRecebimento, Long> {
}
