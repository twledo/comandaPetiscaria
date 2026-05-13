import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Comanda, ItemPedido } from '../../types';
import type { PagamentoItensDTO } from './divisaoTypes';
import styles from './DivisaoContaModal.module.css';
import { comandasApi, dominiosApi } from "../../../api";
import type { Opcao } from "../../../api";

type Tab = 'itens' | 'igual' | 'valor';
type Estado = 'idle' | 'loading' | 'success' | 'error';
interface CustomPerson { id: number; nome: string; valor: string; pago: boolean; }

// Função utilitária básica
const precoUnitEfetivo = (item: ItemPedido): number => {
    const u = Number(item.precoUnitario);
    return item.meiaPorcao ? u * 0.6 : u;
};

// Componente para renderizar o preço com as classes do CSS
const RenderPrice = ({ value }: { value: number }) => {
    const parts = value.toFixed(2).split('.');
    return (
        <span className={styles.currencyWrapper}>
            <span className={styles.currencySymbol}>R$</span>
            <span className={styles.currencyInteger}>{parts[0]}</span>
            <span className={styles.currencyDecimal}>,{parts[1]}</span>
        </span>
    );
};

interface Props {
    comanda: Comanda;
    onClose: () => void;
    onSuccess: (comandaAtualizada: Comanda) => void;
}

export default function DivisaoContaModal({ comanda, onClose, onSuccess }: Props) {
    const total = Number(comanda.total);
    const itens: ItemPedido[] = comanda.itens ?? [];

    const [tab, setTab] = useState<Tab>('itens');
    const [estado, setEstado] = useState<Estado>('idle');
    const [erro, setErro] = useState<string | null>(null);

    // Validação Dupla
    const [duplaValidacao, setDuplaValidacao] = useState<boolean>(false);
    useEffect(() => setDuplaValidacao(false), [tab]);

    // ── Domínios Dinâmicos ───────────────────────────────────────────
    const [metodosDisp, setMetodosDisp] = useState<Opcao[]>([]);

    useEffect(() => {
        dominiosApi.buscarTodos()
            .then(res => setMetodosDisp(res.metodosPagamento))
            .catch(console.error);
    }, []);

    // ── aba "por itens" ──────────────────────────────────────────────
    const [qtdSel, setQtdSel] = useState<Map<number, number>>(new Map());
    const [conferidos, setConferidos] = useState<Set<number>>(new Set());
    const [metodoItens, setMetodoItens] = useState<string>('PIX');

    const getQtd = (id: number) => qtdSel.get(id) ?? 0;

    const setQtd = (id: number, val: number, max: number) => {
        const clamped = Math.max(0, Math.min(max, Math.round(val)));
        setQtdSel(prev => {
            const next = new Map(prev);
            clamped === 0 ? next.delete(id) : next.set(id, clamped);
            return next;
        });
        if (clamped === 0) toggleConferido(id, false);
    };

    const toggleLinha = (id: number, max: number) => {
        const sel = getQtd(id) > 0;
        setQtd(id, sel ? 0 : max, max);
    };

    const toggleConferido = (id: number, force?: boolean) => {
        setConferidos(prev => {
            const next = new Set(prev);
            const acao = force !== undefined ? force : !next.has(id);
            acao ? next.add(id) : next.delete(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (qtdSel.size === itens.length) {
            setQtdSel(new Map());
            setConferidos(new Set());
            return;
        }
        const novoMap = new Map<number, number>();
        itens.forEach(item => novoMap.set(item.id!, Number(item.quantidade)));
        setQtdSel(novoMap);
    };

    const subtotalItens = useMemo(() => {
        let s = 0;
        qtdSel.forEach((qtd, id) => {
            const item = itens.find(i => i.id === id);
            if (item) s += precoUnitEfetivo(item) * qtd;
        });
        return s;
    }, [qtdSel, itens]);

    const algumSelecionado = qtdSel.size > 0;
    const todosConferidos = useMemo(() => {
        if (qtdSel.size === 0) return false;
        return Array.from(qtdSel.keys()).every(id => conferidos.has(id));
    }, [qtdSel, conferidos]);

    // ── aba igualitária ──────────────────────────────────────────────
    const [numPessoas, setNumPessoas] = useState(2);
    const [metodoIgual, setMetodoIgual] = useState<string>('PIX');
    const [pagosIgual, setPagosIgual] = useState<Set<number>>(new Set());

    const valorPorPessoa = useMemo(
        () => Math.round((total / numPessoas) * 100) / 100,
        [total, numPessoas]
    );

    const alterarNumPessoas = (val: number) => {
        const clamped = Math.max(2, Math.min(20, val));
        setNumPessoas(clamped);
        setPagosIgual(prev => {
            const next = new Set(prev);
            for (let i = clamped; i < 20; i++) next.delete(i);
            return next;
        });
    };

    const togglePagoIgual = (index: number) => {
        setPagosIgual(prev => {
            const next = new Set(prev);
            next.has(index) ? next.delete(index) : next.add(index);
            return next;
        });
    };

    const todosPagosIgual = Array.from({ length: numPessoas }).every((_, i) => pagosIgual.has(i));

    // ── aba valor livre ──────────────────────────────────────────────
    const [persons, setPersons] = useState<CustomPerson[]>([
        { id: 1, nome: '', valor: '', pago: false },
        { id: 2, nome: '', valor: '', pago: false },
    ]);
    const [metodoValor, setMetodoValor] = useState<string>('PIX');

    const somaPersons = useMemo(() => {
        return persons.reduce((s, p) => {
            const val = parseFloat(String(p.valor).replace(',', '.'));
            return s + (isNaN(val) ? 0 : val);
        }, 0);
    }, [persons]);

    const restante = Math.round((total - somaPersons) * 100) / 100;
    const zerado = Math.abs(restante) < 0.02;
    const excedido = restante < -0.02;
    const percentualBarra = Math.min(100, (somaPersons / total) * 100);

    const todosPagosLivre = persons.length >= 2 && persons.every(p => p.pago) && zerado;

    const addPerson = () => setPersons(prev => [...prev, { id: Date.now(), nome: '', valor: '', pago: false }]);
    const removePerson = (id: number) => setPersons(prev => prev.filter(p => p.id !== id));
    const updatePerson = (id: number, field: 'nome' | 'valor', value: string) =>
        setPersons(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    const togglePagoLivre = (id: number) =>
        setPersons(prev => prev.map(p => p.id === id ? { ...p, pago: !p.pago } : p));

    // ── API ─────────────────────────────────────────────────────────
    const executarDivisao = useCallback(async (body: any) => {
        setEstado('loading');
        setErro(null);
        try {
            const data = await comandasApi.dividirConta(comanda.id, body);
            setEstado('success');

            setTimeout(() => {
                onSuccess(data);

                if (data.status === 'FINALIZADA') {
                    onClose();
                } else {
                    setEstado('idle');
                    setPagosIgual(new Set());
                }
            }, 1500);

        } catch (e: any) {
            setEstado('error');
            setErro(e.message || 'Erro inesperado');
        }
    }, [comanda.id, onClose, onSuccess]);

    const confirmarItens = async () => {
        const body: PagamentoItensDTO = {
            itens: Array.from(qtdSel.entries()).map(([itemId, quantidadePagar]) => ({ itemId, quantidadePagar })),
            metodoPagamento: metodoItens
        };

        setEstado('loading');

        try {
            const data = await comandasApi.pagarItens(comanda.id, body);
            setEstado('success');

            setTimeout(() => {
                onSuccess(data);

                if (data.status === 'FINALIZADA' || !data.itens || data.itens.length === 0) {
                    onClose();
                } else {
                    setEstado('idle');
                    setQtdSel(new Map());
                    setConferidos(new Set());
                }
            }, 1500);

        } catch (e: any) {
            setEstado('error');
            setErro(e.message);
        }
    };

    // ── LÓGICA DE VALIDAÇÃO DUPLA ──
    const lidarComCliqueBotao = (acaoFinal: () => void) => {
        if (!duplaValidacao) {
            setDuplaValidacao(true);
            setTimeout(() => setDuplaValidacao(false), 2500);
        } else {
            acaoFinal();
            setDuplaValidacao(false);
        }
    };

    const renderBody = () => {
        if (estado === 'loading') return (
            <div className={styles.loadingOverlay}>
                <div className={styles.spinner} />
                <span className={styles.loadingText}>Processando pagamento...</span>
            </div>
        );

        if (estado === 'success') return (
            <div className={styles.successBox}>
                <div className={styles.successIcon}>✓</div>
                <h3 className={styles.successTitle}>Pagamento registrado!</h3>
                <p className={styles.successSub}>A comanda foi atualizada com sucesso.</p>
            </div>
        );

        return (
            <div className={styles.body}>
                {/* ─── ABA ITENS ─────────────────────────────────────────── */}
                {tab === 'itens' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', }}>
                            <span className={styles.hint} style={{ margin: 0 }}>Clique no check (✓) para confirmar o pagamento.</span>

                            <button type="button" className={styles.addPersonBtn} style={{ width: 'auto', padding: '0.4rem 0.8rem', margin: 0 }} onClick={handleSelectAll}>
                                {qtdSel.size === itens.length ? 'Desmarcar Todos' : 'Selecionar Tudo'}
                            </button>
                        </div>

                        <div className={styles.itemsList}>
                            {itens.map(item => {
                                const max = Number(item.quantidade);
                                const id = item.id!;
                                const qtd = getQtd(id);
                                const sel = qtd > 0;
                                const prU = precoUnitEfetivo(item);
                                const conferido = conferidos.has(id);

                                return (
                                    <div key={id} className={`${styles.itemRow} ${sel ? styles.itemRowSelected : ''}`}>
                                        <div className={`${styles.checkBox} ${sel ? styles.checkBoxChecked : ''}`} onClick={() => toggleLinha(id, max)}>
                                            {sel && '✓'}
                                        </div>

                                        <div className={styles.itemInfo} onClick={() => toggleLinha(id, max)}>
                                            <div className={styles.itemName}>
                                                {item.nomeProduto} {item.meiaPorcao && ' (½)'}
                                            </div>
                                            <div className={styles.itemQty}>
                                                <RenderPrice value={prU} /> / un · {max} disp.
                                            </div>
                                        </div>

                                        {sel && (
                                            <button type="button" className={`${styles.checkBox} ${conferido ? styles.checkBoxChecked : ''}`} style={{ borderRadius: '50%' }} onClick={(e) => { e.stopPropagation(); toggleConferido(id); }}>
                                                asdsa{conferido ? '✓' : ''}
                                            </button>
                                        )}

                                        {sel && max > 1 ? (
                                            <div className={styles.qtdControls} onClick={e => e.stopPropagation()}>
                                                <button className={styles.qtdBtn} onClick={() => setQtd(id, qtd - 1, max)}>−</button>
                                                <span className={styles.qtdNum}>{qtd}</span>
                                                <button className={styles.qtdBtn} onClick={() => setQtd(id, qtd + 1, max)} disabled={qtd >= max}>+</button>
                                            </div>
                                        ) : (
                                            <div className={styles.itemPrice} onClick={() => toggleLinha(id, max)}>
                                                <RenderPrice value={sel ? prU * qtd : max * prU} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.subtotalBox}>
                            <span className={styles.subtotalLabel}>Subtotal selecionado</span>
                            <span className={styles.subtotalValue}><RenderPrice value={subtotalItens} /></span>
                        </div>

                        <MetodoGrid value={metodoItens} onChange={setMetodoItens} opcoes={metodosDisp} />

                        <button
                            className={styles.confirmBtn}
                            disabled={!algumSelecionado || !todosConferidos}
                            onClick={() => lidarComCliqueBotao(confirmarItens)}
                            style={duplaValidacao ? { backgroundColor: 'var(--accent)' } : {}}
                        >
                            {!todosConferidos && algumSelecionado
                                ? '📑 Marque o visto (✓) nos itens'
                                : duplaValidacao ? '⚠ Confirmar pagamento?' : 'Confirmar selecionados'}
                        </button>
                    </>
                )}

                {/* ─── ABA IGUALITÁRIO ───────────────────────────────────── */}
                {tab === 'igual' && (
                    <>
                        <p className={styles.hint}>Marque o check (✓) de quem já pagou sua parte.</p>

                        <div className={styles.counterBox}>
                            <span className={styles.counterLabel}>Número de pessoas na divisão</span>
                            <div className={styles.bigCounter}>
                                <button className={styles.counterBtn} onClick={() => alterarNumPessoas(numPessoas - 1)}>−</button>
                                <span className={styles.counterValue}>{numPessoas}</span>
                                <button className={styles.counterBtn} onClick={() => alterarNumPessoas(numPessoas + 1)}>+</button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                            {Array.from({ length: numPessoas }, (_, i) => {
                                const pago = pagosIgual.has(i);
                                return (
                                    <div
                                        key={i}
                                        className={`${styles.eqPersonCard} ${pago ? styles.itemRowSelected : ''}`}
                                        onClick={() => togglePagoIgual(i)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '0.75rem', background: 'var(--bg-2)', border: '1px solid var(--border)',
                                            borderRadius: '10px', cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div className={`${styles.checkBox} ${pago ? styles.checkBoxChecked : ''}`} style={{ borderRadius: '50%' }}>
                                                {pago ? '✓' : ''}
                                            </div>
                                            <span style={{ fontSize: '0.85rem', color: pago ? 'var(--text)' : 'var(--text-2)' }}>Pessoa {i + 1}</span>
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                                            <RenderPrice value={valorPorPessoa} />
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <MetodoGrid value={metodoIgual} onChange={setMetodoIgual} opcoes={metodosDisp} />

                        <button
                            className={styles.confirmBtn}
                            disabled={!todosPagosIgual}
                            onClick={() => lidarComCliqueBotao(() => executarDivisao({
                                modalidade: 'IGUALITARIO',
                                numeroPessoas: numPessoas,
                                metodoPagamento: metodoIgual
                            }))}
                            style={duplaValidacao ? { backgroundColor: 'var(--accent)' } : {}}
                        >
                            {!todosPagosIgual
                                ? 'Marque todos como pagos (✓)'
                                : duplaValidacao ? '⚠ Confirmar divisão?' : 'Confirmar Divisão Igualitária'}
                        </button>
                    </>
                )}

                {/* ─── ABA VALOR LIVRE ───────────────────────────────────── */}
                {tab === 'valor' && (
                    <>
                        <p className={styles.hint}>Defina o valor e marque o check (✓) de quem já pagou sua parte.</p>

                        <div className={styles.customRows}>
                            {persons.map(p => {
                                return (
                                    <div key={p.id} className={`${styles.customPersonRow} ${p.pago ? styles.itemRowSelected : ''}`} style={{ padding: '0.25rem', borderRadius: '10px', transition: 'all 0.2s', background: p.pago ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'transparent' }}>
                                        <div
                                            className={`${styles.checkBox} ${p.pago ? styles.checkBoxChecked : ''}`}
                                            style={{ borderRadius: '50%', cursor: 'pointer', margin: '0 0.25rem' }}
                                            onClick={() => togglePagoLivre(p.id)}
                                        >
                                            {p.pago ? '✓' : ''}
                                        </div>

                                        <input className={styles.personNameInput} type="text" placeholder="Nome (opcional)" value={p.nome} onChange={e => updatePerson(p.id, 'nome', e.target.value)} />
                                        <input className={styles.personAmountInput} type="number" min={0} step={0.01} placeholder="R$ 0,00" value={p.valor} onChange={e => updatePerson(p.id, 'valor', e.target.value)} />

                                        {persons.length > 2 && (
                                            <button className={styles.removeBtn} onClick={() => removePerson(p.id)}>✕</button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button className={styles.addPersonBtn} onClick={addPerson}>+ Adicionar Pagador</button>

                        <div className={styles.meter}>
                            <div className={`${styles.meterFill} ${excedido ? styles.meterOver : ''}`} style={{ width: `${percentualBarra}%` }} />
                        </div>

                        <div className={styles.remainderBar}>
                            <span className={styles.remainderLabel}>Status da soma:</span>
                            <span className={`${styles.remainderValue} ${zerado ? styles.remainderOk : excedido ? styles.remainderOver : ''}`}>
                                {zerado ? '✅ Conta Fechada' : excedido ? '⚠️ Excedeu ' : 'Falta '}
                                {!zerado && <RenderPrice value={Math.abs(restante)} />}
                            </span>
                        </div>

                        <MetodoGrid value={metodoValor} onChange={setMetodoValor} opcoes={metodosDisp} />

                        <button
                            className={styles.confirmBtn}
                            disabled={!todosPagosLivre}
                            onClick={() => lidarComCliqueBotao(() => executarDivisao({
                                modalidade: 'VALOR_LIVRE',
                                parcelas: persons.map(p => ({
                                    nomePessoa: p.nome,
                                    valor: parseFloat(String(p.valor).replace(',', '.')) || 0
                                })),
                                metodoPagamento: metodoValor
                            }))}
                            style={duplaValidacao ? { backgroundColor: 'var(--accent)' } : {}}
                        >
                            {!zerado
                                ? 'Ajuste os valores para fechar'
                                : (!todosPagosLivre)
                                    ? 'Marque todos como pagos (✓)'
                                    : duplaValidacao ? '⚠ Confirmar pagamentos?' : 'Confirmar Valores Livres'}
                        </button>
                    </>
                )}
            </div>
        );
    };

    return (
        <div
            className={styles.overlay}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className={styles.modal}>
                {/* --- FIXED HEADER (Always accessible) --- */}
                <header className={styles.header}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className={styles.headerInfo}>
                            <h2 className={styles.title}>Divisão de Conta</h2>
                            <p className={styles.subtitle}>
                                Mesa {comanda.mesa?.numero} — Comanda #{comanda.id}
                            </p>
                        </div>
                        <button
                            type="button"
                            className={styles.closeBtn}
                            onClick={onClose}
                            aria-label="Fechar modal"
                        >
                            ✕
                        </button>
                    </div>
                </header>

                {/* --- TOTAL DISPLAY --- */}
                <div className={styles.totalBar}>
                    <span className={styles.totalLabel}>Total da Comanda</span>
                    <span className={styles.totalValue}>
                        <RenderPrice value={total} />
                    </span>
                </div>

                {/* --- NAVIGATION TABS --- */}
                {estado === 'idle' && (
                    <div style={{ padding: '0 1.25rem', marginTop: '1rem' }}>
                        <div className={styles.tabs}>
                            {(['itens', 'igual', 'valor'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                                    onClick={() => setTab(t)}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- DYNAMIC CONTENT --- */}
                {renderBody()}

                {/* --- ERROR FOOTER --- */}
                {estado === 'error' && erro && (
                    <div style={{ padding: '1rem' }}>
                        <div className={styles.errorMsg}>⚠ {erro}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Componente usando o CSS de Grid para os Métodos de Pagamento ───
function MetodoGrid({ value, onChange, opcoes }: { value: string, onChange: (val: string) => void, opcoes: Opcao[] }) {
    return (
        <div className={styles.methodRow}>
            <span className={styles.methodLabel}>Forma de Pagamento Base</span>
            <div className={styles.metodoGrid}>
                {opcoes.map(m => (
                    <button
                        key={String(m.value)}
                        type="button"
                        className={`${styles.metodoBtn} ${value === String(m.value) ? styles.metodoActive : ''}`}
                        onClick={() => onChange(String(m.value))}
                    >
                        {m.label}
                    </button>
                ))}
            </div>
        </div>
    );
}