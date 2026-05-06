import { useState, useMemo, useCallback } from 'react';
import type { Comanda, ItemPedido } from '../../types';
import type {
    MetodoPagamento,
    PagamentoParcialDTO,
    PagamentoItensDTO,
    ParcelaPessoa,
} from './divisaoTypes';
import styles from './DivisaoContaModal.module.css';
import {comandasApi} from "../../../api";

// ─── helpers ──────────────────────────────────────────────────────────────────

const API = '/api/comandas';

const fmt = (v: number) => 'R$ ' + v.toFixed(2).replace('.', ',');

const precoUnitEfetivo = (item: ItemPedido): number => {
    const u = Number(item.precoUnitario);
    return item.meiaPorcao ? u * 0.6 : u;
};

const METODOS: { value: MetodoPagamento; label: string }[] = [
    { value: 'DINHEIRO', label: 'Dinheiro' },
    { value: 'PIX',      label: 'Pix'      },
    { value: 'CREDITO',  label: 'Crédito'  },
    { value: 'DEBITO',   label: 'Débito'   },
];

type Tab    = 'itens' | 'igual' | 'valor';
type Estado = 'idle'  | 'loading' | 'success' | 'error';

interface CustomPerson { id: number; nome: string; valor: string; }

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    comanda: Comanda;
    onClose: () => void;
    onSuccess: (comandaAtualizada: Comanda) => void;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DivisaoContaModal({ comanda, onClose, onSuccess }: Props) {
    const total  = Number(comanda.total);
    const itens: ItemPedido[] = comanda.itens ?? [];

    const [tab,    setTab]    = useState<Tab>('itens');
    const [estado, setEstado] = useState<Estado>('idle');
    const [erro,   setErro]   = useState<string | null>(null);

    // ── aba "por itens" — mapa itemId → qtd selecionada ─────────────
    const [qtdSel, setQtdSel] = useState<Map<number, number>>(new Map());
    const [metodoItens, setMetodoItens] = useState<MetodoPagamento>('PIX');

    const getQtd = (id: number) => qtdSel.get(id) ?? 0;

    const setQtd = (id: number, val: number, max: number) => {
        const clamped = Math.max(0, Math.min(max, Math.round(val)));
        setQtdSel(prev => {
            const next = new Map(prev);
            clamped === 0 ? next.delete(id) : next.set(id, clamped);
            return next;
        });
    };

    // Click na linha: toggle entre "tudo" e "nada"
    const toggleLinha = (id: number, max: number) =>
        setQtd(id, getQtd(id) > 0 ? 0 : max, max);

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
    const [numPessoas,  setNumPessoas]  = useState(2);
    const [metodoIgual, setMetodoIgual] = useState<MetodoPagamento>('PIX');
    const valorPorPessoa = useMemo(
        () => Math.round((total / numPessoas) * 100) / 100,
        [total, numPessoas],
    );

    // ── aba valor livre ──────────────────────────────────────────────
    const [persons, setPersons] = useState<CustomPerson[]>([
        { id: 1, nome: 'Pessoa 1', valor: '' },
        { id: 2, nome: 'Pessoa 2', valor: '' },
    ]);
    const [metodoValor, setMetodoValor] = useState<MetodoPagamento>('PIX');
    let nextId = persons.length + 1;

    const somaPersons = useMemo(
        () => persons.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0),
        [persons],
    );
    const restante   = Math.round((total - somaPersons) * 100) / 100;
    const percentual = Math.min(100, (somaPersons / total) * 100);
    const zerado     = Math.abs(restante) < 0.02;
    const excedido   = restante < -0.02;

    const addPerson = () =>
        setPersons(prev => [...prev, { id: nextId++, nome: `Pessoa ${nextId - 1}`, valor: '' }]);

    const removePerson = (id: number) =>
        setPersons(prev => prev.filter(p => p.id !== id));

    const updatePerson = (id: number, field: 'nome' | 'valor', value: string) =>
        setPersons(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

    // ── chamadas de API ──────────────────────────────────────────────

    const call = useCallback(async (path: string, body: unknown) => {
        setEstado('loading');
        setErro(null);
        try {
            const res = await fetch(`${API}/${comanda.id}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error((await res.text()) || `Erro ${res.status}`);
            const data: Comanda = await res.json();
            setEstado('success');
            setTimeout(() => onSuccess(data), 1400);
        } catch (e: unknown) {
            setEstado('error');
            setErro(e instanceof Error ? e.message : 'Erro inesperado');
        }
    }, [comanda.id, onSuccess]);

    const confirmarItens = async () => {
        const body: PagamentoItensDTO = {
            itens: Array.from(qtdSel.entries()).map(([itemId, quantidadePagar]) => ({
                itemId,
                quantidadePagar,
            })),
            metodoPagamento: metodoItens
        };

        setEstado('loading');
        try {
            const data = await comandasApi.pagarItens(comanda.id, body);
            setEstado('success');
            setTimeout(() => onSuccess(data), 1400);
        } catch (e: any) {
            setEstado('error');
            setErro(e.message);
        }
    };

    const confirmarIgual = () => {
        const body: PagamentoParcialDTO = {
            modalidade: 'IGUALITARIO',
            numeroPessoas: numPessoas,
            metodoPagamento: metodoIgual,
        };
        call('/dividir-conta', body);
    };

    const confirmarValor = () => {
        const parcelas: ParcelaPessoa[] = persons.map(p => ({
            nomePessoa: p.nome,
            valor: parseFloat(p.valor) || 0,
        }));
        const body: PagamentoParcialDTO = {
            modalidade: 'VALOR_LIVRE',
            parcelas,
            metodoPagamento: metodoValor,
        };
        call('/dividir-conta', body);
    };

    // ── render ───────────────────────────────────────────────────────

    const renderBody = () => {
        if (estado === 'loading') return (
            <div className={styles.loadingOverlay}>
                <div className={styles.spinner} />
                <span className={styles.loadingText}>Registrando pagamento…</span>
            </div>
        );

        if (estado === 'success') return (
            <div className={styles.successBox}>
                <div className={styles.successIcon}>✓</div>
                <p className={styles.successTitle}>Pagamento registrado!</p>
                <p className={styles.successSub}>A comanda foi atualizada com sucesso.</p>
            </div>
        );

        return (
            <>
                {/* ── TAB: por itens ───────────────────────────── */}
                {tab === 'itens' && (
                    <>
                        <p className={styles.hint}>
                            Clique em um item para selecioná-lo inteiro, ou ajuste a quantidade
                            nos controles <strong>+/−</strong> para pagar apenas parte.
                        </p>

                        <div className={styles.itemsList}>
                            {itens.map(item => {
                                const max  = Number(item.quantidade);
                                const id   = item.id!;
                                const qtd  = getQtd(id);
                                const sel  = qtd > 0;
                                const prU  = precoUnitEfetivo(item);
                                const valorLinha = prU * (sel ? qtd : max);

                                return (
                                    <div
                                        key={id}
                                        className={`${styles.itemRow} ${sel ? styles.itemRowSelected : ''}`}
                                    >
                                        {/* checkbox / toggle */}
                                        <div
                                            className={`${styles.checkBox} ${sel ? styles.checkBoxChecked : ''}`}
                                            onClick={() => toggleLinha(id, max)}
                                            role="checkbox"
                                            aria-checked={sel}
                                            tabIndex={0}
                                            onKeyDown={e => e.key === ' ' && toggleLinha(id, max)}
                                        >
                                            {sel && '✓'}
                                        </div>

                                        {/* info do produto — clique também faz toggle */}
                                        <div
                                            className={styles.itemInfo}
                                            onClick={() => toggleLinha(id, max)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className={styles.itemName}>
                                                {item.nomeProduto}
                                                {item.meiaPorcao && (
                                                    <span style={{ color: '#f97316', marginLeft: 4, fontSize: '0.65rem' }}>
                            ½ porção
                          </span>
                                                )}
                                            </div>
                                            <div className={styles.itemQty}>
                                                {fmt(prU)} / un · {max} disponíve{max === 1 ? 'l' : 'is'}
                                                {item.observacao ? ` · ${item.observacao}` : ''}
                                            </div>
                                        </div>

                                        {/* controle de quantidade — só aparece quando selecionado */}
                                        {sel && max > 1 ? (
                                            <div className={styles.qtdControls} onClick={e => e.stopPropagation()}>
                                                <button
                                                    className={styles.qtdBtn}
                                                    onClick={() => setQtd(id, qtd - 1, max)}
                                                    aria-label="Diminuir"
                                                >−</button>
                                                <span className={styles.qtdNum}>{qtd}</span>
                                                <button
                                                    className={styles.qtdBtn}
                                                    onClick={() => setQtd(id, qtd + 1, max)}
                                                    disabled={qtd >= max}
                                                    aria-label="Aumentar"
                                                >+</button>
                                            </div>
                                        ) : (
                                            // quando qtd == max ou não selecionado: mostra só o preço total
                                            <div
                                                className={styles.itemPrice}
                                                onClick={() => toggleLinha(id, max)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                {fmt(sel ? valorLinha : max * prU)}
                                            </div>
                                        )}

                                        {/* preço da seleção atual (quando há controle de qtd) */}
                                        {sel && max > 1 && (
                                            <div className={styles.itemPrice} style={{ minWidth: 62, textAlign: 'right' }}>
                                                {fmt(prU * qtd)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.subtotalBox}>
                            <span className={styles.subtotalLabel}>Subtotal selecionado</span>
                            <span className={styles.subtotalValue}>{fmt(subtotalItens)}</span>
                        </div>

                        <MetodoSelect value={metodoItens} onChange={setMetodoItens} />

                        <button
                            className={styles.confirmBtn}
                            disabled={!algumSelecionado}
                            onClick={confirmarItens}
                        >
                            💰 Confirmar pagamento dos itens selecionados
                        </button>
                    </>
                )}

                {/* ── TAB: igualitário ─────────────────────────── */}
                {tab === 'igual' && (
                    <>
                        <p className={styles.hint}>
                            O total será dividido em partes iguais entre as pessoas.
                        </p>

                        <div className={styles.eqControls}>
                            <span className={styles.eqLabel}>Número de pessoas</span>
                            <input
                                className={styles.numericInput}
                                type="number"
                                min={2}
                                max={20}
                                value={numPessoas}
                                onChange={e => setNumPessoas(Math.max(2, parseInt(e.target.value) || 2))}
                            />
                        </div>

                        <div className={styles.eqGrid}>
                            {Array.from({ length: numPessoas }, (_, i) => (
                                <div key={i} className={styles.eqPersonCard}>
                                    <span className={styles.eqPersonLabel}>Pessoa {i + 1}</span>
                                    <span className={styles.eqPersonValue}>{fmt(valorPorPessoa)}</span>
                                </div>
                            ))}
                        </div>

                        <MetodoSelect value={metodoIgual} onChange={setMetodoIgual} />

                        <button className={styles.confirmBtn} onClick={confirmarIgual}>
                            💰 Confirmar divisão igualitária
                        </button>
                    </>
                )}

                {/* ── TAB: valor livre ─────────────────────────── */}
                {tab === 'valor' && (
                    <>
                        <p className={styles.hint}>
                            Defina quanto cada pessoa paga — podem ser valores diferentes.
                        </p>

                        <div className={styles.customRows}>
                            {persons.map(p => (
                                <div key={p.id} className={styles.customPersonRow}>
                                    <input
                                        className={styles.personNameInput}
                                        type="text"
                                        value={p.nome}
                                        placeholder="Nome"
                                        onChange={e => updatePerson(p.id, 'nome', e.target.value)}
                                    />
                                    <input
                                        className={styles.personAmountInput}
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={p.valor}
                                        placeholder="0,00"
                                        onChange={e => updatePerson(p.id, 'valor', e.target.value)}
                                    />
                                    {persons.length > 2 && (
                                        <button
                                            className={styles.removeBtn}
                                            onClick={() => removePerson(p.id)}
                                            aria-label="Remover pessoa"
                                        >✕</button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button className={styles.addPersonBtn} onClick={addPerson}>
                            + Adicionar pessoa
                        </button>

                        <div className={styles.remainderBar}>
                            <span className={styles.remainderLabel}>Restante a distribuir</span>
                            <span className={`${styles.remainderValue} ${zerado ? styles.remainderOk : excedido ? styles.remainderOver : ''}`}>
                {zerado ? 'Zerado ✓' : `${fmt(Math.abs(restante))}${excedido ? ' (excedido)' : ' restante'}`}
              </span>
                        </div>

                        <div className={styles.meter}>
                            <div
                                className={`${styles.meterFill} ${excedido ? styles.meterOver : ''}`}
                                style={{ width: `${percentual}%` }}
                            />
                        </div>

                        <MetodoSelect value={metodoValor} onChange={setMetodoValor} />

                        <button
                            className={styles.confirmBtn}
                            disabled={!zerado || persons.length < 2}
                            onClick={confirmarValor}
                        >
                            💰 Confirmar divisão por valor
                        </button>
                    </>
                )}

                {estado === 'error' && erro && (
                    <p style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center' }}>
                        ⚠ {erro}
                    </p>
                )}
            </>
        );
    };

    return (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Divisão de conta">

                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h2 className={styles.title}>Divisão de conta</h2>
                        <p className={styles.subtitle}>
                            Mesa {comanda.mesa?.numero} — Comanda #{comanda.id} · {comanda.nomeCliente}
                        </p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">✕</button>
                </div>

                <div className={styles.totalBar}>
                    <span className={styles.totalLabel}>Total da comanda</span>
                    <span className={styles.totalValue}>{fmt(total)}</span>
                </div>

                {(estado === 'idle' || estado === 'error') && (
                    <div className={styles.tabs}>
                        <TabBtn active={tab === 'itens'} onClick={() => setTab('itens')} icon="☰">Por itens</TabBtn>
                        <TabBtn active={tab === 'igual'} onClick={() => setTab('igual')} icon="👥">Igualitário</TabBtn>
                        <TabBtn active={tab === 'valor'} onClick={() => setTab('valor')} icon="⚖">Valor livre</TabBtn>
                    </div>
                )}

                <div className={styles.body}>{renderBody()}</div>
            </div>
        </div>
    );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function TabBtn({ active, onClick, icon, children }: {
    active: boolean; onClick: () => void; icon: string; children: React.ReactNode;
}) {
    return (
        <button className={`${styles.tab} ${active ? styles.tabActive : ''}`} onClick={onClick}>
            <span>{icon}</span>{children}
        </button>
    );
}

function MetodoSelect({ value, onChange }: {
    value: MetodoPagamento; onChange: (v: MetodoPagamento) => void;
}) {
    return (
        <div className={styles.methodRow}>
            <span className={styles.methodLabel}>Forma de pagamento</span>
            <select
                className={styles.methodSelect}
                value={value}
                onChange={e => onChange(e.target.value as MetodoPagamento)}
            >
                {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
        </div>
    );
}