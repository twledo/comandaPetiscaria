package dev.petiscaria.comandas.src.service.comanda;

import dev.petiscaria.comandas.src.enuns.StatusComanda;
import dev.petiscaria.comandas.src.enuns.StatusPreparo;
import dev.petiscaria.comandas.src.exception.EntidadeNaoEncontradaException;
import dev.petiscaria.comandas.src.exception.RegraDeNegocioException;
import dev.petiscaria.comandas.src.models.comanda.Comanda;
import dev.petiscaria.comandas.src.models.comanda.ItemPedido;
import dev.petiscaria.comandas.src.models.produto.Produto;
import dev.petiscaria.comandas.src.repository.comanda.ComandaRepository;
import dev.petiscaria.comandas.src.repository.comanda.ItemPedidoRepository;
import dev.petiscaria.comandas.src.repository.produto.ProdutoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ComandaService {
    private final ComandaRepository comandaRepository;
    private final ItemPedidoRepository itemPedidoRepository;
    private final ProdutoRepository produtoRepository;

    public List<Comanda> listarAbertas() {
        return comandaRepository.findByStatus(StatusComanda.ABERTA);
    }

    public Comanda buscarPorId(Long id) {
        return comandaRepository.findById(id)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Comanda não encontrada"));
    }

    @Transactional
    public Comanda abrirComanda(Integer mesaId) {
        // Regra: Uma mesa só pode ter uma comanda ABERTA
        comandaRepository.findByMesaIdAndStatus(mesaId, StatusComanda.ABERTA)
                .ifPresent(c -> { throw new RegraDeNegocioException("Mesa já ocupada!"); });

        Comanda nova = new Comanda();
        nova.setMesaId(mesaId);
        return comandaRepository.save(nova);
    }

    @Transactional
    public Comanda adicionarItem(Long comandaId, Long produtoId, ItemPedido dadosItem) {
        Comanda comanda = comandaRepository.findById(comandaId)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Comanda não encontrada"));
        Produto produto = produtoRepository.findById(produtoId)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Produto não encontrado"));

        if (!produto.getDisponivel()) {
            throw new RegraDeNegocioException("Este produto acabou no estoque!");
        }

        if (dadosItem.isMeiaPorcao() && !produto.isPermiteMeia()) {
            throw new RegraDeNegocioException("Este produto não pode ser vendido como meia porção.");
        }

        // Faz a cópia dos dados do Produto para o Item (Snapshot)
        dadosItem.setNomeProduto(produto.getNome());
        dadosItem.setPrecoUnitario(produto.getPreco());
        dadosItem.setComanda(comanda);

        comanda.getItens().add(dadosItem);

        // Calcula o total usando sua lógica de getPrecoEfetivo()
        BigDecimal valorTotalItem = dadosItem.getPrecoEfetivo()
                .multiply(BigDecimal.valueOf(dadosItem.getQuantidade()));

        comanda.setTotal(comanda.getTotal().add(valorTotalItem));

        return comandaRepository.save(comanda);
    }

    @Transactional
    public Comanda fecharComanda(Long comandaId) {
        Comanda comanda = comandaRepository.findById(comandaId)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Comanda não encontrada"));
        comanda.setStatus(StatusComanda.FECHADA);
        return comandaRepository.save(comanda);
    }

    // --- REGRA: EDITAR ITEM ---
    @Transactional
    public Comanda editarItem(Long comandaId, Long itemId, Integer novaQuantidade) {
        Comanda comanda = comandaRepository.findById(comandaId)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Comanda não encontrada"));

        ItemPedido item = comanda.getItens().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Item não encontrado na comanda"));

        // Usa getPrecoEfetivo() para respeitar o desconto de meia porção
        BigDecimal valorAntigo = item.getPrecoEfetivo().multiply(BigDecimal.valueOf(item.getQuantidade()));
        BigDecimal valorNovo = item.getPrecoEfetivo().multiply(BigDecimal.valueOf(novaQuantidade));

        comanda.setTotal(comanda.getTotal().subtract(valorAntigo).add(valorNovo));
        item.setQuantidade(novaQuantidade);

        return comandaRepository.save(comanda);
    }

    // --- REGRA: REMOVER ITEM ---
    @Transactional
    public Comanda removerItem(Long comandaId, Long itemId) {
        Comanda comanda = comandaRepository.findById(comandaId)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Comanda não encontrada"));
        ItemPedido item = itemPedidoRepository.findById(itemId)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Item não encontrado"));

        // Usa getPrecoEfetivo() para respeitar o desconto de meia porção
        BigDecimal valorRemovido = item.getPrecoEfetivo().multiply(BigDecimal.valueOf(item.getQuantidade()));
        comanda.setTotal(comanda.getTotal().subtract(valorRemovido));

        comanda.getItens().remove(item);
        return comandaRepository.save(comanda);
    }

    // --- REGRA: ENVIAR PARA COZINHA (BOTÃO ENVIAR) ---
    @Transactional
    public void enviarParaCozinha(Long comandaId) {
        Comanda comanda = comandaRepository.findById(comandaId)
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Comanda não encontrada"));

        // Todos os itens que estavam PENDENTES agora vão para EM_PREPARO
        comanda.getItens().forEach(item -> {
            if (item.getStatusPreparo() == StatusPreparo.PENDENTE) {
                item.setStatusPreparo(StatusPreparo.PREPARANDO);
            }
        });

        comandaRepository.save(comanda);
    }
}
