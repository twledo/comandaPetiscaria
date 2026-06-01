import React, {useState, useMemo, useCallback, useEffect} from 'react';
import type {Comanda, ItemPedido} from '../../types';
import styles from './DivisaoContaModal.module.css';
import {comandasApi, dominiosApi} from "../../../api";
import type {Opcao} from "../../../api";

type Tab = 'itens' | 'igual' | 'valor';
type Estado = 'idle' | 'loading' | 'success' | 'error';

interface CustomPerson {
    id: number;
    nome: string;
    valor: string;
    valorEntregue: string;
    pago: boolean;
    metodo: string;
}

interface PessoaIgual {
    pago: boolean;
    metodo: string;
}

const precoUnitEfetivo = (item: ItemPedido): number => {
    const u = Number(item.precoUnitario);
    return item.meiaPorcao ? u * 0.6 : u;
};

const RenderPrice = ({value}: { value: number }) => {
    const parts = value.toFixed(2).split('.');
    return (
        <span className={styles.currencyWrapper}>
            <span className={styles.currencySymbol}>R$</span>
            <span className={styles.currencyInteger}>{parts[0]}</span>
            <span className={styles.currencyDecimal}>,{parts[1]}</span>
        </span>
    );
};

const MetodoSelector = ({value, onChange, opcoes}: {
    value: string,
    onChange: (val: string) => void,
    opcoes: Opcao[]
}) => (
    <select
        className={styles.compactMethodSelect}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
    >
        {opcoes.map(m => (
            <option key={String(m.value)} value={String(m.value)}>{m.label}</option>
        ))}
    </select>
);

interface Props {
    comanda: Comanda;
    onClose: () => void;
    onSuccess: (comandaAtualizada: Comanda) => void;
}

export default function DivisaoContaModal({comanda, onClose, onSuccess}: Props) {
    const total = Number(comanda.total);

    const itens: ItemPedido[] = useMemo(() => {
        if (!comanda?.pedidos) return [];
        return comanda.pedidos
            .filter((pedido: any) => pedido.status !== 'CANCELADO')
            .flatMap((pedido: any) => pedido.itens || []);
    }, [comanda]);

    const [tab, setTab] = useState<Tab>('itens');
    const [estado, setEstado] = useState<Estado>('idle');
    const [erro, setErro] = useState<string | null>(null);

    const [filaTroco, setFilaTroco] = useState<any[]>([]);
    const [payloadPendente, setPayloadPendente] = useState<any>(null);
    const [funcaoExecucao, setFuncaoExecucao] = useState<((payload: any) => Promise<void>) | null>(null);

    const [duplaValidacao, setDuplaValidacao] = useState<boolean>(false);
    useEffect(() => setDuplaValidacao(false), [tab]);

    const [metodosDisp, setMetodosDisp] = useState<Opcao[]>([]);

    useEffect(() => {
        dominiosApi.buscarTodos()
            .then(res => setMetodosDisp(res.metodosPagamento))
            .catch(console.error);
    }, []);

    const defaultMetodo = metodosDisp.length > 0 ? String(metodosDisp[0].value) : 'PIX';

    // ── aba "por itens" ──────────────────────────────────────────────
    const [qtdSel, setQtdSel] = useState<Map<number, number>>(new Map());
    const [metodosItens, setMetodosItens] = useState<Map<number, string>>(new Map());

    const getQtd = (id: number) => qtdSel.get(id) ?? 0;
    const getMetodoItem = (id: number) => metodosItens.get(id) || defaultMetodo;

    const setQtd = (id: number, val: number, max: number) => {
        const clamped = Math.max(0, Math.min(max, Math.round(val)));
        setQtdSel(prev => {
            const next = new Map(prev);
            clamped === 0 ? next.delete(id) : next.set(id, clamped);
            return next;
        });
        if (clamped !== 0) {
            setMetodosItens(prev => prev.has(id) ? prev : new Map(prev).set(id, defaultMetodo));
        }
    };

    const iniciarProcessoPagamento = (payload: any, funcaoApi: (body: any) => Promise<void>) => {
        let pagamentosNaFila: any[] = [];

        if (payload.parcelas) {
            pagamentosNaFila = payload.parcelas
                .map((p: any, index: number) => ({
                    ...p,
                    originalIndex: index,
                    tipo: 'parcela',
                    nomeCalculado: p.nomePessoa || `Pagador ${index + 1}`
                }))
                .filter((p: any) => p.metodoPagamento === 'DINHEIRO');
        } else if (payload.itens) {
            const itensDinheiro = payload.itens
                .map((i: any, index: number) => ({ ...i, originalIndex: index }))
                .filter((i: any) => i.metodoPagamento === 'DINHEIRO');

            if (itensDinheiro.length > 0) {
                let valorTotalGrupo = 0;
                const resumo: string[] = [];

                itensDinheiro.forEach((item: any) => {
                    const itemBanco = itens.find(i => i.id === item.itemId);
                    const precoOriginal = itemBanco ? precoUnitEfetivo(itemBanco) : 0;
                    const valorDesteItem = precoOriginal * item.quantidadePagar;
                    valorTotalGrupo += valorDesteItem;

                    if (itemBanco) {
                        resumo.push(`${item.quantidadePagar}x ${itemBanco.nomeProduto} — R$ ${valorDesteItem.toFixed(2).replace('.', ',')}`);
                    }
                });

                pagamentosNaFila.push({
                    tipo: 'grupo_itens',
                    indices: itensDinheiro.map((i: any) => i.originalIndex),
                    valorTotal: valorTotalGrupo,
                    resumoItens: resumo,
                    nomeCalculado: 'Pagamento Múltiplo'
                });
            }
        }

        if (pagamentosNaFila.length > 0) {
            setPayloadPendente(payload);
            setFuncaoExecucao(() => funcaoApi);
            setFilaTroco(pagamentosNaFila);
        } else {
            funcaoApi(payload);
        }
    };

    const handleConfirmarTroco = (valorEntregue: number) => {
        const itemAtual = filaTroco[0];
        const novoPayload = { ...payloadPendente };

        if (itemAtual.tipo === 'parcela') {
            novoPayload.parcelas[itemAtual.originalIndex].valorEntregue = valorEntregue;
        } else if (itemAtual.tipo === 'grupo_itens') {
            const trocoTotal = valorEntregue - itemAtual.valorTotal;

            itemAtual.indices.forEach((originalIdx: number, idx: number) => {
                const iDto = novoPayload.itens[originalIdx];
                const itemBanco = itens.find(i => i.id === iDto.itemId);
                const precoOriginal = itemBanco ? precoUnitEfetivo(itemBanco) : 0;
                const valorDesteItem = precoOriginal * iDto.quantidadePagar;

                if (idx === 0) {
                    iDto.valorEntregue = valorDesteItem + trocoTotal;
                } else {
                    iDto.valorEntregue = valorDesteItem;
                }
            });
        }

        const novaFila = filaTroco.slice(1);
        setFilaTroco(novaFila);
        setPayloadPendente(novoPayload);

        if (novaFila.length === 0 && funcaoExecucao) {
            funcaoExecucao(novoPayload);
            setPayloadPendente(null);
            setFuncaoExecucao(null);
        }
    };

    const updateMetodoItem = (id: number, metodo: string) => {
        setMetodosItens(prev => new Map(prev).set(id, metodo));
    };

    const toggleLinha = (id: number, max: number) => {
        const sel = getQtd(id) > 0;
        setQtd(id, sel ? 0 : max, max);
    };

    const handleSelectAll = () => {
        if (qtdSel.size === itens.length) {
            setQtdSel(new Map());
            return;
        }
        const novoMap = new Map<number, number>();
        const novoMetodos = new Map<number, string>();
        itens.forEach(item => {
            novoMap.set(item.id!, Number(item.quantidade));
            novoMetodos.set(item.id!, defaultMetodo);
        });
        setQtdSel(novoMap);
        setMetodosItens(novoMetodos);
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

    // ── aba igualitária ──────────────────────────────────────────────
    const [numPessoas, setNumPessoas] = useState(2);
    const [pessoasIgual, setPessoasIgual] = useState<PessoaIgual[]>([
        {pago: false, metodo: 'PIX'},
        {pago: false, metodo: 'PIX'}
    ]);

    const valorPorPessoa = useMemo(() => Math.round((total / numPessoas) * 100) / 100, [total, numPessoas]);

    const alterarNumPessoas = (val: number) => {
        const clamped = Math.max(2, Math.min(20, val));
        setNumPessoas(clamped);
        setPessoasIgual(prev => {
            const next = [...prev];
            if (clamped > next.length) {
                while (next.length < clamped) next.push({pago: false, metodo: defaultMetodo});
            } else {
                next.splice(clamped);
            }
            return next;
        });
    };

    const togglePagoIgual = (index: number) => {
        setPessoasIgual(prev => {
            const next = [...prev];
            next[index] = {...next[index], pago: !next[index].pago};
            return next;
        });
    };

    const updateMetodoIgual = (index: number, metodo: string) => {
        setPessoasIgual(prev => {
            const next = [...prev];
            next[index] = {...next[index], metodo};
            return next;
        });
    };

    const todosPagosIgual = pessoasIgual.every(p => p.pago);

    // ── aba valor livre ──────────────────────────────────────────────
    const [persons, setPersons] = useState<CustomPerson[]>([
        {id: 1, nome: '', valor: '', valorEntregue: '', pago: false, metodo: 'PIX'},
        {id: 2, nome: '', valor: '', valorEntregue: '', pago: false, metodo: 'PIX'},
    ]);

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

    const addPerson = () => setPersons(prev => [...prev, {
        id: Date.now(),
        nome: '',
        valor: '',
        valorEntregue: '',
        pago: false,
        metodo: defaultMetodo
    }]);
    const removePerson = (id: number) => setPersons(prev => prev.filter(p => p.id !== id));
    const updatePerson = (id: number, field: keyof CustomPerson, value: string) =>
        setPersons(prev => prev.map(p => p.id === id ? {...p, [field]: value} : p));
    const togglePagoLivre = (id: number) =>
        setPersons(prev => prev.map(p => p.id === id ? {...p, pago: !p.pago} : p));

    // ── REQUISIÇÕES ──
    const executarDivisao = useCallback(async (body: any) => {
        setEstado('loading');
        setErro(null);

        try {
            const data = await comandasApi.dividirConta(comanda.id, body);
            setEstado('success');
            setTimeout(() => {
                onSuccess(data);
                setEstado('idle');
            }, 1500);
        } catch (e: any) {
            setEstado('error');
            setErro(e.message || 'Erro ao processar divisão');
        }
    }, [comanda.id, onSuccess]);

    const confirmarItens = useCallback(async (body: any) => {
        setEstado('loading');
        setErro(null);

        try {
            const data = await comandasApi.pagarItens(comanda.id, body);
            setEstado('success');
            setTimeout(() => {
                onSuccess(data);
                setEstado('idle');
                setQtdSel(new Map());
            }, 1500);
        } catch (e: any) {
            setEstado('error');
            setErro(e.message || 'Erro ao processar itens');
        }
    }, [comanda.id, onSuccess]);

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
                <div className={styles.spinner}/>
                <span className={styles.loadingText}>Processando pagamento...</span>
            </div>
        );

        if (estado === 'success') return (
            <div className={styles.successBox}>
                <div className={styles.successIcon}>✓</div>
                <h3 className={styles.successTitle}>Pagamento registrado!</h3>
            </div>
        );

        return (
            <div className={styles.body} key={tab}>
                {/* ─── ABA ITENS ─────────────────────────────────────────── */}
                {tab === 'itens' && (
                    <>
                        <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center'}}>
                            <button type="button" className={styles.addPersonBtn}
                                    style={{width: 'auto', padding: '0.4rem 0.8rem', margin: 0}}
                                    onClick={handleSelectAll}>
                                {qtdSel.size === itens.length ? 'Desmarcar Todos' : 'Selecionar Tudo'}
                            </button>
                        </div>

                        <div className={styles.itemsList}>
                            {itens.length === 0 ? (
                                <p style={{textAlign: 'center', color: 'var(--text-2)'}}>Nenhum item disponível.</p>
                            ) : (
                                itens.map(item => {
                                    const max = Number(item.quantidade);
                                    const id = item.id!;
                                    const qtd = getQtd(id);
                                    const sel = qtd > 0;
                                    const prU = precoUnitEfetivo(item);

                                    return (
                                        <div key={id}
                                             className={`${styles.itemRow} ${sel ? styles.itemRowSelected : ''}`}>
                                            <div className={`${styles.checkBox} ${sel ? styles.checkBoxChecked : ''}`}
                                                 onClick={() => toggleLinha(id, max)}>
                                                {sel && '✓'}
                                            </div>

                                            <div className={styles.itemInfo} onClick={() => toggleLinha(id, max)}>
                                                <div className={styles.itemName}>
                                                    {item.nomeProduto}
                                                    {item.meiaPorcao && <span className={styles.meiaTag}>Meia</span>}
                                                    {item.observacao && (
                                                        <span style={{
                                                            display: 'block',
                                                            fontSize: '0.75rem',
                                                            color: 'var(--text-3)',
                                                            fontStyle: 'italic',
                                                            marginTop: '2px',
                                                            fontWeight: 'normal'
                                                        }}>
                                                            Obs: {item.observacao}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={styles.itemQty}><RenderPrice value={prU}/> / un</div>
                                            </div>

                                            {sel && (
                                                <>
                                                    <MetodoSelector
                                                        value={getMetodoItem(id)}
                                                        onChange={(v) => updateMetodoItem(id, v)}
                                                        opcoes={metodosDisp}
                                                    />

                                                    <div className={styles.qtdControls}
                                                         onClick={e => e.stopPropagation()}>
                                                        <button className={styles.qtdBtn}
                                                                onClick={() => setQtd(id, qtd - 1, max)}>−
                                                        </button>
                                                        <span className={styles.qtdNum}>{qtd}</span>
                                                        <button className={styles.qtdBtn}
                                                                onClick={() => setQtd(id, qtd + 1, max)}
                                                                disabled={qtd >= max}>+
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className={styles.subtotalBox}>
                            <span className={styles.subtotalLabel}>Subtotal selecionado</span>
                            <span className={styles.subtotalValue}><RenderPrice value={subtotalItens}/></span>
                        </div>

                        <button
                            className={styles.confirmBtn}
                            disabled={!algumSelecionado}
                            onClick={() => lidarComCliqueBotao(() => iniciarProcessoPagamento({
                                itens: Array.from(qtdSel.entries()).map(([itemId, quantidadePagar]) => ({
                                    itemId,
                                    quantidadePagar,
                                    metodoPagamento: getMetodoItem(itemId)
                                }))
                            }, confirmarItens))}
                            style={duplaValidacao ? {backgroundColor: 'var(--accent)'} : {}}
                        >
                            {duplaValidacao ? '⚠ Confirmar pagamento?' : 'Confirmar selecionados'}
                        </button>
                    </>
                )}

                {/* ─── ABA IGUALITÁRIO ───────────────────────────────────── */}
                {tab === 'igual' && (
                    <>
                        <div className={styles.counterBox}>
                            <span className={styles.counterLabel}>Número de pessoas na divisão</span>
                            <div className={styles.bigCounter}>
                                <button className={styles.counterBtn}
                                        onClick={() => alterarNumPessoas(numPessoas - 1)}>−
                                </button>
                                <span className={styles.counterValue}>{numPessoas}</span>
                                <button className={styles.counterBtn}
                                        onClick={() => alterarNumPessoas(numPessoas + 1)}>+
                                </button>
                            </div>
                        </div>

                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem'}}>
                            {pessoasIgual.map((p, i) => (
                                <div key={i}
                                     className={`${styles.eqPersonCard} ${p.pago ? styles.itemRowSelected : ''}`}
                                     onClick={() => togglePagoIgual(i)} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.75rem',
                                    background: 'var(--bg-2)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                        <div className={`${styles.checkBox} ${p.pago ? styles.checkBoxChecked : ''}`}
                                             style={{borderRadius: '50%'}}>
                                            {p.pago ? '✓' : ''}
                                        </div>
                                        <span style={{fontSize: '0.85rem'}}>Pessoa {i + 1}</span>
                                    </div>

                                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                        <MetodoSelector
                                            value={p.metodo}
                                            onChange={(v) => updateMetodoIgual(i, v)}
                                            opcoes={metodosDisp}
                                        />
                                        <span style={{fontSize: '0.85rem', fontWeight: 'bold'}}>
                                            <RenderPrice value={valorPorPessoa}/>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            className={styles.confirmBtn}
                            disabled={!todosPagosIgual}
                            onClick={() => lidarComCliqueBotao(() => iniciarProcessoPagamento({
                                modalidade: 'IGUALITARIO',
                                numeroPessoas: numPessoas,
                                parcelas: pessoasIgual.map((p, i) => ({
                                    nomePessoa: `Pessoa ${i + 1}`,
                                    valor: valorPorPessoa,
                                    metodoPagamento: p.metodo
                                }))
                            }, executarDivisao))}
                            style={duplaValidacao ? {backgroundColor: 'var(--accent)'} : {}}
                        >
                            {!todosPagosIgual ? 'Marque todos como pagos (✓)' : duplaValidacao ? '⚠ Confirmar divisão?' : 'Confirmar Divisão Igualitária'}
                        </button>
                    </>
                )}

                {/* ─── ABA VALOR LIVRE ───────────────────────────────────── */}
                {tab === 'valor' && (
                    <>
                        <div className={styles.customRows}>
                            {persons.map(p => (
                                <div key={p.id}
                                     className={`${styles.customPersonRow} ${p.pago ? styles.itemRowSelected : ''}`}
                                     style={{
                                         display: 'flex',
                                         alignItems: 'center',
                                         gap: '0.5rem',
                                         padding: '0.5rem',
                                         background: p.pago ? 'var(--bg-2)' : 'transparent',
                                         borderRadius: '10px'
                                     }}>
                                    <div className={`${styles.checkBox} ${p.pago ? styles.checkBoxChecked : ''}`}
                                         onClick={() => togglePagoLivre(p.id)}
                                         style={{borderRadius: '50%', cursor: 'pointer'}}>
                                        {p.pago ? '✓' : ''}
                                    </div>

                                    <input className={styles.personNameInput} placeholder="Nome" value={p.nome}
                                           onChange={e => updatePerson(p.id, 'nome', e.target.value)}/>
                                    <input className={styles.personAmountInput} type="number" placeholder="R$ 0,00"
                                           value={p.valor} onChange={e => updatePerson(p.id, 'valor', e.target.value)}/>

                                    <MetodoSelector
                                        value={p.metodo}
                                        onChange={(v) => updatePerson(p.id, 'metodo', v)}
                                        opcoes={metodosDisp}
                                    />

                                    {persons.length > 2 && (
                                        <button className={styles.removeBtn}
                                                onClick={() => removePerson(p.id)}>✕</button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button className={styles.addPersonBtn} onClick={addPerson}>+ Adicionar Pagador</button>

                        <div className={styles.meter}>
                            <div className={`${styles.meterFill} ${excedido ? styles.meterOver : ''}`}
                                 style={{width: `${percentualBarra}%`}}/>
                        </div>

                        <div className={styles.remainderBar}>
                            <span className={styles.remainderLabel}>Status da soma:</span>
                            <span
                                className={`${styles.remainderValue} ${zerado ? styles.remainderOk : excedido ? styles.remainderOver : ''}`}>
                                {zerado ? '✅ Conta Fechada' : excedido ? '⚠️ Excedeu ' : 'Falta '}
                                {!zerado && <RenderPrice value={Math.abs(restante)}/>}
                            </span>
                        </div>

                        <button
                            className={styles.confirmBtn}
                            disabled={!todosPagosLivre}
                            onClick={() => lidarComCliqueBotao(() => iniciarProcessoPagamento({
                                modalidade: 'VALOR_LIVRE',
                                numeroPessoas: 0,
                                parcelas: persons.map(p => ({
                                    nomePessoa: p.nome || 'Pagador',
                                    valor: parseFloat(String(p.valor).replace(',', '.')) || 0,
                                    metodoPagamento: p.metodo
                                }))
                            }, executarDivisao))}
                            style={duplaValidacao ? {backgroundColor: 'var(--accent)'} : {}}
                        >
                            {!zerado ? 'Ajuste os valores para fechar' : (!todosPagosLivre) ? 'Marque todos como pagos (✓)' : duplaValidacao ? '⚠ Confirmar pagamentos?' : 'Confirmar Valores Livres'}
                        </button>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal}>
                {/* Cabeçalho */}
                <header className={styles.header}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <div>
                            <h2 className={styles.title}>Divisão de Conta</h2>
                            <p className={styles.subtitle}>Mesa {comanda.mesa?.numero} — Comanda #{comanda.id}</p>
                        </div>
                        <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
                    </div>
                </header>

                {filaTroco.length > 0 && (
                    <ModalTroco
                        nomePagador={filaTroco[0].nomeCalculado}
                        valorCobrado={filaTroco[0].tipo === 'grupo_itens' ? filaTroco[0].valorTotal : filaTroco[0].valor}
                        resumoItens={filaTroco[0].resumoItens}
                        pendentesRestantes={filaTroco.length - 1}
                        onConfirm={handleConfirmarTroco}
                        onCancel={() => {
                            setFilaTroco([]);
                            setPayloadPendente(null);
                        }}
                    />
                )}

                {/* Total */}
                <div className={styles.totalBar}>
                    <span className={styles.totalLabel}>Total da Comanda</span>
                    <span className={styles.totalValue}><RenderPrice value={total}/></span>
                </div>

                {/* Abas */}
                {estado === 'idle' && (
                    <div style={{padding: '0 1.25rem', marginTop: '1rem'}}>
                        <div className={styles.tabs}>
                            {(['itens', 'igual', 'valor'] as const).map((t) => (
                                <button key={t} type="button"
                                        className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                                        onClick={() => setTab(t)}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {renderBody()}

                {estado === 'error' && erro && <div style={{padding: '1rem'}}>
                    <div className={styles.errorMsg}>⚠ {erro}</div>
                </div>}
            </div>
        </div>
    );
}

interface ModalTrocoProps {
    nomePagador: string;
    valorCobrado: number;
    pendentesRestantes: number;
    resumoItens?: string[];
    onConfirm: (valorEntregue: number) => void;
    onCancel: () => void;
}

function ModalTroco({ nomePagador, valorCobrado, pendentesRestantes, resumoItens, onConfirm, onCancel }: ModalTrocoProps) {
    const [valorEntregue, setValorEntregue] = useState<string>('');

    const entregueNum = parseFloat(valorEntregue.replace(',', '.')) || 0;
    const troco = entregueNum - valorCobrado;
    const isValido = entregueNum >= valorCobrado;

    const notasCalculadas = useMemo(() => {
        // ... (sua lógica de cálculo de notas continua intacta aqui)
        if (troco <= 0) return [];
        let restante = Math.round(troco * 100);
        const cedulasEMoedas = [
            { valor: 200, label: 'Nota(s) de R$ 200' }, { valor: 100, label: 'Nota(s) de R$ 100' },
            { valor: 50, label: 'Nota(s) de R$ 50' },   { valor: 20, label: 'Nota(s) de R$ 20' },
            { valor: 10, label: 'Nota(s) de R$ 10' },   { valor: 5, label: 'Nota(s) de R$ 5' },
            { valor: 2, label: 'Nota(s) de R$ 2' },     { valor: 1, label: 'Moeda(s) de R$ 1' },
            { valor: 0.50, label: 'Moeda(s) de 50¢' },  { valor: 0.25, label: 'Moeda(s) de 25¢' },
            { valor: 0.10, label: 'Moeda(s) de 10¢' },  { valor: 0.05, label: 'Moeda(s) de 5¢' }
        ];
        const resultado = [];
        for (const item of cedulasEMoedas) {
            const valorEmCentavos = Math.round(item.valor * 100);
            if (restante >= valorEmCentavos) {
                const quantidade = Math.floor(restante / valorEmCentavos);
                resultado.push({ label: item.label, quantidade, valor: item.valor });
                restante = restante % valorEmCentavos;
            }
        }
        return resultado;
    }, [troco]);

    return (
        <div className={styles.trocoOverlay}>
            <div className={styles.trocoModal}>

                <div className={styles.trocoHeader}>
                    <div className={styles.trocoIcon}>💵</div>
                    <h2 className={styles.trocoTitle}>Troco em Dinheiro</h2>
                    <p className={styles.trocoSubtitle}>
                        Pagamento: <strong>{nomePagador}</strong>
                    </p>
                </div>

                <div className={styles.valorCobrarBox}>
                    <span className={styles.valorCobrarLabel}>Valor a cobrar</span>
                    <span className={styles.valorCobrarAmount}>
                        R$ {valorCobrado.toFixed(2).replace('.', ',')}
                    </span>
                </div>

                {resumoItens && resumoItens.length > 0 && (
                    <div className={styles.resumoBox}>
                        <strong className={styles.resumoTitle}>
                            Itens deste pagamento:
                        </strong>
                        <ul className={styles.resumoList}>
                            {resumoItens.map((itemStr, idx) => (
                                <li key={idx}>{itemStr}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div>
                    <label className={styles.trocoInputLabel}>
                        Valor entregue pelo cliente (R$)
                    </label>
                    <input
                        type="number"
                        min={valorCobrado}
                        step="0.01"
                        autoFocus
                        value={valorEntregue}
                        onChange={e => setValorEntregue(e.target.value)}
                        placeholder="0,00"
                        className={styles.trocoInput}
                    />
                </div>

                {troco > 0 && (
                    <div className={styles.trocoDevolverBox}>
                        <div className={styles.trocoDevolverHeader}>
                            <span className={styles.trocoDevolverLabel}>Troco a devolver:</span>
                            <span className={styles.trocoDevolverAmount}>
                                R$ {troco.toFixed(2).replace('.', ',')}
                            </span>
                        </div>
                        <ul className={styles.trocoDevolverList}>
                            {notasCalculadas.map((nota, i) => (
                                <li key={i}>
                                    <span>{nota.label}</span>
                                    <b>x {nota.quantidade}</b>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className={styles.trocoFooter}>
                    <span className={styles.trocoFooterStatus}>
                        {pendentesRestantes > 0 ? `⏳ + ${pendentesRestantes} na fila` : '✅ Último da fila'}
                    </span>
                    <div className={styles.trocoFooterBtns}>
                        <button className={styles.trocoCancelBtn} onClick={onCancel}>
                            Cancelar
                        </button>
                        <button
                            className={styles.trocoConfirmBtn}
                            disabled={!isValido}
                            onClick={() => onConfirm(entregueNum)}
                        >
                            Confirmar
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}