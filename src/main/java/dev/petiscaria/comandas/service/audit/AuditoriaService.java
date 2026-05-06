package dev.petiscaria.comandas.service.audit;

import dev.petiscaria.comandas.enuns.AcaoComanda;
import dev.petiscaria.comandas.enuns.MetodoPagamento;
import dev.petiscaria.comandas.models.audit.Venda;
import dev.petiscaria.comandas.models.audit.VendaItem;
import dev.petiscaria.comandas.models.comanda.Comanda;
import dev.petiscaria.comandas.models.comanda.ComandaHistorico;
import dev.petiscaria.comandas.repository.audit.VendaRepository;
import dev.petiscaria.comandas.repository.comanda.ComandaHistoricoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditoriaService {

    private final ComandaHistoricoRepository historicoRepository;
    private final VendaRepository vendaRepository;

    // ─── 1. AÇÕES GERAIS (Abertura, Conta Pedida, Reabertura, etc) ──────────────

    @Transactional(propagation = Propagation.REQUIRED)
    public void registrarAcao(Comanda comanda, AcaoComanda acao, String detalhes, String usuario) {
        salvarHistorico(comanda, acao, detalhes, usuario, null, null, null, null, null);
    }

    // ─── 2. AÇÕES DE ITENS (Adição e Estorno) ───────────────────────────────────

    @Transactional(propagation = Propagation.REQUIRED)
    public void registrarAcaoItem(Comanda comanda, AcaoComanda acao, String detalhes, String usuario,
                                  Long produtoId, String nomeProduto, Integer quantidade, BigDecimal valorOperacao) {
        salvarHistorico(comanda, acao, detalhes, usuario, valorOperacao, produtoId, nomeProduto, quantidade, null);
    }

    // ─── 3. AÇÕES DE PAGAMENTO (Parcial, Divisão, Total) ────────────────────────

    @Transactional(propagation = Propagation.REQUIRED)
    public void registrarAcaoPagamento(Comanda comanda, AcaoComanda acao, String detalhes, String usuario,
                                       BigDecimal valorOperacao, MetodoPagamento metodoPagamento) {
        salvarHistorico(comanda, acao, detalhes, usuario, valorOperacao, null, null, null, metodoPagamento);
    }

    // ─── MÉTODO BASE PRIVADO (Concentra a lógica de salvamento) ─────────────────

    private void salvarHistorico(Comanda comanda, AcaoComanda acao, String detalhes, String usuario,
                                 BigDecimal valorOperacao, Long produtoId, String nomeProduto,
                                 Integer quantidade, MetodoPagamento metodoPagamento) {

        ComandaHistorico historico = ComandaHistorico.builder()
                .comanda(comanda)
                .acao(acao)
                .detalhes(detalhes)
                .usuario(usuario)
                .valorMomento(comanda.getTotal())
                .dataEvento(LocalDateTime.now())
                // Novos campos estruturados para relatórios:
                .valorOperacao(valorOperacao)
                .produtoId(produtoId)
                .nomeProduto(nomeProduto)
                .quantidade(quantidade)
                .metodoPagamento(metodoPagamento)
                .build();

        historicoRepository.save(historico);
        log.debug("Ação {} registrada estruturalmente para comanda {}", acao, comanda.getId());
    }

    // ─── SNAPSHOT DE VENDA (Mantido intacto) ────────────────────────────────────

    @Transactional
    public void salvarSnapshotVenda(Comanda comanda, String usuarioCaixa) {
        log.info("Gerando snapshot de venda para a comanda {}", comanda.getId());

        Venda venda = Venda.builder()
                .comandaOriginalId(comanda.getId())
                .mesaId(comanda.getMesa().getId())
                .numeroMesa(comanda.getMesa().getNumero())
                .nomeCliente(comanda.getNomeCliente())
                .totalVenda(comanda.getTotal())
                .usuarioCaixa(usuarioCaixa)
                .dataAbertura(comanda.getCreatedAt())
                .dataVenda(LocalDateTime.now())
                .build();

        List<VendaItem> itensVenda = comanda.getItens().stream()
                .map(item -> {
                    BigDecimal unitario = item.getQuantidade() > 0
                            ? item.getTotalItem().divide(new BigDecimal(item.getQuantidade()), 2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;

                    return VendaItem.builder()
                            .venda(venda)
                            .produtoId(item.getProduto().getId())
                            .nomeProduto(item.getNomeProduto())
                            .categoria(item.getProduto().getCategoria())
                            .quantidade(item.getQuantidade())
                            .precoVendido(unitario)
                            .subtotal(item.getTotalItem())
                            .meiaPorcao(item.isMeiaPorcao())
                            .build();
                })
                .toList();

        venda.setItensConsumidos(itensVenda);
        vendaRepository.save(venda);
    }
}