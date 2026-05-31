package dev.petiscaria.comandas.repository.comanda;

import dev.petiscaria.comandas.models.comanda.ComandaRecebimento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ComandaRecebimentoRepository extends JpaRepository<ComandaRecebimento, Long> {

    List<ComandaRecebimento> findByComandaId(Long comandaId);

    @Query("SELECT COALESCE(SUM(r.valor), 0) FROM ComandaRecebimento r WHERE r.comanda.id = :comandaId")
    BigDecimal somarRecebimentosPorComanda(@Param("comandaId") Long comandaId);

    List<ComandaRecebimento> findByDataRecebimentoBetween(LocalDateTime start, LocalDateTime end);
}