package dev.petiscaria.comandas.repository.caixa;

import dev.petiscaria.comandas.enuns.caixa.StatusCaixa;
import dev.petiscaria.comandas.models.caixa.SessaoCaixa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessaoCaixaRepository extends JpaRepository<SessaoCaixa, Long> {

    Optional<SessaoCaixa> findByStatus(StatusCaixa status);

    List<SessaoCaixa> findAllByOrderByIdDesc();
}
