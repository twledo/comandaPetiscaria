package dev.petiscaria.comandas.service.mesa;

import dev.petiscaria.comandas.enuns.StatusMesa;
import dev.petiscaria.comandas.models.comanda.Comanda;
import dev.petiscaria.comandas.models.mesa.Mesa;
import dev.petiscaria.comandas.repository.comanda.ComandaRepository;
import dev.petiscaria.comandas.repository.mesa.MesaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MesaService {

    private final MesaRepository mesaRepository;
    private final ComandaRepository comandaRepository;

    @Transactional(readOnly = true)
    public List<Mesa> listarTodas() {
        // 1. Busca todas as mesas JÁ ORDENADAS por número
        List<Mesa> mesas = mesaRepository.findAllByOrderByNumeroAsc();

        log.info("Total de mesas encontradas no banco: {}", mesas.size());

        for (Mesa mesa : mesas) {
            // 2. Só buscamos se não estiver disponível
            if (mesa.getStatus() != StatusMesa.DISPONIVEL) {
                List<Comanda> comandas = comandaRepository.findByMesaIdAtiva(mesa.getId());

                if (!comandas.isEmpty()) {
                    // Se houver mais de uma, pegamos a primeira (ou a mais recente)
                    // Isso evita o erro de 'Unique Result' que deu tela branca
                    mesa.setComandaAtiva(comandas.get(0));

                    if (comandas.size() > 1) {
                        log.warn("Mesa {} possui {} comandas ativas! Verifique integridade do banco.",
                                mesa.getNumero(), comandas.size());
                    }
                }
            }
        }
        return mesas;
    }

    @Transactional(readOnly = true)
    public List<Mesa> listarMesasDisponiveis() {
        return mesaRepository.findByStatusOrderByNumeroAsc(StatusMesa.DISPONIVEL);
    }
}