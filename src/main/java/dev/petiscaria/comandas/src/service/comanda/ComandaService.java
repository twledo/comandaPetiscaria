package dev.petiscaria.comandas.src.service.comanda;

import dev.petiscaria.comandas.src.enuns.StatusComanda;
import dev.petiscaria.comandas.src.enuns.StatusPreparo;
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

@Service
@RequiredArgsConstructor
public class ComandaService {
    private final ComandaRepository comandaRepository;
    private final ItemPedidoRepository itemPedidoRepository;
    private final ProdutoRepository produtoRepository;

    @Transactional
    public Comanda abrirComanda(Integer mesaId) {
        // Regra: Uma mesa só pode ter uma comanda ABERTA
        comandaRepository.findByMesaIdAndStatus(mesaId, StatusComanda.ABERTA)
                .ifPresent(c -> { throw new RuntimeException("Mesa já ocupada!"); });

        Comanda nova = new Comanda();
        nova.setMesaId(mesaId);
        return comandaRepository.save(nova);
    }

    @Transactional
    public Comanda adicionarItem(Long comandaId, Long produtoId, ItemPedido dadosItem) {
        Comanda comanda = comandaRepository.findById(comandaId).get();
        Produto produto = produtoRepository.findById(produtoId)
                .orElseThrow(() -> new RuntimeException("Produto não existe"));

        if (!produto.getDisponivel()) {
            throw new RuntimeException("Este produto acabou no estoque!");
        }

        if (dadosItem.isMeiaPorcao() && !produto.isPermiteMeia()) {
            throw new RuntimeException("Este produto não pode ser vendido como meia porção.");
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
        Comanda comanda = comandaRepository.findById(comandaId).get();
        comanda.setStatus(StatusComanda.FECHADA);
        return comandaRepository.save(comanda);
    }

    // --- REGRA: EDITAR ITEM ---
    @Transactional
    public Comanda editarItem(Long comandaId, Long itemId, Integer novaQuantidade) {
        Comanda comanda = comandaRepository.findById(comandaId)
                .orElseThrow(() -> new RuntimeException("Comanda não encontrada"));

        ItemPedido item = comanda.getItens().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Item não encontrado na comanda"));

        // Subtrai o valor antigo e soma o novo no total da comanda
        BigDecimal valorAntigo = item.getPrecoUnitario().multiply(BigDecimal.valueOf(item.getQuantidade()));
        BigDecimal valorNovo = item.getPrecoUnitario().multiply(BigDecimal.valueOf(novaQuantidade));

        comanda.setTotal(comanda.getTotal().subtract(valorAntigo).add(valorNovo));
        item.setQuantidade(novaQuantidade);

        return comandaRepository.save(comanda);
    }

    // --- REGRA: REMOVER ITEM ---
    @Transactional
    public Comanda removerItem(Long comandaId, Long itemId) {
        Comanda comanda = comandaRepository.findById(comandaId).get();
        ItemPedido item = itemPedidoRepository.findById(itemId).get();

        BigDecimal valorRemovido = item.getPrecoUnitario().multiply(BigDecimal.valueOf(item.getQuantidade()));
        comanda.setTotal(comanda.getTotal().subtract(valorRemovido));

        comanda.getItens().remove(item);
        return comandaRepository.save(comanda);
    }

    // --- REGRA: ENVIAR PARA COZINHA (BOTÃO ENVIAR) ---
    @Transactional
    public void enviarParaCozinha(Long comandaId) {
        Comanda comanda = comandaRepository.findById(comandaId).get();

        // Todos os itens que estavam PENDENTES agora vão para EM_PREPARO
        comanda.getItens().forEach(item -> {
            if (item.getStatusPreparo() == StatusPreparo.PENDENTE) {
                item.setStatusPreparo(StatusPreparo.PREPARANDO);
            }
        });

        comandaRepository.save(comanda);
    }
}