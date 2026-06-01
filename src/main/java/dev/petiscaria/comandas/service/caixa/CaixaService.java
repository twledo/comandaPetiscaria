package dev.petiscaria.comandas.service.caixa;

import dev.petiscaria.comandas.dto.caixa.FechamentoCaixaDTO;
import dev.petiscaria.comandas.enuns.MetodoPagamento;
import dev.petiscaria.comandas.enuns.caixa.StatusCaixa;
import dev.petiscaria.comandas.enuns.caixa.TipoMovimentacaoCaixa;
import dev.petiscaria.comandas.models.caixa.ContagemDinheiro;
import dev.petiscaria.comandas.models.caixa.MovimentacaoCaixa;
import dev.petiscaria.comandas.models.caixa.SessaoCaixa;
import dev.petiscaria.comandas.models.comanda.ComandaRecebimento;
import dev.petiscaria.comandas.repository.caixa.MovimentacaoCaixaRepository;
import dev.petiscaria.comandas.repository.caixa.SessaoCaixaRepository;
import dev.petiscaria.comandas.repository.comanda.ComandaRecebimentoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CaixaService {

    private final SessaoCaixaRepository sessaoCaixaRepository;
    private final MovimentacaoCaixaRepository movimentacaoCaixaRepository;
    private final ComandaRecebimentoRepository recebimentoRepository;

    public boolean possuiCaixaAberto() {
        return sessaoCaixaRepository.findByStatus(StatusCaixa.ABERTO).isPresent();
    }

    public Optional<SessaoCaixa> buscarCaixaAtivo() {
        return sessaoCaixaRepository.findByStatus(StatusCaixa.ABERTO);
    }

    public Page<SessaoCaixa> listarHistorico(LocalDate data, Pageable pageable) {
        if (data != null) {
            LocalDateTime inicio = data.atStartOfDay();
            LocalDateTime fim = data.plusDays(1).atStartOfDay();
            return sessaoCaixaRepository.findByDataAberturaBetween(inicio, fim, pageable);
        }
        return sessaoCaixaRepository.findAllByOrderByIdDesc(pageable);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public SessaoCaixa abrirCaixa(FechamentoCaixaDTO dto, String usuario) {
        if (possuiCaixaAberto()) {
            throw new IllegalStateException("Já existe uma sessão de caixa aberta!");
        }

        BigDecimal totalCalculado = calcularTotal(dto);

        SessaoCaixa novaSessao = new SessaoCaixa();
        novaSessao.setSaldoInicial(totalCalculado);
        novaSessao.setDataAbertura(LocalDateTime.now());
        novaSessao.setUsuarioAbertura(usuario);
        novaSessao.setStatus(StatusCaixa.ABERTO);

        return sessaoCaixaRepository.save(novaSessao);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public MovimentacaoCaixa registrarMovimentacao(TipoMovimentacaoCaixa tipo, BigDecimal valor, String motivo, String usuario) {
        SessaoCaixa sessao = buscarCaixaAtivo()
                .orElseThrow(() -> new IllegalStateException("Não há nenhum caixa aberto para registrar movimentação."));

        if (valor == null || valor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("O valor da movimentação deve ser maior que zero.");
        }
        if (motivo == null || motivo.trim().isEmpty()) {
            throw new IllegalArgumentException("O motivo da movimentação é obrigatório.");
        }

        if (tipo == TipoMovimentacaoCaixa.SANGRIA) {
            BigDecimal dinheiroDisponivel = calcularDinheiroFisicoDisponivelAteAgora(sessao);
            if (valor.compareTo(dinheiroDisponivel) > 0) {
                throw new IllegalArgumentException("Saldo insuficiente em caixa para realizar esta sangria. Disponível: R$ " + dinheiroDisponivel);
            }
        }

        MovimentacaoCaixa movimentacao = MovimentacaoCaixa.builder()
                .sessaoCaixa(sessao)
                .tipo(tipo)
                .valor(valor)
                .motivo(motivo.trim())
                .usuario(usuario)
                .build();

        movimentacao = movimentacaoCaixaRepository.save(movimentacao);
        sessao.getMovimentacoes().add(movimentacao);
        sessaoCaixaRepository.save(sessao);

        return movimentacao;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public SessaoCaixa fecharCaixa(FechamentoCaixaDTO dto, String usuario) {
        SessaoCaixa sessao = buscarCaixaAtivo()
                .orElseThrow(() -> new IllegalStateException("Nenhum caixa aberto."));

        BigDecimal totalContado = calcularTotal(dto);

        BigDecimal saldoEsperado = calcularDinheiroFisicoDisponivelAteAgora(sessao);

        boolean temDiferenca = totalContado.compareTo(saldoEsperado) != 0;

        if (temDiferenca) {
            if (dto.observacoes() == null || dto.observacoes().trim().length() < 5) {
                throw new IllegalArgumentException(
                        "Diferença de caixa detectada (Esperado: R$ " + saldoEsperado +
                                ", Contado: R$ " + totalContado + "). Por favor, informe um motivo válido na observação."
                );
            }
        }

        ContagemDinheiro contagem = new ContagemDinheiro();
        contagem.setQtd200(dto.qtd200() != null ? dto.qtd200() : 0);
        contagem.setQtd100(dto.qtd100() != null ? dto.qtd100() : 0);
        contagem.setQtd50(dto.qtd50()   != null ? dto.qtd50()  : 0);
        contagem.setQtd20(dto.qtd20()   != null ? dto.qtd20()  : 0);
        contagem.setQtd10(dto.qtd10()   != null ? dto.qtd10()  : 0);
        contagem.setQtd5(dto.qtd5()     != null ? dto.qtd5()   : 0);
        contagem.setQtd2(dto.qtd2()     != null ? dto.qtd2()   : 0);
        contagem.setQtd1(dto.qtd1()     != null ? dto.qtd1()   : 0);
        contagem.setQtd050(dto.qtd050() != null ? dto.qtd050() : 0);
        contagem.setQtd025(dto.qtd025() != null ? dto.qtd025() : 0);
        contagem.setQtd010(dto.qtd010() != null ? dto.qtd010() : 0);
        contagem.setQtd005(dto.qtd005() != null ? dto.qtd005() : 0);

        sessao.setDataFechamento(LocalDateTime.now());
        sessao.setContagemDinheiro(contagem);
        sessao.setSaldoDinheiroFechamento(totalContado);
        sessao.setUsuarioFechamento(usuario);
        sessao.setStatus(StatusCaixa.FECHADO);
        sessao.setObservacoes(dto.observacoes() != null ? dto.observacoes().trim() : "");

        return sessaoCaixaRepository.save(sessao);
    }

    public Map<String, Object> gerarRelatorioTurno(Long sessaoId) {
        SessaoCaixa sessao = sessaoCaixaRepository.findById(sessaoId)
                .orElseThrow(() -> new RuntimeException("Sessão de caixa não encontrada."));

        LocalDateTime inicio = sessao.getDataAbertura();
        LocalDateTime fim = sessao.getDataFechamento() != null ? sessao.getDataFechamento() : LocalDateTime.now();

        List<ComandaRecebimento> recebimentos = recebimentoRepository.findByDataRecebimentoBetween(inicio, fim);
        List<MovimentacaoCaixa> movimentacoes = movimentacaoCaixaRepository.findBySessaoCaixaIdOrderByTimestampDesc(sessao.getId());

        long qtdDinheiro = 0, qtdPix = 0, qtdDebito = 0, qtdCredito = 0;
        BigDecimal totalDinheiro = BigDecimal.ZERO;
        BigDecimal totalPix = BigDecimal.ZERO;
        BigDecimal totalDebito = BigDecimal.ZERO;
        BigDecimal totalCredito = BigDecimal.ZERO;

        for (ComandaRecebimento r : recebimentos) {
            BigDecimal v = r.getValor() != null ? r.getValor() : BigDecimal.ZERO;
            switch (r.getMetodoPagamento()) {
                case DINHEIRO -> { totalDinheiro = totalDinheiro.add(v); qtdDinheiro++; }
                case PIX -> { totalPix = totalPix.add(v); qtdPix++; }
                case CARTAO_DEBITO -> { totalDebito = totalDebito.add(v); qtdDebito++; }
                case CARTAO_CREDITO -> { totalCredito = totalCredito.add(v); qtdCredito++; }
            }
        }

        BigDecimal totalSuprimentos = BigDecimal.ZERO;
        BigDecimal totalSangrias = BigDecimal.ZERO;

        for (MovimentacaoCaixa m : movimentacoes) {
            BigDecimal v = m.getValor() != null ? m.getValor() : BigDecimal.ZERO;
            if (m.getTipo() == TipoMovimentacaoCaixa.SUPRIMENTO) {
                totalSuprimentos = totalSuprimentos.add(v);
            } else if (m.getTipo() == TipoMovimentacaoCaixa.SANGRIA) {
                totalSangrias = totalSangrias.add(v);
            }
        }

        BigDecimal totalTroco = recebimentos.stream()
                .filter(r -> r.getMetodoPagamento() == MetodoPagamento.DINHEIRO && r.getValorTroco() != null)
                .map(ComandaRecebimento::getValorTroco)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal saldoInicial = sessao.getSaldoInicial() != null ? sessao.getSaldoInicial() : BigDecimal.ZERO;
        BigDecimal esperadoDinheiro = saldoInicial.add(totalDinheiro).add(totalSuprimentos).subtract(totalSangrias);
        BigDecimal realDinheiro = sessao.getSaldoDinheiroFechamento() != null ? sessao.getSaldoDinheiroFechamento() : BigDecimal.ZERO;
        BigDecimal diferenca = realDinheiro.subtract(esperadoDinheiro);

        Map<String, Object> relatorio = new HashMap<>();
        relatorio.put("id", sessao.getId());
        relatorio.put("dataAbertura", sessao.getDataAbertura());
        relatorio.put("dataFechamento", sessao.getDataFechamento());
        relatorio.put("usuarioAbertura", sessao.getUsuarioAbertura());
        relatorio.put("usuarioFechamento", sessao.getUsuarioFechamento());
        relatorio.put("status", sessao.getStatus().name());
        relatorio.put("saldoInicial", saldoInicial);
        relatorio.put("totalDinheiroVendas", totalDinheiro);
        relatorio.put("totalPix", totalPix);
        relatorio.put("totalDebito", totalDebito);
        relatorio.put("totalCredito", totalCredito);
        relatorio.put("totalVendasConsolidado", totalDinheiro.add(totalPix).add(totalDebito).add(totalCredito));
        relatorio.put("totalSuprimentos", totalSuprimentos);
        relatorio.put("totalSangrias", totalSangrias);
        relatorio.put("saldoEsperadoDinheiro", esperadoDinheiro);
        relatorio.put("saldoDinheiroContado", sessao.getSaldoDinheiroFechamento());
        relatorio.put("diferencaCaixa", sessao.getStatus() == StatusCaixa.FECHADO ? diferenca : BigDecimal.ZERO);
        relatorio.put("observacoes", sessao.getObservacoes());
        relatorio.put("qtdDinheiro", qtdDinheiro);
        relatorio.put("qtdPix", qtdPix);
        relatorio.put("qtdDebito", qtdDebito);
        relatorio.put("qtdCredito", qtdCredito);
        relatorio.put("totalTrocoDado", totalTroco);

        return relatorio;
    }

    private BigDecimal calcularDinheiroFisicoDisponivelAteAgora(SessaoCaixa sessao) {
        LocalDateTime inicio = sessao.getDataAbertura();
        LocalDateTime fim = LocalDateTime.now();

        List<ComandaRecebimento> recebimentos = recebimentoRepository.findByDataRecebimentoBetween(inicio, fim);
        BigDecimal totalDinheiroVendas = recebimentos.stream()
                .filter(r -> r.getMetodoPagamento() == MetodoPagamento.DINHEIRO)
                .map(r -> r.getValor() != null ? r.getValor() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSuprimentos = sessao.getMovimentacoes().stream()
                .filter(m -> m.getTipo() == TipoMovimentacaoCaixa.SUPRIMENTO)
                .map(m -> m.getValor() != null ? m.getValor() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSangrias = sessao.getMovimentacoes().stream()
                .filter(m -> m.getTipo() == TipoMovimentacaoCaixa.SANGRIA)
                .map(m -> m.getValor() != null ? m.getValor() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal saldoInicial = sessao.getSaldoInicial() != null ? sessao.getSaldoInicial() : BigDecimal.ZERO;
        return saldoInicial.add(totalDinheiroVendas).add(totalSuprimentos).subtract(totalSangrias).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calcularTotal(FechamentoCaixaDTO dto) {
        BigDecimal total = BigDecimal.ZERO;
        total = total.add(new BigDecimal("200.00").multiply(new BigDecimal(dto.qtd200() != null ? dto.qtd200() : 0)));
        total = total.add(new BigDecimal("100.00").multiply(new BigDecimal(dto.qtd100() != null ? dto.qtd100() : 0)));
        total = total.add(new BigDecimal("50.00").multiply(new BigDecimal(dto.qtd50()   != null ? dto.qtd50()  : 0)));
        total = total.add(new BigDecimal("20.00").multiply(new BigDecimal(dto.qtd20()   != null ? dto.qtd20()  : 0)));
        total = total.add(new BigDecimal("10.00").multiply(new BigDecimal(dto.qtd10()   != null ? dto.qtd10()  : 0)));
        total = total.add(new BigDecimal("5.00") .multiply(new BigDecimal(dto.qtd5()    != null ? dto.qtd5()   : 0)));
        total = total.add(new BigDecimal("2.00") .multiply(new BigDecimal(dto.qtd2()    != null ? dto.qtd2()   : 0)));
        total = total.add(new BigDecimal("1.00") .multiply(new BigDecimal(dto.qtd1()    != null ? dto.qtd1()   : 0)));
        total = total.add(new BigDecimal("0.50") .multiply(new BigDecimal(dto.qtd050()  != null ? dto.qtd050() : 0)));
        total = total.add(new BigDecimal("0.25") .multiply(new BigDecimal(dto.qtd025()  != null ? dto.qtd025() : 0)));
        total = total.add(new BigDecimal("0.10") .multiply(new BigDecimal(dto.qtd010()  != null ? dto.qtd010() : 0)));
        total = total.add(new BigDecimal("0.05") .multiply(new BigDecimal(dto.qtd005()  != null ? dto.qtd005() : 0)));
        return total.setScale(2, RoundingMode.HALF_UP);
    }
}