package dev.petiscaria.comandas.repository.caixa;

import dev.petiscaria.comandas.enuns.caixa.StatusCaixa;
import dev.petiscaria.comandas.models.caixa.SessaoCaixa;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SessaoCaixaRepository extends JpaRepository<SessaoCaixa, Long> {

    Optional<SessaoCaixa> findByStatus(StatusCaixa status);

    @Query("SELECT s FROM SessaoCaixa s WHERE s.dataAbertura >= :inicio AND s.dataAbertura < :fim ORDER BY s.id DESC")
    Page<SessaoCaixa> findByDataAberturaBetween(
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim,
            Pageable pageable);

    Page<SessaoCaixa> findAllByOrderByIdDesc(Pageable pageable);
}
