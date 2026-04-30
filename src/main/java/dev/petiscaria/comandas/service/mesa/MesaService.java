package dev.petiscaria.comandas.service.mesa;

import dev.petiscaria.comandas.enuns.StatusMesa;
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

    @Transactional
    public List<Mesa> listarTodas() {
        // 1. Busca ABSOLUTAMENTE TODAS as mesas do banco
        List<Mesa> mesas = mesaRepository.findAll();

        log.info("Total de mesas encontradas no banco: {}", mesas.size());

        for (Mesa mesa : mesas) {
            // 2. Só tentamos buscar comanda se a mesa NÃO estiver disponível
            // mas a mesa CONTINUA na lista mesmo se estiver disponível
            if (mesa.getStatus() != StatusMesa.DISPONIVEL) {
                comandaRepository.findByMesaIdAtiva(mesa.getId())
                        .ifPresent(mesa::setComandaAtiva);
            }
        }
        return mesas;
    }

    @Transactional(readOnly = true)
    public List<Mesa> listarMesasDisponiveis() {
        return mesaRepository.findByStatus(StatusMesa.DISPONIVEL);
    }
}