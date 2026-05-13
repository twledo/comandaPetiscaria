import { mesasApi, dominiosApi } from '../api';
import type { Opcao } from '../api'; // <--- Faltou o "type" bem aqui!
import type { Mesa, StatusMesa } from '../types';
import MesaCard from '../components/mesas/MesaCard';
import MesaModal from '../components/mesas/MesaModal';
import styles from './MesasPage.module.css';
import { useMesasWebSocket } from "../hook/useMesasWebSocket";
import {useCallback, useEffect, useMemo, useState} from "react";

export default function MesasPage() {
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [statusOpcoes, setStatusOpcoes] = useState<Opcao[]>([]); // <-- FILTROS DINÂMICOS
    const [busca, setBusca] = useState('');
    const [filtro, setFiltro] = useState<StatusMesa | 'TODAS'>('TODAS');
    const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
    const [loading, setLoading] = useState(true);

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
        // Busca os status do backend
        dominiosApi.buscarTodos().then(res => setStatusOpcoes(res.statusMesa)).catch(console.error);
        load();
    }, [load]);

    useMesasWebSocket(useCallback((listaAtualizada: Mesa[]) => {
        setMesas(listaAtualizada);
    }, []));

    useEffect(() => {
        if (selectedMesa) {
            const mesaAtualizada = mesas.find(m => m.id === selectedMesa.id);

            if (mesaAtualizada) {
                // 🛑 A MÁGICA ESTÁ AQUI (Proteção contra o WebSocket):
                // Se a mesa estava ocupada e de repente o websocket avisou que ela ficou DISPONIVEL
                // (porque foi paga), a gente FECHA o modal na raiz. Isso mata o bug do "Novo Atendimento".
                if (selectedMesa.status !== 'DISPONIVEL' && mesaAtualizada.status === 'DISPONIVEL') {
                    setSelectedMesa(null);
                    return;
                }

                // Se mudou outra coisa (ex: lançou um item novo), atualiza normal
                if (JSON.stringify(mesaAtualizada) !== JSON.stringify(selectedMesa)) {
                    setSelectedMesa(mesaAtualizada);
                }
            } else {
                // Se a mesa sumir do banco de dados por algum motivo
                setSelectedMesa(null);
            }
        }
    }, [mesas, selectedMesa]);

    const { filtered, counts } = useMemo(() => {
        const countsObj = { DISPONIVEL: 0, OCUPADA: 0, AGUARDANDO_PAGAMENTO: 0 };

        const filteredList = mesas.filter(mesa => {
            const statusNormalizado = mesa.status?.toUpperCase() as keyof typeof countsObj;
            if (statusNormalizado in countsObj) countsObj[statusNormalizado]++;

            const matchStatus = filtro === 'TODAS' || statusNormalizado === filtro;
            const nomeCliente = mesa.comandaAtiva?.nomeCliente?.toLowerCase() || '';
            const matchBusca = mesa.numero.toString().includes(busca) || nomeCliente.includes(busca.toLowerCase());

            return matchStatus && matchBusca;
        });

        return { filtered: filteredList, counts: countsObj };
    }, [mesas, filtro, busca]);

    // Função para traduzir o status da mesa de forma dinâmica para o Card
    const getStatusLabel = (status: string) => {
        return statusOpcoes.find(s => s.value === status)?.label || status;
    };

    return (
        <div className={styles.page}>
            <header className={styles.summary}>
                <div className={`${styles.summaryCard} ${styles.green}`}>
                    <span className={styles.summaryNum}>{counts.DISPONIVEL}</span>
                    <span className={styles.summaryLabel}>Disponíveis</span>
                </div>
                <div className={`${styles.summaryCard} ${styles.orange}`}>
                    <span className={styles.summaryNum}>{counts.OCUPADA}</span>
                    <span className={styles.summaryLabel}>Ocupadas</span>
                </div>
                <div className={`${styles.summaryCard} ${styles.amber}`}>
                    <span className={styles.summaryNum}>{counts.AGUARDANDO_PAGAMENTO}</span>
                    <span className={styles.summaryLabel}>Aguard. Pgto</span>
                </div>
            </header>

            <nav className={styles.filters}>
                <div className={styles.filterGroup}>
                    {/* Botão Fixo de Todas */}
                    <button
                        className={`${styles.filterBtn} ${filtro === 'TODAS' ? styles.active : ''}`}
                        onClick={() => setFiltro('TODAS')}
                    >
                        Todas
                    </button>
                    {/* Filtros Dinâmicos */}
                    {statusOpcoes.map(f => (
                        <button
                            key={f.value}
                            className={`${styles.filterBtn} ${filtro === f.value ? styles.active : ''}`}
                            onClick={() => setFiltro(f.value as StatusMesa)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className={styles.actionsGroup}>
                    <div className={styles.searchWrapper}>
                        <input
                            type="text"
                            placeholder="Buscar mesa ou cliente..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                    <button className={styles.refreshBtn} onClick={load} title="Atualizar agora">↻</button>
                </div>
            </nav>

            <main className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>
                        <span className={styles.spinner} />
                        <p>Carregando mesas...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={styles.empty}>
                        <p>Nenhuma mesa encontrada.</p>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {filtered.map(mesa => (
                            <MesaCard
                                key={mesa.id}
                                mesa={mesa}
                                statusLabel={getStatusLabel(mesa.status)}
                                onClick={() => setSelectedMesa(mesa)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {selectedMesa && (
                <MesaModal
                    mesa={selectedMesa}
                    statusLabel={getStatusLabel(selectedMesa.status)} // <-- Passando pro Modal também
                    onClose={() => setSelectedMesa(null)}
                    onRefresh={async () => { await load(); }}
                />
            )}
        </div>
    );
}