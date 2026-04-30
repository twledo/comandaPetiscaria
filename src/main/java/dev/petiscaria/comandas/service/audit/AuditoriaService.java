package dev.petiscaria.comandas.service.audit;

import dev.petiscaria.comandas.enuns.AcaoComanda;
import dev.petiscaria.comandas.models.audit.Venda;
import dev.petiscaria.comandas.models.audit.VendaItem;
import dev.petiscaria.comandas.models.comanda.Comanda;
import dev.petiscaria.comandas.models.comanda.ComandaHistorico;
import dev.petiscaria.comandas.repository.audit.VendaRepository;
import dev.petiscaria.comandas.repository.comanda.ComandaHistoricoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditoriaService {

    private final ComandaHistoricoRepository historicoRepository;
    private final VendaRepository vendaRepository; // Você precisará criar este repositório

    public void registrarAcao(Comanda comanda, AcaoComanda acao, String detalhes, String usuario) {
        ComandaHistorico historico = ComandaHistorico.builder()
                .comanda(comanda)
                .acao(acao)
                .detalhes(detalhes)
                .usuario(usuario)
                .valorMomento(comanda.getTotal())
                .build();
        historicoRepository.save(historico);
    }

    @Transactional
    public void salvarSnapshotVenda(Comanda comanda, String usuarioCaixa) {
        // Converte os itens da comanda em itens de venda persistentes
        List<VendaItem> itensVenda = comanda.getItens().stream()
                .map(item -> VendaItem.builder()
                        .produtoId(item.getProduto().getId())
                        .nomeProduto(item.getNomeProduto())
                        .quantidade(item.getQuantidade())
                        .precoVendido(item.getPrecoEfetivo())
                        .subtotal(item.getTotalItem())
                        .build())
                .collect(Collectors.toList());

        Venda venda = Venda.builder()
                .mesaId(comanda.getMesa().getId())
                .comandaOriginalId(comanda.getId())
                .totalVenda(comanda.getTotal())
                .usuarioCaixa(usuarioCaixa)
                .itensConsumidos(itensVenda)
                .build();

        vendaRepository.save(venda);
    }
}