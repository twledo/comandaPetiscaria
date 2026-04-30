package dev.petiscaria.comandas.repository.audit;

import dev.petiscaria.comandas.models.audit.Venda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VendaRepository extends JpaRepository<Venda, Long> {
}
