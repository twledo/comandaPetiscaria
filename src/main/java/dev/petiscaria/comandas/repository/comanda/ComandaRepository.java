package dev.petiscaria.comandas.repository.comanda;

import dev.petiscaria.comandas.enuns.StatusComanda;
import dev.petiscaria.comandas.models.comanda.Comanda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComandaRepository extends JpaRepository<Comanda, Long> {

    // Este nome de método força o Spring a gerar "ORDER BY id ASC"
    List<Comanda> findAllByOrderByIdAsc();

    // Se você usa o findByStatus, também adicione a ordenação
    List<Comanda> findByStatusOrderByIdAsc(StatusComanda status);

    Optional<Comanda> findByMesaId(Long mesaId);
}