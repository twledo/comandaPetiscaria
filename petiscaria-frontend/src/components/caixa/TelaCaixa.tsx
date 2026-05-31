import React, { useState, useEffect } from 'react';
import { caixaApi } from '../../api';
import styles from './TelaCaixa.module.css';

export default function TelaCaixa() {
    const [sessao, setSessao] = useState<any>(null);
    const [historico, setHistorico] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<'ABRIR' | 'FECHAR' | 'SUPRIMENTO' | 'SANGRIA' | 'RELATORIO' | null>(null);
    const [selectedSessaoId, setSelectedSessaoId] = useState<number | null>(null);

    useEffect(() => {
        carregarDados();
    }, []);

    async function carregarDados() {
        setLoading(true);
        try {
            const [ativo, hist] = await Promise.all([
                caixaApi.buscarAtivo().catch(() => null),
                caixaApi.listarHistorico().catch(() => [])
            ]);
            setSessao(ativo || null);
            setHistorico(hist || []);
        } catch (error) {
            console.error("Erro ao carregar dados do caixa", error);
        } finally {
            setLoading(false);
        }
    }

    const formatarMoeda = (valor: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
    };

    const formatarData = (d: string | null) => {
        if (!d) return "Em aberto";
        const date = new Date(d);
        return date.getFullYear() < 2020 ? "Em aberto" : date.toLocaleString('pt-BR');
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <span className={styles.spinner} /> Carregando sistema de caixa...
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* 🔴 ESTADO: CAIXA FECHADO */}
            {!sessao ? (
                <div className={styles.containerFechado}>
                    <div className={styles.cardFechado}>
                        <div className={styles.iconFechado}>🔒</div>
                        <h2>Caixa Fechado</h2>
                        <p>O caixa atual encontra-se encerrado. Abra um novo turno para iniciar as operações.</p>
                        <button className={styles.btnPrimary} onClick={() => setModal('ABRIR')}>
                            + Abrir Novo Turno
                        </button>
                    </div>
                </div>
            ) : (
                /* 🟢 ESTADO: CAIXA ABERTO */
                <>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.title}>Caixa Ativo</h1>
                            <p className={styles.subtitle}>
                                Aberto por <b>{sessao.usuarioAbertura}</b> em <b>{new Date(sessao.dataAbertura).toLocaleString('pt-BR')}</b>
                            </p>
                        </div>
                        <div>
                            <button className={styles.btnDanger} onClick={() => setModal('FECHAR')}>
                                Encerrar Turno
                            </button>
                        </div>
                    </header>

                    <div className={styles.gridCards}>
                        <div className={styles.cardResumo}>
                            <span>Fundo de Troco (Inicial)</span>
                            <h3>{formatarMoeda(sessao.saldoInicial)}</h3>
                        </div>

                        <div className={styles.cardAcoes}>
                            <button className={styles.btnSuprimento} onClick={() => setModal('SUPRIMENTO')}>
                                + Nova Entrada (Suprimento)
                            </button>
                            <button className={styles.btnSangria} onClick={() => setModal('SANGRIA')}>
                                - Nova Saída (Sangria)
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* 📜 HISTÓRICO DE TURNOS */}
            <section className={styles.sectionMovimentacoes}>
                <h3 className={styles.sectionTitle}>Histórico de Fechamentos</h3>

                {historico.length === 0 ? (
                    <p className={styles.emptyMsg}>Nenhum registro de turno encontrado no sistema.</p>
                ) : (
                    <div className={styles.historicoGrid}>
                        {historico.map(h => (
                            <div key={h.id} className={styles.cardTurno}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4>Turno #{h.id}</h4>
                                    <span className={`${styles.badge} ${h.status === 'ABERTO' ? styles.badgeGreen : styles.badgeRed}`}>
                                        {h.status}
                                    </span>
                                </div>
                                <small style={{ color: '#718096', marginBottom: '0.5rem', display: 'block' }}>
                                    Fechamento: {formatarData(h.dataFechamento)}
                                </small>
                                <p style={{ margin: '0 0 1rem 0' }}>
                                    Saldo Final: <b>{formatarMoeda(h.saldoDinheiroFechamento)}</b>
                                </p>
                                <button className={styles.btnGhost} onClick={() => { setSelectedSessaoId(h.id); setModal('RELATORIO'); }}>
                                    Ver Relatório
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* FLUXO DE MODAIS */}
            {modal === 'ABRIR' && <ModalContagem tipo="ABRIR" onClose={() => setModal(null)} onSuccess={carregarDados} />}
            {modal === 'FECHAR' && <ModalContagem tipo="FECHAR" onClose={() => setModal(null)} onSuccess={carregarDados} />}
            {modal === 'SUPRIMENTO' && <ModalMovimentacao tipo="SUPRIMENTO" onClose={() => setModal(null)} onSuccess={carregarDados} />}
            {modal === 'SANGRIA' && <ModalMovimentacao tipo="SANGRIA" onClose={() => setModal(null)} onSuccess={carregarDados} />}
            {modal === 'RELATORIO' && selectedSessaoId && <ModalRelatorio sessaoId={selectedSessaoId} onClose={() => setModal(null)} />}
        </div>
    );
}

// ============================================================================
// MODAL INTERNO: CONTAGEM DE CÉDULAS E MOEDAS
// ============================================================================
function ModalContagem({ tipo, onClose, onSuccess }: { tipo: 'ABRIR' | 'FECHAR', onClose: () => void, onSuccess: () => void }) {
    const [contagem, setContagem] = useState<Record<string, string>>({});
    const [observacoes, setObservacoes] = useState('');
    const [loading, setLoading] = useState(false);

    const mapNotas = ['200', '100', '50', '20', '10', '5', '2'];
    const mapMoedas = ['1', '0.50', '0.25', '0.10', '0.05'];

    const totalFisico = mapNotas.concat(mapMoedas).reduce((acc, valor) => {
        const qtd = parseInt(contagem[valor]) || 0;
        return acc + (parseFloat(valor) * qtd);
    }, 0);

    const handleChange = (valor: string, qtd: string) => {
        setContagem(prev => ({ ...prev, [valor]: qtd.replace(/\D/g, '') }));
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        const payload = {
            qtd200: parseInt(contagem['200']) || 0,
            qtd100: parseInt(contagem['100']) || 0,
            qtd50: parseInt(contagem['50']) || 0,
            qtd20: parseInt(contagem['20']) || 0,
            qtd10: parseInt(contagem['10']) || 0,
            qtd5: parseInt(contagem['5']) || 0,
            qtd2: parseInt(contagem['2']) || 0,
            qtd1: parseInt(contagem['1']) || 0,
            qtd050: parseInt(contagem['0.50']) || 0,
            qtd025: parseInt(contagem['0.25']) || 0,
            qtd010: parseInt(contagem['0.10']) || 0,
            qtd005: parseInt(contagem['0.05']) || 0,
            observacoes: observacoes.trim()
        };

        try {
            if (tipo === 'ABRIR') {
                await caixaApi.abrir(payload);
            } else {
                await caixaApi.fechar(payload);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.message || 'Erro ao processar requisição financeira.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.backdrop}>
            <form className={styles.modal} onSubmit={handleSubmit} style={{ maxWidth: '650px' }}>
                <h3 style={{ color: tipo === 'FECHAR' ? '#e53e3e' : '#1a202c' }}>
                    {tipo === 'ABRIR' ? 'Abrir Caixa (Fundo de Troco)' : 'Encerrar Turno (Conferência de Gaveta)'}
                </h3>

                <div className={styles.calculadoraGrid}>
                    <div>
                        <h4 className={styles.calculadoraTitle}>Cédulas</h4>
                        <div className={styles.moedasContainer}>
                            {mapNotas.map(n => (
                                <div key={n} className={styles.notaRow}>
                                    <label>R$ {n},00</label>
                                    <input className={styles.inputNota} type="text" pattern="\d*" value={contagem[n] || ''} onChange={e => handleChange(n, e.target.value)} placeholder="0" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className={styles.calculadoraTitle}>Moedas</h4>
                        <div className={styles.moedasContainer}>
                            {mapMoedas.map(m => (
                                <div key={m} className={styles.notaRow}>
                                    <label>R$ {parseFloat(m).toFixed(2).replace('.', ',')}</label>
                                    <input className={styles.inputNota} type="text" pattern="\d*" value={contagem[m] || ''} onChange={e => handleChange(m, e.target.value)} placeholder="0" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={styles.totalCalculadoBox} style={{ marginTop: '1.5rem' }}>
                    <span>Total Contabilizado:</span>
                    <h2>R$ {totalFisico.toFixed(2).replace('.', ',')}</h2>
                </div>

                {tipo === 'FECHAR' && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4a5568' }}>Observações</label>
                        <textarea className={styles.textarea} rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Justifique eventuais diferenças de valores detectadas na gaveta física..." style={{ marginTop: '0.5rem' }} />
                    </div>
                )}

                <div className={styles.modalActions}>
                    <button type="button" className={styles.btnGhost} onClick={onClose}>Cancelar</button>
                    <button type="submit" className={tipo === 'ABRIR' ? styles.btnPrimary : styles.btnDanger} disabled={loading}>
                        {loading ? 'Processando...' : 'Confirmar'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ============================================================================
// MODAL INTERNO: REGISTRO DE MOVIMENTAÇÕES EXTRAS (SUPRIMENTO / SANGRIA)
// ============================================================================
function ModalMovimentacao({ tipo, onClose, onSuccess }: { tipo: 'SUPRIMENTO' | 'SANGRIA', onClose: () => void, onSuccess: () => void }) {
    const [valor, setValor] = useState('');
    const [motivo, setMotivo] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSalvar(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const valorNum = parseFloat(valor.replace(',', '.'));
            await caixaApi.movimentar(tipo, valorNum, motivo);
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.message || 'Erro ao registrar movimentação');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.backdrop}>
            <form className={styles.modal} onSubmit={handleSalvar}>
                <h3 style={{ color: tipo === 'SUPRIMENTO' ? '#38a169' : '#dd6b20' }}>
                    {tipo === 'SUPRIMENTO' ? 'Nova Entrada (Suprimento)' : 'Nova Retirada (Sangria)'}
                </h3>
                <div className={styles.formGrid}>
                    <div>
                        <label>Valor (R$)</label>
                        <input type="number" step="0.01" min="0.01" required autoFocus className={styles.input} value={valor} onChange={e => setValor(e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                        <label>Motivo</label>
                        <input type="text" required className={styles.input} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Fundo de troco reserva" />
                    </div>
                    <div className={styles.modalActions}>
                        <button type="button" className={styles.btnGhost} onClick={onClose}>Cancelar</button>
                        <button type="submit" className={tipo === 'SUPRIMENTO' ? styles.btnSuprimento : styles.btnSangria} disabled={loading || !valor || !motivo}>
                            {loading ? 'Salvando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

// ============================================================================
// MODAL INTERNO: RELATÓRIO DE AUDITORIA COMPLETA
// ============================================================================
function ModalRelatorio({ sessaoId, onClose }: { sessaoId: number, onClose: () => void }) {
    const [relatorio, setRelatorio] = useState<any>(null);

    useEffect(() => {
        caixaApi.gerarRelatorio(sessaoId).then(setRelatorio);
    }, [sessaoId]);

    const formatarVal = (val: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);

    if (!relatorio) return <div className={styles.backdrop}><div className={styles.modal}>Carregando relatório...</div></div>;

    const diferenca = Number(relatorio.diferencaCaixa) || 0;
    const corDiferenca = diferenca > 0 ? '#38a169' : diferenca < 0 ? '#e53e3e' : '#1a202c';

    return (
        <div className={styles.backdrop}>
            <div className={styles.modal} style={{ maxWidth: '550px' }}>
                <h3>Resumo Financeiro - Turno #{sessaoId}</h3>

                <div className={styles.formGrid} style={{ gap: '0.75rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '0.5rem' }}>
                        <span>Vendas em Dinheiro:</span> <b>{formatarVal(relatorio.totalDinheiroVendas)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '0.5rem' }}>
                        <span>PIX Recebido:</span> <b>{formatarVal(relatorio.totalPix)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '0.5rem' }}>
                        <span>Cartão Débito:</span> <b>{formatarVal(relatorio.totalDebito)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '0.5rem' }}>
                        <span>Cartão Crédito:</span> <b>{formatarVal(relatorio.totalCredito)}</b>
                    </div>

                    <div style={{ marginTop: '1rem', background: '#f7fafc', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Fundo Inicial:</span> <span>{formatarVal(relatorio.saldoInicial)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#38a169' }}>
                            <span>(+) Suprimentos:</span> <span>{formatarVal(relatorio.totalSuprimentos)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#dd6b20' }}>
                            <span>(-) Sangrias:</span> <span>{formatarVal(relatorio.totalSangrias)}</span>
                        </div>

                        <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#718096' }}>
                            <span>Saldo Esperado (Sistema):</span> <span>{formatarVal(relatorio.saldoEsperadoDinheiro)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Saldo Físico (Gaveta Contada):</span> <b>{formatarVal(relatorio.saldoDinheiroContado)}</b>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', fontSize: '1.2rem' }}>
                            <strong style={{ color: corDiferenca }}>Diferença de Caixa:</strong>
                            <strong style={{ color: corDiferenca }}>{formatarVal(diferenca)}</strong>
                        </div>
                    </div>
                </div>

                <div className={styles.modalActions} style={{ marginTop: '2rem' }}>
                    <button className={styles.btnPrimary} onClick={onClose}>Fechar Auditoria</button>
                </div>
            </div>
        </div>
    );
}