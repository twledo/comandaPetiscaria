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

                                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%'}}>
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
                                        <span style={{
                                            color: 'var(--orange)',
                                            fontSize: '0.8rem',
                                            textAlign: 'center',
                                            fontWeight: 'bold'
                                        }}>
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

function ComandaResumo({
                           comanda,
                           onRefresh,
                           exec
                       }: {
    comanda: NonNullable<Mesa['comandaAtiva']>,
    onRefresh: () => Promise<void>,
    exec: (fn: () => Promise<any>) => void
}) {
    const {isAdmin} = useAuth();
    const [processandoItem, setProcessandoItem] = useState<number | null>(null);
    const [confirmarEstorno, setConfirmarEstorno] = useState<{ itemId: number; nome: string } | null>(null);

    const [motivoEstorno, setMotivoEstorno] = useState('');
    const MIN_CARACTERES = 10;

    // 🌟 NOVO: Estado para controlar a aba selecionada
    const [abaAtiva, setAbaAtiva] = useState<'RESUMO' | 'ENTREGUES' | 'CANCELADOS'>('RESUMO');

    const pedidos = (comanda as any).pedidos || [];
    const itens = pedidos.flatMap((pedido: any) => {
        return pedido.itens || [];
    });

    async function estornar(itemId: number, motivo: string) {
        setProcessandoItem(itemId);
        try {
            await comandasApi.estornarItem(comanda.id, itemId, motivo);
            setConfirmarEstorno(null);
            setMotivoEstorno('');
            await new Promise(resolve => setTimeout(resolve, 400));
            await onRefresh();
        } catch (e: unknown) {
            console.error('Erro ao estornar item:', e);
        } finally {
            setProcessandoItem(null);
        }
    }

    async function entregar(itemId: number) {
        setProcessandoItem(itemId);
        try {
            await pedidosApi.entregarItem(itemId);
            await new Promise(resolve => setTimeout(resolve, 400));
            await onRefresh();
        } catch (e: unknown) {
            console.error('Erro ao entregar item:', e);
        } finally {
            setProcessandoItem(null);
        }
    }

    // 🎨 Lógica centralizada de filtros para as abas
    const itensPendentes = itens.filter((i: any) => {
        const isCancelado = String(i.status).toUpperCase() === 'CANCELADO';
        const isEntregue = String(i.status).toUpperCase() === 'ENTREGUE' || String(i.status).toUpperCase() === 'PRONTO' || i.entregue === true;
        return !isCancelado && !isEntregue;
    });

    const itensEntregues = itens.filter((i: any) => {
        const isCancelado = String(i.status).toUpperCase() === 'CANCELADO';
        const isEntregue = String(i.status).toUpperCase() === 'ENTREGUE' || String(i.status).toUpperCase() === 'PRONTO' || i.entregue === true;
        return !isCancelado && isEntregue;
    });

    const itensCancelados = itens.filter((i: any) => String(i.status).toUpperCase() === 'CANCELADO');

    // Define qual array vai ser desenhado na tela com base na aba clicada
    let itensParaExibir = [];
    if (abaAtiva === 'RESUMO') itensParaExibir = itensPendentes;
    else if (abaAtiva === 'ENTREGUES') itensParaExibir = itensEntregues;
    else if (abaAtiva === 'CANCELADOS') itensParaExibir = itensCancelados;

    return (
        <div className={styles.itensSection}>
            {/* Cabeçalho com Abas */}
            <div className={styles.tabsContainer}>
                {['RESUMO', 'ENTREGUES', 'CANCELADOS'].map((aba) => (
                    <button
                        key={aba}
                        className={`${styles.tabBtn} ${abaAtiva === aba ? styles.tabBtnActive : ''}`}
                        onClick={() => setAbaAtiva(aba)}
                    >
                        {aba.charAt(0) + aba.slice(1).toLowerCase()}
                        <span className={styles.tabBadge}>
                        {aba === 'RESUMO' ? itensPendentes.length :
                            aba === 'ENTREGUES' ? itensEntregues.length : itensCancelados.length}
                    </span>
                    </button>
                ))}
            </div>

            {itensParaExibir.length === 0 ? (
                <p className={styles.emptyItens}>Nenhum item nesta lista.</p>
            ) : (
                <ul className={styles.itensList}>
                    {/* 🌟 LÓGICA DE AGRUPAMENTO POR PEDIDO */}
                    {Object.entries(
                        itensParaExibir.reduce((acc: any, item: any) => {
                            const pid = item.pedido?.id || 'sem-pedido';
                            if (!acc[pid]) acc[pid] = [];
                            acc[pid].push(item);
                            return acc;
                        }, {})
                    ).map(([pedidoId, itensDoPedido]: [string, any]) => (

                        <li key={`pedido-${pedidoId}`} className={styles.pedidoContainer}>
                            {/* 🌟 Cabeçalho do Pedido */}
                            <div className={styles.pedidoHeader}>
                                <span>Pedido <b>#{pedidoId}</b></span>
                            </div>

                            {/* Lista de itens do pedido */}
                            <ul className={styles.itensDoPedido}>
                                {itensDoPedido.map((item: any) => {
                                    const nomeDoProduto = item.nomeProduto || item.produto?.nome || 'Produto';
                                    const statusItem = String(item.status || '').toUpperCase();
                                    const isEntregue = statusItem === 'ENTREGUE' || statusItem === 'PRONTO' || item.entregue === true;
                                    const isCancelado = statusItem === 'CANCELADO';

                                    return (
                                        <li key={item.id} className={`${styles.itemRow} ${isCancelado ? styles.itemRowCancelado : ''}`}>
                                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                                <div className={styles.itemInfo}>
                                                <span className={styles.itemNome} style={isCancelado ? { textDecoration: 'line-through', color: 'var(--red)' } : {}}>
                                                    {nomeDoProduto} {item.meiaPorcao && <span className={styles.meiaTag}>Meia</span>}
                                                </span>
                                                    <span className={styles.itemQtd}>x{item.quantidade}</span>
                                                </div>

                                                <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-3)', display: 'flex', flexWrap: 'wrap', gap: '8px', fontStyle: 'italic' }}>
                                                    {item.usuarioLancamentoItem && <span>Lançado: <b>{item.usuarioLancamentoItem}</b></span>}
                                                    {item.usuarioResponsavelEntrega && <span>Entregue: <b>{item.usuarioResponsavelEntrega}</b></span>}
                                                    {item.observacao && <span>Obs: {item.observacao}</span>}
                                                </div>

                                                {isCancelado && (
                                                    <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--red)' }}>
                                                        <b>Motivo:</b> {item.motivoCancelamento} <i>({item.usuarioResponsavelEstorno})</i>
                                                    </div>
                                                )}
                                            </div>

                                            <div className={styles.itemRight}>
                                                <div className={styles.itemActions}>
                                                    {!isEntregue && !isCancelado ? (
                                                        <button
                                                            className={styles.btnEntregarItem}
                                                            onClick={() => exec(() => pedidosApi.entregarItem(item.id))}
                                                            title="Marcar como entregue"
                                                        >
                                                            ✓
                                                        </button>
                                                    ) : isEntregue && !isCancelado ? (
                                                        <span className={styles.itemEntregueCheck}>✓</span>
                                                    ) : <span className={styles.itemCanceladoBadge}>CANCELADO</span>}

                                                    {isAdmin && !isCancelado && (
                                                        <button className={styles.btnEstornarItem} onClick={() => setConfirmarEstorno({itemId: item.id, nome: nomeDoProduto})}>✕</button>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </li>
                    ))}
                </ul>
            )}

            <div className={styles.subtotal}>
                <span>Subtotal</span>
                <span>R$ {Number(comanda.total).toFixed(2).replace('.', ',')}</span>
            </div>


            {/* MODAL DE CONFIRMAÇÃO DE ESTORNO */}
            {confirmarEstorno && (
                <div className={styles.obsBackdrop}>
                    <div className={styles.obsModal}>
                        <h3 style={{color: 'var(--red)', marginBottom: '0.5rem', marginTop: 0}}>Confirmar
                            Cancelamento</h3>
                        <p style={{color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '1rem'}}>
                            Tem certeza que deseja cancelar <b>{confirmarEstorno.nome}</b>?
                        </p>

                        <div style={{textAlign: 'left', marginBottom: '1.5rem'}}>
                            <label style={{fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 600}}>
                                Motivo do cancelamento (obrigatório):
                            </label>
                            <textarea
                                value={motivoEstorno}
                                onChange={(e) => setMotivoEstorno(e.target.value)}
                                placeholder={`Ex: Cliente desistiu, erro de digitação... (Mín. ${MIN_CARACTERES} carac.)`}
                                rows={3}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: '8px',
                                    border: '1px solid var(--border)', background: 'var(--bg-2)',
                                    marginTop: '0.5rem', resize: 'none', color: 'var(--text)',
                                    fontFamily: 'inherit', fontSize: '0.9rem'
                                }}
                                autoFocus
                            />
                            <div style={{
                                fontSize: '0.75rem', textAlign: 'right', marginTop: '4px',
                                color: motivoEstorno.trim().length < MIN_CARACTERES ? 'var(--red)' : 'var(--success)'
                            }}>
                                {motivoEstorno.trim().length}/{MIN_CARACTERES} caracteres
                            </div>
                        </div>

                        <div className={styles.obsActions}>
                            <button className={styles.btnCancelar} onClick={() => setConfirmarEstorno(null)}>
                                Voltar
                            </button>
                            <button
                                className={styles.btnConfirmar}
                                style={{background: 'var(--red)'}}
                                onClick={() => estornar(confirmarEstorno.itemId, motivoEstorno)}
                                disabled={processandoItem === confirmarEstorno.itemId || motivoEstorno.trim().length < MIN_CARACTERES}
                            >
                                {processandoItem === confirmarEstorno.itemId ? 'Cancelando...' : 'Sim, cancelar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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