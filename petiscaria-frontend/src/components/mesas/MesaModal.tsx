import React, {useState, useMemo} from 'react';
import {comandasApi, pedidosApi} from '../../api';
import {useAuth} from '../../contexts/AuthContext';
import type {Mesa} from '../../types';
import LancarItensModal from '../comandas/LancarItensModal';
import DivisaoContaModal from '../comandas/divisao/DivisaoContaModal';
import styles from './MesaModal.module.css';

interface Props {
    mesa: Mesa;
    statusLabel: string;
    onClose: () => void;
    onRefresh: () => Promise<void>;
}

export default function MesaModal({mesa, statusLabel, onClose, onRefresh}: Props) {
    const {isAdmin} = useAuth();
    const [nomeCliente, setNomeCliente] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showLancar, setShowLancar] = useState(false);
    const [showDivisao, setShowDivisao] = useState(false);

    const comanda = mesa.comandaAtiva;
    const temPedidoPendente = comanda?.pedidos?.some((p: any) => p.status === 'PENDENTE');

    async function exec(fn: () => Promise<any>) {
        setError('');
        setLoading(true);
        try {
            await fn();
            await onRefresh();
        } catch (e: any) {
            setError(e.response?.data?.message || e.message || 'Erro ao executar ação.');
        } finally {
            setLoading(false);
        }
    }

    // ── Renderização Condicional: Lançar Itens ──
    if (showLancar && comanda) {
        return (
            <LancarItensModal
                comanda={comanda}
                mesa={mesa}
                onClose={() => setShowLancar(false)}
                onRefresh={onRefresh}
            />
        );
    }

    // ── Renderização Condicional: Divisão de Conta ──
    if (showDivisao && comanda) {
        return (
            <DivisaoContaModal
                comanda={comanda}
                onClose={() => setShowDivisao(false)}
                onSuccess={() => {
                    onRefresh();
                }}
            />
        );
    }

    // ── Renderização Principal da Mesa ──
    return (
        <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={`${styles.modal} animate-scale`}>

                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Mesa {mesa.numero}</h2>
                        <StatusBadge status={mesa.status} label={statusLabel}/>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <div className={styles.body}>

                    {/* ── DISPONIVEL ─────────────────────────────── */}
                    {mesa.status === 'DISPONIVEL' && (
                        <div className={styles.section}>
                            <div style={{marginBottom: '0.5rem'}}>
                                <h3 style={{color: 'var(--text)', marginBottom: '4px'}}>Novo Atendimento</h3>
                                <p className={styles.description}>Identifique o cliente para iniciar:</p>
                            </div>

                            <input
                                type="text"
                                className={styles.inputNome}
                                placeholder="Ex: João Silva"
                                value={nomeCliente}
                                onChange={e => setNomeCliente(e.target.value)}
                                disabled={loading}
                                autoFocus
                            />

                            <button
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                onClick={() => exec(() => comandasApi.abrir(mesa.id, nomeCliente))}
                                disabled={loading || !nomeCliente.trim()}
                            >
                                {loading ? <Spinner/> : '▶ Abrir Mesa e Iniciar'}
                            </button>
                        </div>
                    )}

                    {/* ── OCUPADA ────────────────────────────────── */}
                    {mesa.status === 'OCUPADA' && comanda && (
                        <>
                            <ComandaResumo comanda={comanda} mesa={mesa} onRefresh={onRefresh} exec={exec}/>

                            <div className={styles.actions}>
                                <button
                                    className={`${styles.btn} ${styles.btnPrimary}`}
                                    onClick={() => setShowLancar(true)}
                                >
                                    + Lançar Itens
                                </button>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                    <button
                                        className={`${styles.btn} ${styles.btnGreen}`}
                                        onClick={() => exec(() => comandasApi.fechar(comanda.id))}
                                        disabled={loading || temPedidoPendente}
                                        title={temPedidoPendente ? "Entregue todos os pedidos antes de fechar a conta" : "Pedir Conta"}
                                    >
                                        {loading ? <Spinner/> : '✓ Pedir Conta'}
                                    </button>

                                    {/* Aviso visual para o garçom saber por que o botão está bloqueado */}
                                    {temPedidoPendente && (
                                        <span style={{ color: 'var(--orange)', fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold' }}>
                                        Entregue ou estorne os itens pendentes para liberar a conta.
                                    </span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── AGUARDANDO_PAGAMENTO ───────────────────── */}
                    {mesa.status === 'AGUARDANDO_PAGAMENTO' && comanda && (
                        <>
                            <ComandaResumo comanda={comanda} mesa={mesa} onRefresh={onRefresh} exec={exec}/>

                            <div className={styles.totalBox}>
                                <span>Total a Receber</span>
                                <span className={styles.totalValue}>
                                    R$ {Number(comanda.total).toFixed(2).replace('.', ',')}
                                </span>
                            </div>

                            {isAdmin ? (
                                <div className={styles.actions}>
                                    <button
                                        className={`${styles.btn} ${styles.btnPrimary}`}
                                        onClick={() => setShowDivisao(true)}
                                        disabled={loading}
                                    >Pagamento
                                    </button>

                                    <button
                                        className={`${styles.btn} ${styles.btnGhost}`}
                                        onClick={() => exec(() => comandasApi.reabrir(comanda.id))}
                                        disabled={loading}
                                    >
                                        ↩ Reabrir Comanda
                                    </button>
                                </div>
                            ) : (
                                <p className={styles.waitMsg}>
                                    Aguardando confirmação do administrador no caixa.
                                </p>
                            )}
                        </>
                    )}

                    {error && <p className={styles.error}>{error}</p>}
                </div>
            </div>
        </div>
    );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function ComandaResumo({
                           comanda,
                           mesa,
                           onRefresh,
                           exec
                       }: {
    comanda: any,
    mesa: Mesa,
    onRefresh: () => Promise<void>,
    exec: (fn: () => Promise<any>) => Promise<void>
}) {
    const [estornando, setEstornando] = useState<number | null>(null);
    const [erroLocal, setErroLocal] = useState<string | null>(null);

    const pedidos = useMemo(() => {
        const rawPedidos = comanda?.pedidos || [];
        return [...rawPedidos]
            .filter(p => p.itens && p.itens.length > 0) // 👈 Ignora pedidos sem itens na listagem
            .sort((a, b) => {
                if (a.status === 'PENDENTE' && b.status !== 'PENDENTE') return -1;
                if (a.status !== 'PENDENTE' && b.status === 'PENDENTE') return 1;
                return b.id - a.id;
            }); // <-- Faltava fechar as chaves e o parêntese aqui no código anterior!
    }, [comanda?.pedidos]);

    // Calcula o total de itens para o cabeçalho
    const totalLancamentos = pedidos.reduce((acc: number, pedido: any) => acc + (pedido.itens?.length || 0), 0);

    // Função para estornar um item específico
    async function estornar(itemId: number) {
        setEstornando(itemId);
        setErroLocal(null);
        try {
            await comandasApi.estornarItem(comanda.id, itemId);
            await onRefresh();
        } catch (e: any) {
            setErroLocal(e.response?.data?.message || "Erro ao estornar item.");
            setTimeout(() => setErroLocal(null), 5000);
        } finally {
            setEstornando(null);
        }
    }

    // Agrupa itens de um array (usado dentro de cada pedido)
    const agruparItens = (itens: any[]) => {
        if (!itens || itens.length === 0) return [];

        const agrupados = itens.reduce((acc, item) => {
            // Incluímos a observação na chave de agrupamento
            const obsKey = (item.observacao || "").trim().toLowerCase();
            const chave = `${item.produto.id}-${item.meiaPorcao}-${obsKey}`;

            if (!acc[chave]) {
                acc[chave] = {
                    ...item,
                    ids: [item.id],
                    totalAgrupado: item.totalItem || 0
                };
            } else {
                acc[chave].quantidade += item.quantidade;
                acc[chave].totalAgrupado += item.totalItem || 0;
                acc[chave].ids.push(item.id);
            }
            return acc;
        }, {} as Record<string, any>);

        return Object.values(agrupados);
    };

    return (
        <div className={styles.itensSection}>
            <div className={styles.itensHeader}>
                <div className={styles.comandaInfo}>
                    <span className={styles.comandaId}>Comanda #{comanda.id}</span>
                    {comanda.nomeCliente && (
                        <span className={styles.clienteNome}>
                            {' - '}{comanda.nomeCliente.toUpperCase()}
                        </span>
                    )}
                </div>
                <span className={styles.itensCount}>{totalLancamentos} itens</span>
            </div>

            {erroLocal && (
                <p style={{
                    color: 'var(--red)',
                    fontSize: '0.85rem',
                    padding: '0.5rem 1rem',
                    background: 'var(--red-dim)',
                    margin: 0
                }}>
                    {erroLocal}
                </p>
            )}

            <div className={styles.pedidosContainer}>
                {pedidos.length === 0 ? (
                    <p className={styles.emptyItens}>Nenhum pedido lançado ainda.</p>
                ) : (
                    pedidos.map((pedido: any) => {
                        const itensAgrupados = agruparItens(pedido.itens);

                        return (
                            <div key={pedido.id} className={`${styles.pedidoWrapper} ${styles[pedido.status]}`}>
                                {/* Cabeçalho do Pedido - Totalmente automático agora */}
                                <div className={styles.pedidoHeader}>
                                    <div className={styles.pedidoTitleBox}>
                                        <span className={styles.pedidoTitle}>Pedido #{pedido.id}</span>
                                        <span className={`${styles.statusBadge} ${styles[pedido.status]}`}>
                                            {pedido.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Lista de Itens deste Pedido */}
                                {itensAgrupados.length > 0 ? (
                                    <ul className={styles.itensList}>
                                        {itensAgrupados.map((grupo) => {
                                            const ultimoId = grupo.ids[grupo.ids.length - 1];
                                            return (
                                                <li key={grupo.ids[0]} className={styles.itemRow}>
                                                    <div className={styles.itemInfo}>
                                                        <span className={styles.itemNome}>
                                                            {grupo.nomeProduto}
                                                            {grupo.meiaPorcao && <span className={styles.meiaTag}>½</span>}
                                                        </span>
                                                        <span className={styles.itemQtd}>x{grupo.quantidade}</span>
                                                    </div>

                                                    <div className={styles.itemRight}>
                                                        <span className={styles.itemTotal}>
                                                            R$ {grupo.totalAgrupado.toFixed(2).replace('.', ',')}
                                                        </span>

                                                        {/* Ações só aparecem se o pedido estiver PENDENTE */}
                                                        {mesa.status === 'OCUPADA' && pedido.status === 'PENDENTE' && (
                                                            <div className={styles.itemActions}>
                                                                {/* Check de Entrega */}
                                                                {!grupo.entregue ? (
                                                                    <button
                                                                        className={styles.btnEntregarItem}
                                                                        onClick={() => exec(() => pedidosApi.entregarItem(ultimoId))}
                                                                        title="Marcar como entregue"
                                                                    >
                                                                        ✓
                                                                    </button>
                                                                ) : (
                                                                    <span className={styles.itemEntregueCheck}>✓</span>
                                                                )}

                                                            </div>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className={styles.emptyItens} style={{padding: '0.5rem 1rem'}}>
                                        Sem itens ativos.
                                    </p>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <div className={styles.subtotal}>
                <span>Subtotal</span>
                <span>R$ {Number(comanda.total).toFixed(2).replace('.', ',')}</span>
            </div>
        </div>
    );
}

function StatusBadge({status, label}: { status: string, label: string }) {
    let cls = styles.badgeGreen;
    if (status === 'OCUPADA') cls = styles.badgeOrange;
    if (status === 'AGUARDANDO_PAGAMENTO') cls = styles.badgeAmber;

    return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

function Spinner() {
    return <span className={styles.spinner}/>;
}