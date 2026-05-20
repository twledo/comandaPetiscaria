package dev.petiscaria.comandas.service.audit;

import dev.petiscaria.comandas.enuns.AcaoComanda;
import dev.petiscaria.comandas.enuns.MetodoPagamento;
import dev.petiscaria.comandas.models.audit.Venda;
import dev.petiscaria.comandas.models.audit.VendaItem;
import dev.petiscaria.comandas.models.comanda.Comanda;
import dev.petiscaria.comandas.models.comanda.ComandaHistorico;
import dev.petiscaria.comandas.models.comanda.ItemPedido;
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
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditoriaService {

    private final ComandaHistoricoRepository historicoRepository;
    private final VendaRepository vendaRepository;

    // ─── 1. AÇÕES GERAIS ────────────────────────────────────────────────────────

    @Transactional(propagation = Propagation.REQUIRED)
    public void registrarAcao(Comanda comanda, AcaoComanda acao, String detalhes, String usuario) {
        salvarHistorico(comanda, acao, detalhes, usuario, null, null, null, null, null, null);
    }

    // ─── 2. AÇÕES DE ITENS ───────────────────────────────────────────────────────

    @Transactional(propagation = Propagation.REQUIRED)
    public void registrarAcaoItem(Comanda comanda, AcaoComanda acao, String detalhes, String usuario,
                                  String numeroPedido,
                                  Long produtoId, String nomeProduto, Integer quantidade, BigDecimal valorOperacao) {
        salvarHistorico(comanda, acao, detalhes, usuario, valorOperacao, produtoId, nomeProduto, quantidade, null, numeroPedido);
    }

    // ─── 3. AÇÕES DE PAGAMENTO ──────────────────────────────────────────────────

    @Transactional(propagation = Propagation.REQUIRED)
    public void registrarAcaoPagamento(Comanda comanda, AcaoComanda acao, String detalhes, String usuario,
                                       BigDecimal valorOperacao, MetodoPagamento metodoPagamento) {
        salvarHistorico(comanda, acao, detalhes, usuario, valorOperacao, null, null, null, metodoPagamento, null);
    }

    // ─── MÉTODO BASE PRIVADO ────────────────────────────────────────────────────

    private void salvarHistorico(Comanda comanda, AcaoComanda acao, String detalhes, String usuario,
                                 BigDecimal valorOperacao, Long produtoId, String nomeProduto,
                                 Integer quantidade, MetodoPagamento metodoPagamento,
                                 String numeroPedido) {

        BigDecimal valorMomento = comanda.getTotal() != null ? comanda.getTotal() : BigDecimal.ZERO;

        ComandaHistorico historico = ComandaHistorico.builder()
                .comanda(comanda)
                .acao(acao)
                .detalhes(detalhes)
                .usuario(usuario)
                .valorMomento(valorMomento)
                .dataEvento(LocalDateTime.now())
                .valorOperacao(valorOperacao)
                .produtoId(produtoId)
                .nomeProduto(nomeProduto)
                .quantidade(quantidade)
                .metodoPagamento(metodoPagamento)
                .numeroPedido(numeroPedido)
                .numeroMesa(comanda.getMesa() != null ? comanda.getMesa().getNumero() : null)
                .build();

        historicoRepository.save(historico);
    }

    // ─── SNAPSHOT DE VENDA (Refatorado para o novo modelo de Pedidos) ────────────

    @Transactional(propagation = Propagation.REQUIRED)
    public void salvarSnapshotVenda(Comanda comanda, String usuarioCaixa) {
        log.info("Gerando snapshot final de venda para a comanda {}", comanda.getId());

        BigDecimal totalVenda = comanda.getTotal() != null ? comanda.getTotal() : BigDecimal.ZERO;
        LocalDateTime dataAbertura = comanda.getCreatedAt() != null ? comanda.getCreatedAt() : LocalDateTime.now();

        Venda venda = Venda.builder()
                .comandaOriginalId(comanda.getId())
                .mesaId(comanda.getMesa().getId())
                .numeroMesa(comanda.getMesa().getNumero())
                .nomeCliente(comanda.getNomeCliente())
                .totalVenda(totalVenda)
                .usuarioCaixa(usuarioCaixa)
                .dataAbertura(dataAbertura)
                .dataVenda(LocalDateTime.now())
                .build();

        // MÁGICA: FlatMap para pegar todos os itens de todos os pedidos da comanda
        List<VendaItem> itensVenda = comanda.getPedidos().stream()
                .flatMap(pedido -> pedido.getItens().stream())
                .map(item -> {
                    BigDecimal totalItem = item.getTotalItem() != null ? item.getTotalItem() : BigDecimal.ZERO;

                    BigDecimal unitarioEfetivo = item.getQuantidade() > 0
                            ? totalItem.divide(new BigDecimal(item.getQuantidade()), 2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;

                    return VendaItem.builder()
                            .venda(venda)
                            .produtoId(item.getProduto().getId())
                            .nomeProduto(item.getNomeProduto())
                            .categoria(item.getProduto().getCategoria())
                            .quantidade(item.getQuantidade())
                            .precoTabela(item.getProduto().getPreco())
                            .precoVendido(unitarioEfetivo)
                            .subtotal(totalItem)
                            .meiaPorcao(item.isMeiaPorcao())
                            .build();
                })
                .toList();

        venda.setItensConsumidos(itensVenda);
        vendaRepository.save(venda);
        log.debug("Snapshot da venda salvo com {} itens extraídos dos pedidos.", itensVenda.size());
    }
}