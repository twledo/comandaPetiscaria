import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { mesasApi, dominiosApi, caixaApi } from '../api';
import type { Opcao } from '../api';
import type { Mesa, StatusMesa } from '../types';
import MesaCard from '../components/mesas/MesaCard';
import MesaModal from '../components/mesas/MesaModal';
import styles from './MesasPage.module.css';
import { useMesasWebSocket } from "../hook/useMesasWebSocket";

const IconSearch = () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

/* ──────────────────────────────────────────────
   MODAL: CAIXA FECHADO
────────────────────────────────────────────── */
function ModalCaixaFechado({ onNavigate }: { onNavigate: () => void }) {
    return (
        <div className={styles.caixaOverlay}>
            <div className={styles.caixaModal}>
                <div className={styles.caixaIcone}>🔒</div>
                <h2 className={styles.caixaTitulo}>Caixa Fechado</h2>
                <p className={styles.caixaDescricao}>
                    Nenhum turno ativo encontrado. Abra o caixa antes de acessar o mapa de mesas.
                </p>
                <button
                    className={styles.caixaBtnPrimary}
                    onClick={onNavigate}
                >
                    Ir para o Caixa →
                </button>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────
   PÁGINA PRINCIPAL
────────────────────────────────────────────── */
type Page = 'mesas' | 'gestao' | 'caixa';

export default function MesasPage({ onNavigate }: { onNavigate?: (page: Page) => void }) {
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [statusOpcoes, setStatusOpcoes] = useState<Opcao[]>([]);
    const [busca, setBusca] = useState('');
    const [filtro, setFiltro] = useState<StatusMesa | 'TODAS'>('TODAS');
    const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
    const [loading, setLoading] = useState(true);

    // null = verificando, true = aberto, false = fechado
    const [caixaAberto, setCaixaAberto] = useState<boolean | null>(null);

    // Controle responsivo e Portal
    const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await mesasApi.listarTodas();
            setMesas(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Erro ao carregar mesas:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        dominiosApi.buscarTodos()
            .then(res => setStatusOpcoes(res.statusMesa))
            .catch(console.error);

        load();

        // Verifica se há caixa ativo
        caixaApi.buscarAtivo()
            .then(ativo => setCaixaAberto(!!ativo))
            .catch(() => setCaixaAberto(false));
    }, [load]);

    useEffect(() => {
        setPortalTarget(document.getElementById('topbar-actions'));

        const handleResize = () => setIsDesktop(window.innerWidth > 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useMesasWebSocket(useCallback((listaAtualizada: Mesa[]) => {
        setMesas(listaAtualizada);
    }, []));

    useEffect(() => {
        if (selectedMesa) {
            const mesaAtualizada = mesas.find(m => m.id === selectedMesa.id);

            if (mesaAtualizada) {
                if (selectedMesa.status !== 'DISPONIVEL' && mesaAtualizada.status === 'DISPONIVEL') {
                    setSelectedMesa(null);
                    return;
                }
                if (JSON.stringify(mesaAtualizada) !== JSON.stringify(selectedMesa)) {
                    setSelectedMesa(mesaAtualizada);
                }
            } else {
                setSelectedMesa(null);
            }
        }
    }, [mesas, selectedMesa]);

    const { filtered, counts } = useMemo(() => {
        const countsObj: Record<string, number> = { TODAS: mesas.length };
        statusOpcoes.forEach(opt => { countsObj[opt.value] = 0; });

        const filteredList = mesas.filter(mesa => {
            const statusNormalizado = mesa.status?.toUpperCase();

            if (countsObj[statusNormalizado] !== undefined) {
                countsObj[statusNormalizado]++;
            }

            const matchStatus = filtro === 'TODAS' || statusNormalizado === filtro;
            const nomeCliente = mesa.comandaAtiva?.nomeCliente?.toLowerCase() || '';
            const matchBusca = mesa.numero.toString().includes(busca) || nomeCliente.includes(busca.toLowerCase());

            return matchStatus && matchBusca;
        });

        return { filtered: filteredList, counts: countsObj };
    }, [mesas, filtro, busca, statusOpcoes]);

    const getStatusLabel = (status: string) =>
        statusOpcoes.find(s => s.value === status)?.label || status;

    const getShortLabel = (value: string) => {
        switch (value) {
            case 'DISPONIVEL':          return 'Disp.';
            case 'OCUPADA':             return 'Ocup.';
            case 'AGUARDANDO_PAGAMENTO':return 'A. Pgto.';
            default:                    return value.substring(0, 6) + '.';
        }
    };

    const searchBarElement = (
        <div className={styles.actionsGroup}>
            <div className={styles.searchWrapper}>
                <IconSearch />
                <input
                    type="text"
                    placeholder="Buscar mesa ou cliente..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className={styles.searchInput}
                />
            </div>
        </div>
    );

    return (
        <div className={styles.page}>

            {/* ── 1. BARRA DE BUSCA (Portal no desktop, inline no mobile) ── */}
            {isDesktop && portalTarget
                ? createPortal(searchBarElement, portalTarget)
                : searchBarElement
            }

            {/* ── 2. CARDS DE MÉTRICAS / FILTROS ── */}
            <section className={styles.metricFiltersContainer}>
                <button
                    type="button"
                    className={`${styles.metricCard} ${filtro === 'TODAS' ? styles.activeTodas : ''}`}
                    onClick={() => setFiltro('TODAS')}
                >
                    <span className={styles.metricLabel}>Todas</span>
                    <span className={styles.metricNumber}>{counts.TODAS || 0}</span>
                </button>

                {statusOpcoes.map(f => {
                    const colorClass = styles[`active${f.value}`] || styles.activeDefault;
                    return (
                        <button
                            key={f.value}
                            type="button"
                            className={`${styles.metricCard} ${filtro === f.value ? colorClass : ''}`}
                            onClick={() => setFiltro(f.value as StatusMesa)}
                        >
                            <span className={styles.metricLabel}>{getShortLabel(f.value)}</span>
                            <span className={styles.metricNumber}>{counts[f.value] || 0}</span>
                        </button>
                    );
                })}
            </section>

            {/* ── 3. LISTAGEM DE MESAS ── */}
            <main className={styles.content}>
                {loading ? (
                    <div className={styles.loadingState}>
                        <span className={styles.spinner} />
                        <p>Carregando mapa de mesas...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>Nenhuma mesa encontrada para este filtro.</p>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {filtered.map(mesa => (
                            <MesaCard
                                key={mesa.id}
                                mesa={mesa}
                                statusLabel={getStatusLabel(mesa.status)}
                                onClick={caixaAberto ? () => setSelectedMesa(mesa) : undefined}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* ── 4. MODAL DE MESA SELECIONADA ── */}
            {caixaAberto && selectedMesa && (
                <MesaModal
                    mesa={selectedMesa}
                    statusLabel={getStatusLabel(selectedMesa.status)}
                    onClose={() => setSelectedMesa(null)}
                    onRefresh={async () => { await load(); }}
                />
            )}

            {caixaAberto === false && (
                <ModalCaixaFechado onNavigate={() => onNavigate?.('caixa')} />
            )}
        </div>
    );
}