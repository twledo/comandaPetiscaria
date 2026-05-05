import { useState } from 'react';
import { comandasApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import type { Mesa } from '../../types';
import LancarItensModal from '../comandas/LancarItensModal';
import styles from './MesaModal.module.css';

interface Props {
    mesa: Mesa;
    onClose: () => void;
    onRefresh: () => Promise<void>;
}

export default function MesaModal({ mesa, onClose, onRefresh }: Props) {
    const { isAdmin } = useAuth();
    const [nomeCliente, setNomeCliente] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showLancar, setShowLancar] = useState(false);

    async function exec(fn: () => Promise<unknown>) {
        setError('');
        setLoading(true);
        try {
            await fn();
            await onRefresh();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao executar ação.');
        } finally {
            setLoading(false);
        }
    }

    if (showLancar && mesa.comandaAtiva) {
        return (
            <LancarItensModal
                comanda={mesa.comandaAtiva}
                mesa={mesa}
                onClose={onClose}
                onRefresh={onRefresh}
            />
        );
    }

    const comanda = mesa.comandaAtiva;

    return (
        <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={`${styles.modal} animate-scale`}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Mesa {mesa.numero}</h2>
                        <StatusBadge status={mesa.status} />
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Body */}
                <div className={styles.body}>
                    {/* DISPONIVEL */}
                    {mesa.status === 'DISPONIVEL' && (
                        <div className={styles.section}>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <h3 style={{ color: 'var(--text)', marginBottom: '4px' }}>Novo Atendimento</h3>
                                <p className={styles.description}>Identifique o cliente para iniciar:</p>
                            </div>

                            <input
                                type="text"
                                className={styles.inputNome}
                                placeholder="Ex: João Silva"
                                value={nomeCliente}
                                onChange={(e) => setNomeCliente(e.target.value)}
                                disabled={loading}
                                autoFocus // Foca automaticamente ao abrir
                            />

                            <button
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                onClick={() => exec(() => comandasApi.abrir(mesa.id, nomeCliente))}
                                disabled={loading || !nomeCliente.trim()}
                            >
                                {loading ? <Spinner /> : '▶ Abrir Mesa e Iniciar'}
                            </button>
                        </div>
                    )}

                    {/* OCUPADA */}
                    {mesa.status === 'OCUPADA' && comanda && (
                        <>
                            <ComandaResumo comanda={comanda} />

                            <div className={styles.actions}>
                                <button
                                    className={`${styles.btn} ${styles.btnPrimary}`}
                                    onClick={() => setShowLancar(true)}
                                >
                                    + Lançar Itens
                                </button>

                                <button
                                    className={`${styles.btn} ${styles.btnAmber}`}
                                    onClick={() => exec(() => comandasApi.fechar(comanda.id))}
                                    disabled={loading}
                                >
                                    {loading ? <Spinner /> : '✓ Pedir Conta'}
                                </button>
                            </div>
                        </>
                    )}

                    {/* AGUARDANDO_PAGAMENTO */}
                    {mesa.status === 'AGUARDANDO_PAGAMENTO' && comanda && (
                        <>
                            <ComandaResumo comanda={comanda} />

                            <div className={styles.totalBox}>
                                <span>Total a Receber</span>
                                <span className={styles.totalValue}>
                  R$ {Number(comanda.total).toFixed(2).replace('.', ',')}
                </span>
                            </div>

                            <div className={styles.actions}>
                                {isAdmin && (
                                    <>
                                        <button
                                            className={`${styles.btn} ${styles.btnGreen}`}
                                            onClick={() => exec(() => comandasApi.finalizar(comanda.id))}
                                            disabled={loading}
                                        >
                                            {loading ? <Spinner /> : '💰 Confirmar Pagamento'}
                                        </button>

                                        <button
                                            className={`${styles.btn} ${styles.btnGhost}`}
                                            onClick={() => exec(() => comandasApi.reabrir(comanda.id))}
                                            disabled={loading}
                                        >
                                            ↩ Reabrir Comanda
                                        </button>
                                    </>
                                )}
                                {!isAdmin && (
                                    <p className={styles.waitMsg}>
                                        Aguardando confirmação do administrador.
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {error && <p className={styles.error}>{error}</p>}
                </div>
            </div>
        </div>
    );
}

function ComandaResumo({ comanda }: { comanda: NonNullable<Mesa['comandaAtiva']> }) {
    const { isAdmin } = useAuth();
    const [estornando, setEstornando] = useState<number | null>(null);
    const [, forceUpdate] = useState(0);

    async function estornar(itemId: number) {
        setEstornando(itemId);
        try {
            await comandasApi.estornarItem(comanda.id, itemId);
            const idx = comanda.itens.findIndex(i => i.id === itemId);
            if (idx !== -1) comanda.itens.splice(idx, 1);
            forceUpdate(n => n + 1);
        } catch {
            // silently ignore in this context
        } finally {
            setEstornando(null);
        }
    }

    return (
        <div className={styles.itensSection}>
            <div className={styles.itensHeader}>
                <div className={styles.comandaInfo}>
                    <span className={styles.comandaId}>Itens da Comanda #{comanda.id}</span>
                    {comanda.nomeCliente && (
                        <span className={styles.clienteNome}> - {comanda.nomeCliente.toUpperCase() || "NOME VAZIO (Contatar Thiago)"}</span>
                    )}
                </div>
                <span className={styles.itensCount}>{comanda.itens.length} itens</span>
            </div>

            {comanda.itens.length === 0 ? (
                <p className={styles.emptyItens}>Nenhum item lançado ainda.</p>
            ) : (
                <ul className={styles.itensList}>
                    {comanda.itens.map(item => (
                        <li key={item.id} className={styles.itemRow}>
                            <div className={styles.itemInfo}>
                <span className={styles.itemNome}>
                  {item.nomeProduto}
                    {item.meiaPorcao && <span className={styles.meiaTag}>½</span>}
                </span>
                                <span className={styles.itemQtd}>x{item.quantidade}</span>
                            </div>
                            <div className={styles.itemRight}>
                <span className={styles.itemTotal}>
                  R$ {Number(item.totalItem).toFixed(2).replace('.', ',')}
                </span>
                                {isAdmin && (
                                    <button
                                        className={styles.estornoBtn}
                                        onClick={() => estornar(item.id)}
                                        disabled={estornando === item.id}
                                        title="Estornar item"
                                    >
                                        {estornando === item.id ? '…' : '✕'}
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <div className={styles.subtotal}>
                <span>Subtotal</span>
                <span>R$ {Number(comanda.total).toFixed(2).replace('.', ',')}</span>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        DISPONIVEL: { label: 'Disponível', cls: styles.badgeGreen },
        OCUPADA: { label: 'Ocupada', cls: styles.badgeOrange },
        AGUARDANDO_PAGAMENTO: { label: 'Aguard. Pagamento', cls: styles.badgeAmber },
    };
    const { label, cls } = map[status] ?? { label: status, cls: '' };
    return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

function Spinner() {
    return <span className={styles.spinner} />;
}