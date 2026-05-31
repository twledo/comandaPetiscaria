package dev.petiscaria.comandas.repository.caixa;

import dev.petiscaria.comandas.models.caixa.MovimentacaoCaixa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovimentacaoCaixaRepository extends JpaRepository<MovimentacaoCaixa, Long> {

    List<MovimentacaoCaixa> findBySessaoCaixaIdOrderByTimestampDesc(Long sessaoCaixaId);
}
