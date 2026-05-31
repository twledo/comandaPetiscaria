import React, {useState, useEffect} from 'react';
import {caixaApi} from '../../api';
import styles from './TelaCaixa.module.css';

export default function TelaCaixa() {
    const [sessao, setSessao] = useState<any>(null);
    const [historico, setHistorico] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<'ABRIR' | 'FECHAR' | 'SUPRIMENTO' | 'SANGRIA' | 'RELATORIO' | null>(null);
    const [selectedSessaoId, setSelectedSessaoId] = useState<number | null>(null);
    const [saldoEsperado, setSaldoEsperado] = useState<number>(0);

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
        return new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(valor || 0);
    };

    const formatarData = (d: string | null) => {
        if (!d) return "Em aberto";
        const date = new Date(d);
        return date.getFullYear() < 2020 ? "Em aberto" : date.toLocaleString('pt-BR');
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <span className={styles.spinner}/> Carregando sistema de caixa...
            </div>
        );
    }

    return (
        <div className={styles.container}>
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
                <>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.title}>Caixa Ativo</h1>
                            <p className={styles.subtitle}>
                                Aberto
                                por <b>{sessao.usuarioAbertura}</b> em <b>{new Date(sessao.dataAbertura).toLocaleString('pt-BR')}</b>
                            </p>
                        </div>
                        <div>
                            <button
                                className={styles.btnDanger}
                                onClick={async () => {
                                    try {
                                        // Busca o relatório parcial do turno ativo para obter o saldo esperado
                                        const rel = await caixaApi.gerarRelatorio(sessao.id);
                                        setSaldoEsperado(Number(rel.saldoEsperadoDinheiro) || 0);
                                    } catch {
                                        setSaldoEsperado(0);
                                    }
                                    setModal('FECHAR');
                                }}
                            >
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

            <section className={styles.sectionMovimentacoes}>
                <h3 className={styles.sectionTitle}>Histórico de Fechamentos</h3>

                {historico.length === 0 ? (
                    <p className={styles.emptyMsg}>Nenhum registro de turno encontrado no sistema.</p>
                ) : (
                    <div className={styles.historicoGrid}>
                        {historico.map(h => (
                            <div key={h.id} className={styles.cardTurno}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <h4>Turno #{h.id}</h4>
                                    <span
                                        className={`${styles.statusBadge} ${h.status === 'ABERTO' ? styles.badgeGreen : styles.badgeRed}`}>
                                        {h.status}
                                    </span>
                                </div>
                                <small style={{color: 'var(--text-2)', marginBottom: '0.5rem', display: 'block'}}>
                                    Abertura: {formatarData(h.dataAbertura)}<br/>
                                    Fechamento: {formatarData(h.dataFechamento)}
                                </small>
                                <p style={{margin: '0 0 1rem 0'}}>
                                    Saldo Final: <b>{formatarMoeda(h.saldoDinheiroFechamento)}</b>
                                </p>
                                <button className={styles.btnGhost} onClick={() => {
                                    setSelectedSessaoId(h.id);
                                    setModal('RELATORIO');
                                }}>
                                    Ver Relatório
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {modal === 'ABRIR' &&
                <ModalContagem tipo="ABRIR" onClose={() => setModal(null)} onSuccess={carregarDados}/>}
            {modal === 'FECHAR' &&
                <ModalContagem
                    tipo="FECHAR"
                    onClose={() => setModal(null)}
                    onSuccess={carregarDados}
                    saldoEsperado={saldoEsperado}
                />
            }
            {modal === 'SUPRIMENTO' &&
                <ModalMovimentacao tipo="SUPRIMENTO" onClose={() => setModal(null)} onSuccess={carregarDados}/>}
            {modal === 'SANGRIA' &&
                <ModalMovimentacao tipo="SANGRIA" onClose={() => setModal(null)} onSuccess={carregarDados}/>}
            {modal === 'RELATORIO' && selectedSessaoId &&
                <ModalRelatorio sessaoId={selectedSessaoId} onClose={() => setModal(null)}/>}
        </div>
    );
}

// ✅ SUBSTITUIR pela versão correta:
function ModalContagem({ tipo, onClose, onSuccess, saldoEsperado = 0 }: {
    tipo: 'ABRIR' | 'FECHAR',
    onClose: () => void,
    onSuccess: () => void,
    saldoEsperado?: number
}) {
    const [contagem, setContagem] = useState<Record<string, string>>({});
    const [observacao, setObservacao] = useState('');
    const [etapa, setEtapa] = useState<'CONTAGEM' | 'JUSTIFICATIVA'>('CONTAGEM'); // ← estava faltando

    const notas = ['200', '100', '50', '20', '10', '5', '2'];
    const moedas = ['1', '0.50', '0.25', '0.10', '0.05'];

    const total = parseFloat(
        notas.concat(moedas).reduce((acc, v) =>
            acc + (parseFloat(v) * (parseInt(contagem[v] || '0'))), 0
        ).toFixed(2)
    );

    async function enviarFechamento(obs: string = '') { // ← estava faltando
        const payload = {
            qtd200: parseInt(contagem['200']) || 0,
            qtd100: parseInt(contagem['100']) || 0,
            qtd50:  parseInt(contagem['50'])  || 0,
            qtd20:  parseInt(contagem['20'])  || 0,
            qtd10:  parseInt(contagem['10'])  || 0,
            qtd5:   parseInt(contagem['5'])   || 0,
            qtd2:   parseInt(contagem['2'])   || 0,
            qtd1:   parseInt(contagem['1'])   || 0,
            qtd050: parseInt(contagem['0.50']) || 0,
            qtd025: parseInt(contagem['0.25']) || 0,
            qtd010: parseInt(contagem['0.10']) || 0,
            qtd005: parseInt(contagem['0.05']) || 0,
            observacoes: obs
        };
        try {
            if (tipo === 'ABRIR') await caixaApi.abrir(payload);
            else await caixaApi.fechar(payload);
            onSuccess();
            onClose();
        } catch (e) {
            alert("Erro ao salvar contagem do caixa.");
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (tipo === 'FECHAR' && total !== parseFloat(saldoEsperado.toFixed(2))) {
            setEtapa('JUSTIFICATIVA');
        } else {
            enviarFechamento();
        }
    }

    return (
        <div className={styles.backdrop}>
            <form className={styles.modal} onSubmit={handleSubmit} style={{maxWidth: '650px'}}>
                <h3>{etapa === 'CONTAGEM' ? 'Conferência de Fechamento' : 'Divergência Detectada'}</h3>

                {etapa === 'JUSTIFICATIVA' ? (
                    <div style={{padding: '20px', border: '1px solid var(--red)', borderRadius: '8px'}}>
                        <p style={{color: 'var(--red)', marginBottom: '0.5rem'}}>
                            Divergência detectada!
                        </p>
                        <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                            <div>
                                <small style={{color: 'var(--text-2)'}}>Esperado pelo sistema</small>
                                <p style={{fontWeight: 'bold'}}>
                                    R$ {saldoEsperado.toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                            <div>
                                <small style={{color: 'var(--text-2)'}}>Valor contado</small>
                                <p style={{fontWeight: 'bold'}}>
                                    R$ {total.toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                            <div>
                                <small style={{color: 'var(--text-2)'}}>Diferença</small>
                                <p style={{
                                    fontWeight: 'bold',
                                    color: (total - saldoEsperado) >= 0 ? 'var(--success)' : 'var(--red)'
                                }}>
                                    R$ {(total - saldoEsperado).toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                        </div>
                        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                            Motivo da divergência <span style={{color: 'var(--red)'}}>*</span>
                        </label>
                        <textarea
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            required
                            minLength={5}
                            placeholder="Descreva o motivo da divergência (obrigatório)..."
                            style={{width: '100%', minHeight: '80px', display: 'block', margin: '0 0 1rem 0'}}
                            className={styles.input}
                        />
                        <div className={styles.modalActions}>
                            <button type="button" className={styles.btnGhost} onClick={() => setEtapa('CONTAGEM')}>
                                ← Voltar e recontar
                            </button>
                            <button
                                type="button"
                                className={styles.btnDanger}
                                disabled={observacao.trim().length < 10}
                                onClick={() => enviarFechamento(observacao)}
                            >
                                Confirmar mesmo assim
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={styles.calculadoraGrid}>
                            <div>
                                <h4 className={styles.calculadoraTitle}>Cédulas</h4>
                                <div className={styles.moedasContainer}>
                                    {notas.map(n => (
                                        <div key={n} className={styles.notaRow}>
                                            <label>R$ {n},00</label>
                                            <input className={styles.inputNota} type="number" min="0" placeholder="0"
                                                   value={contagem[n] || ''}
                                                   onChange={e => setContagem({...contagem, [n]: e.target.value})}/>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className={styles.calculadoraTitle}>Moedas</h4>
                                <div className={styles.moedasContainer}>
                                    {moedas.map(m => (
                                        <div key={m} className={styles.notaRow}>
                                            <label>R$ {parseFloat(m).toFixed(2).replace('.', ',')}</label>
                                            <input className={styles.inputNota} type="number" min="0" placeholder="0"
                                                   value={contagem[m] || ''}
                                                   onChange={e => setContagem({...contagem, [m]: e.target.value})}/>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={styles.totalCalculadoBox}>
                            <span>Total Contabilizado:</span>
                            <h2>R$ {total.toFixed(2).replace('.', ',')}</h2>
                        </div>

                        <div className={styles.modalActions}>
                            <button type="button" className={styles.btnGhost} onClick={onClose}>Cancelar</button>
                            <button type="submit" className={styles.btnPrimary}>Confirmar</button>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
}

function ModalMovimentacao({tipo, onClose, onSuccess}: {
    tipo: 'SUPRIMENTO' | 'SANGRIA',
    onClose: () => void,
    onSuccess: () => void
}) {
    const [valor, setValor] = useState('');
    const [motivo, setMotivo] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSalvar(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await caixaApi.movimentar(tipo, parseFloat(valor.replace(',', '.')), motivo);
            onSuccess();
            onClose();
        } catch (error) {
            alert('Erro ao registrar movimentação.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.backdrop}>
            <form className={styles.modal} onSubmit={handleSalvar}>
                <h3 style={{color: tipo === 'SUPRIMENTO' ? 'var(--success)' : 'var(--warning)'}}>
                    {tipo === 'SUPRIMENTO' ? 'Nova Entrada (Suprimento)' : 'Nova Retirada (Sangria)'}
                </h3>
                <div className={styles.formGrid}>
                    <div>
                        <label>Valor (R$)</label>
                        <input type="number" step="0.01" min="0.01" required className={styles.input} value={valor}
                               onChange={e => setValor(e.target.value)} placeholder="0.00"/>
                    </div>
                    <div>
                        <label>Motivo</label>
                        <input type="text" required className={styles.input} value={motivo}
                               onChange={e => setMotivo(e.target.value)} placeholder="Justificativa..."/>
                    </div>
                    <div className={styles.modalActions}>
                        <button type="button" className={styles.btnGhost} onClick={onClose}>Cancelar</button>
                        <button type="submit"
                                className={tipo === 'SUPRIMENTO' ? styles.btnSuprimento : styles.btnSangria}
                                disabled={loading}>Confirmar
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

function ModalRelatorio({
                            sessaoId, onClose
                        }: {
    sessaoId: number, onClose
        :
        () => void
}) {
    const [relatorio, setRelatorio] = useState<any>(null);

    useEffect(() => {
        caixaApi.gerarRelatorio(sessaoId).then(setRelatorio);
    }, [sessaoId]);

    const formatarVal = (val: any) => new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(Number(val) || 0);

    if (!relatorio) return <div className={styles.backdrop}>
        <div className={styles.modal}>Carregando relatório...</div>
    </div>;

    const diferenca = Number(relatorio.diferencaCaixa) || 0;
    const corDiferenca = diferenca > 0 ? 'var(--success)' : diferenca < 0 ? 'var(--red)' : 'var(--text)';

    return (
        <div className={styles.backdrop}>
            <div className={styles.modal} style={{maxWidth: '500px'}}>
                <h3 style={{color: 'var(--text)'}}>Relatório do Turno #{sessaoId}</h3>

                <div className={styles.relatorioBody}
                     style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text)'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span>Vendas em Dinheiro:</span>
                        <b>{formatarVal(relatorio.totalDinheiroVendas)}</b></div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span>PIX Recebido:</span>
                        <b>{formatarVal(relatorio.totalPix)}</b></div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span>Cartão Débito:</span>
                        <b>{formatarVal(relatorio.totalDebito)}</b></div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span>Cartão Crédito:</span>
                        <b>{formatarVal(relatorio.totalCredito)}</b></div>

                    <hr style={{ width: '100%', border: '0.5px solid var(--border)' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span>Total Geral:</span>
                        <b>
                            {formatarVal(
                                relatorio.totalDinheiroVendas +
                                relatorio.totalPix +
                                relatorio.totalDebito +
                                relatorio.totalCredito
                            )}
                        </b>
                    </div>

                    {/* 🐛 CORRIGIDO: Removido o background #f7fafc (branco) e substituido por var(--bg-2) (fundo secundário escuro) */}
                    <div style={{
                        marginTop: '1rem',
                        background: 'var(--bg-2)',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                            <span>Fundo Inicial (Caixa):</span> <b>{formatarVal(relatorio.saldoInicial)}</b>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.5rem',
                            color: 'var(--success)'
                        }}>
                            <span>(+) Suprimentos:</span> <b>{formatarVal(relatorio.totalSuprimentos)}</b>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.5rem',
                            color: 'var(--warning)'
                        }}>
                            <span>(-) Sangrias:</span> <b>{formatarVal(relatorio.totalSangrias)}</b>
                        </div>

                        <hr style={{border: '0', borderTop: '1px solid var(--border)', margin: '10px 0'}}/>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.5rem',
                            color: 'var(--text-2)'
                        }}>
                            <span>Saldo Esperado (Sistema):</span>
                            <b>{formatarVal(relatorio.saldoEsperadoDinheiro)}</b>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                            <span>Fundo Final (Contado):</span> <b>{formatarVal(relatorio.saldoDinheiroContado)}</b>
                        </div>

                        <hr style={{border: '0', borderTop: '1px solid var(--border)', margin: '10px 0'}}/>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            color: corDiferenca
                        }}>
                            <span>Diferença de Caixa:</span> <span>{formatarVal(diferenca)}</span>
                        </div>
                    </div>
                </div>
                <div style={{marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end'}}>
                    <button className={styles.btnPrimary} onClick={onClose}>Fechar</button>
                </div>
            </div>
        </div>
    );
}