package dev.petiscaria.comandas.repository.mesa;

import dev.petiscaria.comandas.enuns.StatusMesa;
import dev.petiscaria.comandas.models.mesa.Mesa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MesaRepository extends JpaRepository<Mesa, Long> {
    List<Mesa> findAllByOrderByNumeroAsc();

    List<Mesa> findByStatusOrderByNumeroAsc(StatusMesa status);
}