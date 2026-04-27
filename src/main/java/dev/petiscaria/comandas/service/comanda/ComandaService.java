package dev.petiscaria.comandas.service.comanda;

import dev.petiscaria.comandas.enuns.AcaoComanda;
import dev.petiscaria.comandas.enuns.StatusComanda;
import dev.petiscaria.comandas.models.comanda.Comanda;
import dev.petiscaria.comandas.models.comanda.ComandaHistorico;
import dev.petiscaria.comandas.models.comanda.ComandaRecebimento;
import dev.petiscaria.comandas.models.comanda.ItemPedido;
import dev.petiscaria.comandas.models.produto.Produto;
import dev.petiscaria.comandas.repository.comanda.ComandaHistoricoRepository;
import dev.petiscaria.comandas.repository.comanda.ComandaRecebimentoRepository;
import dev.petiscaria.comandas.repository.comanda.ComandaRepository;
import dev.petiscaria.comandas.repository.produto.ProdutoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ComandaService {

    private final ComandaRepository comandaRepository;
    private final ProdutoRepository produtoRepository;
    private final ComandaHistoricoRepository historicoRepository;
    private final ComandaRecebimentoRepository recebimentoRepository;

    public List<Comanda> listarComandasAtivas() {
        try {
            return comandaRepository.findAllByOrderByIdAsc();
        } catch (Exception e) {
            log.error("Erro ao buscar comandas no banco: ", e);
            throw new RuntimeException("Não foi possível carregar as comandas no momento.");
        }
    }

    @Transactional
    public Comanda abrirComanda(Long mesaId) {
        // 1. Busca a comanda no banco
        Comanda comanda = comandaRepository.findByMesaId(mesaId)
                .orElseThrow(() -> new RuntimeException("Mesa " + mesaId + " não encontrada."));

        // 2. Se a mesa já estiver OCUPADA, não fazemos nada (evita reabrir mesa com gente)
        if (comanda.getStatus() == StatusComanda.OCUPADA) {
            return comanda;
        }

        // 3. AGORA A MÁGICA: Limpa a rodada anterior e muda para OCUPADA
        comanda.setStatus(StatusComanda.OCUPADA); // <--- AQUI: Muda de Verde para Vermelho
        comanda.setTotal(BigDecimal.ZERO);

        // Importante: certifique-se de que o orphanRemoval=true está no @OneToMany para isso funcionar
        comanda.getItens().clear();

        registrarHistorico(comanda, AcaoComanda.ABERTA, "Comanda iniciada. Mesa " + mesaId + " agora está OCUPADA.");

        return comandaRepository.save(comanda);
    }

    @Transactional
    public Comanda adicionarItem(Long comandaId, Long produtoId, ItemPedido dadosItem) {
        Comanda comanda = findComandaByIdOrThrow(comandaId);
        Produto produto = produtoRepository.findById(produtoId).orElseThrow();

        // Tenta encontrar se este produto já está na comanda com as mesmas condições
        Optional<ItemPedido> itemExistente = comanda.getItens().stream()
                .filter(item -> item.getProduto().getId().equals(produtoId) &&
                        item.isMeiaPorcao() == dadosItem.isMeiaPorcao() &&
                        Objects.equals(item.getObservacao(), dadosItem.getObservacao()))
                .findFirst();

        if (itemExistente.isPresent()) {
            // Se já existe, apenas aumenta a quantidade
            ItemPedido item = itemExistente.get();
            item.setQuantidade(item.getQuantidade() + dadosItem.getQuantidade());
        } else {
            // Se é novo, cria com o vínculo do produto
            ItemPedido novoItem = ItemPedido.builder()
                    .comanda(comanda)
                    .produto(produto) // <--- Vínculo criado aqui
                    .nomeProduto(produto.getNome())
                    .precoUnitario(produto.getPreco())
                    .quantidade(dadosItem.getQuantidade())
                    .observacao(dadosItem.getObservacao())
                    .meiaPorcao(dadosItem.isMeiaPorcao())
                    .build();
            comanda.getItens().add(novoItem);
        }

        recalcularTotalComanda(comanda);

        registrarHistorico(comanda, AcaoComanda.ITEM_ADICIONADO,
                String.format("Item: %s (Qtd: %d)", produto.getNome(), dadosItem.getQuantidade()));

        return comandaRepository.save(comanda);
    }

    @Transactional
    public Comanda removerItem(Long comandaId, Long itemId) {
        log.info("Removendo item {} da comanda {}", itemId, comandaId);
        Comanda comanda = findComandaByIdOrThrow(comandaId);
        validarComandaAberta(comanda);

        ItemPedido itemParaRemover = comanda.getItens().stream()
                .filter(item -> item.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Item com ID " + itemId + " não encontrado na comanda."));

        comanda.getItens().remove(itemParaRemover);
        recalcularTotalComanda(comanda);

        registrarHistorico(comanda, AcaoComanda.ITEM_REMOVIDO,
                String.format("Item: %s (Qtd: %d)", itemParaRemover.getNomeProduto(), itemParaRemover.getQuantidade()));

        return comandaRepository.save(comanda);
    }

    @Transactional
    public Comanda fecharComanda(Long comandaId) {
        log.info("Fechando comanda {}", comandaId);
        Comanda comanda = findComandaByIdOrThrow(comandaId);
        validarComandaAberta(comanda);

        comanda.setStatus(StatusComanda.OCUPADA);
        recalcularTotalComanda(comanda); // Garante que o total está correto ao fechar

        registrarHistorico(comanda, AcaoComanda.FECHADA, "Comanda fechada com total de R$ " + comanda.getTotal());
        return comandaRepository.save(comanda);
    }

    @Transactional
    public void confirmarRecebimento(Long comandaId, String usuario) {
        log.info("Confirmando recebimento da comanda {} pelo usuário {}", comandaId, usuario);
        Comanda comanda = findComandaByIdOrThrow(comandaId);

        // Idealmente, a comanda deve estar FECHADA para confirmar o recebimento, mas não é uma regra obrigatória no prompt
        // if(comanda.getStatus() != StatusComanda.FECHADA) {
        //     throw new IllegalStateException("Apenas comandas fechadas podem ter o recebimento confirmado.");
        // }

        ComandaRecebimento recebimento = ComandaRecebimento.builder()
                .comanda(comanda)
                .usuario(usuario)
                .build();
        recebimentoRepository.save(recebimento);
        log.info("Recebimento da comanda {} confirmado.", comandaId);
    }


    private void recalcularTotalComanda(Comanda comanda) {
        BigDecimal novoTotal = comanda.getItens().stream()
                .map(item -> item.getPrecoEfetivo().multiply(BigDecimal.valueOf(item.getQuantidade())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        comanda.setTotal(novoTotal);
    }

    private Comanda findComandaByIdOrThrow(Long comandaId) {
        return comandaRepository.findById(comandaId)
                .orElseThrow(() -> new RuntimeException("Comanda com ID " + comandaId + " não encontrada."));
    }

    private void validarComandaAberta(Comanda comanda) {
        if (comanda.getStatus() != StatusComanda.DISPONIVEL) {
            throw new IllegalStateException("Operação não permitida. A comanda " + comanda.getId() + " não está DISPONIVEL.");
        }
    }

    private void registrarHistorico(Comanda comanda, AcaoComanda acao, String detalhes) {
        ComandaHistorico historico = ComandaHistorico.builder()
                .comanda(comanda)
                .acao(acao)
                .detalhes(detalhes)
                .build();
        historicoRepository.save(historico);
    }
}
