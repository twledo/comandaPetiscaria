package dev.petiscaria.comandas.src.service;

import dev.petiscaria.comandas.src.enuns.StatusComanda;
import dev.petiscaria.comandas.src.models.Comanda;
import dev.petiscaria.comandas.src.models.ItemPedido;
import dev.petiscaria.comandas.src.repository.ComandaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class ComandaService {
    private final ComandaRepository repository;

    @Transactional
    public Comanda abrirComanda(Integer mesaId) {
        // Regra: Uma mesa só pode ter uma comanda ABERTA
        repository.findByMesaIdAndStatus(mesaId, StatusComanda.ABERTA)
                .ifPresent(c -> { throw new RuntimeException("Mesa já ocupada!"); });

        Comanda nova = new Comanda();
        nova.setMesaId(mesaId);
        return repository.save(nova);
    }

    @Transactional
    public Comanda adicionarItem(Long comandaId, ItemPedido item) {
        Comanda comanda = repository.findById(comandaId)
                .orElseThrow(() -> new RuntimeException("Comanda não encontrada"));

        if (comanda.getStatus() == StatusComanda.FECHADA) {
            throw new RuntimeException("Não é possível adicionar itens a uma comanda fechada");
        }

        item.setComanda(comanda);
        comanda.getItens().add(item);

        // Atualiza o total automaticamente
        BigDecimal valorItem = item.getPrecoUnitario().multiply(BigDecimal.valueOf(item.getQuantidade()));
        comanda.setTotal(comanda.getTotal().add(valorItem));

        return repository.save(comanda);
    }

    @Transactional
    public Comanda fecharComanda(Long comandaId) {
        Comanda comanda = repository.findById(comandaId).get();
        comanda.setStatus(StatusComanda.FECHADA);
        return repository.save(comanda);
    }
}