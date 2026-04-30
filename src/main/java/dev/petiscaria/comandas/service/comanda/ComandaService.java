package dev.petiscaria.comandas.service.comanda;

import dev.petiscaria.comandas.enuns.AcaoComanda;
import dev.petiscaria.comandas.enuns.StatusMesa;
import dev.petiscaria.comandas.models.comanda.Comanda;
import dev.petiscaria.comandas.models.comanda.ComandaRecebimento;
import dev.petiscaria.comandas.models.comanda.ItemPedido;
import dev.petiscaria.comandas.models.mesa.Mesa;
import dev.petiscaria.comandas.models.produto.Produto;
import dev.petiscaria.comandas.repository.comanda.ComandaRecebimentoRepository;
import dev.petiscaria.comandas.repository.comanda.ComandaRepository;
import dev.petiscaria.comandas.repository.mesa.MesaRepository;
import dev.petiscaria.comandas.repository.produto.ProdutoRepository;
import dev.petiscaria.comandas.service.audit.AuditoriaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ComandaService {

    private final ComandaRepository comandaRepository;
    private final MesaRepository mesaRepository;
    private final ProdutoRepository produtoRepository;
    private final ComandaRecebimentoRepository recebimentoRepository;
    private final AuditoriaService auditoriaService;

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda iniciarAtendimento(Long mesaId, String usuario) {
        Mesa mesa = mesaRepository.findById(mesaId)
                .orElseThrow(() -> new RuntimeException("Mesa não encontrada."));

        if (mesa.getStatus() == StatusMesa.OCUPADA) {
            return comandaRepository.findByMesaAndStatusAtivo(mesa)
                    .orElseThrow(() -> new RuntimeException("Mesa ocupada mas comanda não encontrada."));
        }

        // 1. Atualiza o status físico da Mesa
        mesa.setStatus(StatusMesa.OCUPADA);
        mesaRepository.save(mesa);

        // 2. Cria uma nova Comanda (Registro do atendimento)
        Comanda comanda = Comanda.builder()
                .mesa(mesa)
                .total(BigDecimal.ZERO)
                .build();

        comanda = comandaRepository.saveAndFlush(comanda);

        auditoriaService.registrarAcao(comanda, AcaoComanda.ABERTA, "Atendimento iniciado na mesa " + mesa.getNumero(), usuario);
        return comanda;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda registrarConsumo(Long comandaId, Long produtoId, ItemPedido dadosItem, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        garantirMesaOcupada(comanda.getMesa());

        Produto produto = produtoRepository.findById(produtoId)
                .orElseThrow(() -> new RuntimeException("Produto não encontrado."));

        comanda.getItens().stream()
                .filter(item -> item.getProduto().getId().equals(produtoId) &&
                        item.isMeiaPorcao() == dadosItem.isMeiaPorcao() &&
                        Objects.equals(item.getObservacao(), dadosItem.getObservacao()))
                .findFirst()
                .ifPresentOrElse(
                        item -> item.setQuantidade(item.getQuantidade() + dadosItem.getQuantidade()),
                        () -> {
                            dadosItem.setComanda(comanda);
                            dadosItem.setProduto(produto);
                            dadosItem.setNomeProduto(produto.getNome());
                            dadosItem.setPrecoUnitario(produto.getPreco());
                            comanda.getItens().add(dadosItem);
                        }
                );

        atualizarSaldoTotal(comanda);
        auditoriaService.registrarAcao(comanda, AcaoComanda.ITEM_ADICIONADO,
                String.format("Lançado: %s x%d", produto.getNome(), dadosItem.getQuantidade()), usuario);

        return comandaRepository.save(comanda);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda estornarItem(Long comandaId, Long itemId, String usuario) {
        // 1. Busca a comanda e garante que ela existe
        Comanda comanda = buscarPorIdOuFalhar(comandaId);

        // 2. Valida se a mesa permite alterações (não pode estar LIVRE nem em AGUARDANDO_PAGAMENTO)
        garantirMesaOcupada(comanda.getMesa());

        // 3. Localiza o item dentro da lista da comanda
        ItemPedido itemParaEstornar = comanda.getItens().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Item não encontrado nesta comanda."));

        // 4. Auditoria: Registra o estorno ANTES de remover (para ter os dados do item no log)
        String detalheEstorno = String.format("ESTORNO: %s (Qtd: %d) - Valor: R$ %s",
                itemParaEstornar.getNomeProduto(),
                itemParaEstornar.getQuantidade(),
                itemParaEstornar.getTotalItem());

        auditoriaService.registrarAcao(comanda, AcaoComanda.ITEM_REMOVIDO, detalheEstorno, usuario);

        // 5. Remove o item e atualiza o saldo da comanda
        comanda.getItens().remove(itemParaEstornar);
        atualizarSaldoTotal(comanda);

        // 6. Salva as alterações
        return comandaRepository.save(comanda);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')") // Geralmente restrito ao Admin/Gerente
    public Comanda reabrirAtendimento(Long comandaId, String usuario) {
        // 1. Busca a comanda
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        Mesa mesa = comanda.getMesa();

        // 2. Validação: Só faz sentido reabrir se a mesa estiver travada no financeiro
        if (mesa.getStatus() != StatusMesa.AGUARDANDO_PAGAMENTO) {
            throw new IllegalStateException("Apenas mesas em 'Aguardando Pagamento' podem ser reabertas.");
        }

        // 3. Volta o status físico da Mesa para OCUPADA (libera para novos itens)
        mesa.setStatus(StatusMesa.OCUPADA);
        mesaRepository.save(mesa);

        // 4. Registra a auditoria da reabertura
        auditoriaService.registrarAcao(
                comanda,
                AcaoComanda.REABERTA,
                "Atendimento reaberto para lançamento de novos itens.",
                usuario
        );

        // 5. Retorna a comanda atualizada
        return comanda;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'GARCOM')")
    public Comanda solicitarFechamento(Long comandaId, String usuario) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        Mesa mesa = comanda.getMesa();

        if (mesa.getStatus() != StatusMesa.OCUPADA) {
            throw new IllegalStateException("A mesa precisa estar ocupada para solicitar o fechamento.");
        }

        // A Mesa passa a aguardar o financeiro
        mesa.setStatus(StatusMesa.AGUARDANDO_PAGAMENTO);
        mesaRepository.save(mesa);

        auditoriaService.registrarAcao(comanda, AcaoComanda.FECHADA, "Pedido de conta realizado.", usuario);
        return comanda;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void finalizarAtendimento(Long comandaId, String usuarioCaixa) {
        Comanda comanda = buscarPorIdOuFalhar(comandaId);
        Mesa mesa = comanda.getMesa();

        if (mesa.getStatus() != StatusMesa.AGUARDANDO_PAGAMENTO) {
            throw new IllegalStateException("A mesa precisa estar em conferência para ser finalizada.");
        }

        // 1. Snapshot para Auditoria/BI
        auditoriaService.salvarSnapshotVenda(comanda, usuarioCaixa);

        // 2. Financeiro
        ComandaRecebimento recebimento = ComandaRecebimento.builder()
                .comanda(comanda)
                .valor(comanda.getTotal())
                .usuario(usuarioCaixa)
                .build();
        recebimentoRepository.save(recebimento);

        // 3. Libera a Mesa fisicamente
        mesa.setStatus(StatusMesa.DISPONIVEL);
        mesaRepository.save(mesa);

        auditoriaService.registrarAcao(comanda, AcaoComanda.FECHADA, "Pagamento confirmado e mesa liberada.", usuarioCaixa);

        // No modelo novo, NÃO damos comanda.getItens().clear() nem resetamos o total.
        // A comanda fica salva como ela foi. O "listarComandasAtivas" cuidará de não mostrá-la mais.
    }

    // --- AUXILIARES ---

    private void garantirMesaOcupada(Mesa mesa) {
        if (mesa.getStatus() == StatusMesa.DISPONIVEL) {
            throw new IllegalStateException("A mesa está livre. Inicie o atendimento primeiro.");
        }
        if (mesa.getStatus() == StatusMesa.AGUARDANDO_PAGAMENTO) {
            throw new IllegalStateException("Mesa em fechamento. Reabra para alterar itens.");
        }
    }

    private void atualizarSaldoTotal(Comanda comanda) {
        BigDecimal novoTotal = comanda.getItens().stream()
                .map(ItemPedido::getTotalItem)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        comanda.setTotal(novoTotal);
    }

    private Comanda buscarPorIdOuFalhar(Long comandaId) {
        return comandaRepository.findById(comandaId)
                .orElseThrow(() -> new RuntimeException("Comanda não encontrada."));
    }
}