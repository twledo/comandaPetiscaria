import { useState, useEffect, useCallback, useMemo } from 'react'; // useMemo adicionado aqui
import { mesasApi } from '../api';
import type { Mesa, StatusMesa } from 'types';
import MesaCard from '../components/mesas/MesaCard';
import MesaModal from '../components/mesas/MesaModal';
import styles from './MesasPage.module.css';
import { useMesasWebSocket } from "../hook/useMesasWebSocket";

// Definição dos filtros para garantir consistência
const FILTROS: { label: string; value: StatusMesa | 'TODAS' }[] = [
    { label: 'Todas', value: 'TODAS' },
    { label: 'Disponíveis', value: 'DISPONIVEL' },
    { label: 'Ocupadas', value: 'OCUPADA' },
    { label: 'Aguard. Pagto', value: 'AGUARDANDO_PAGAMENTO' },
];

export default function MesasPage() {
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [busca, setBusca] = useState('');
    const [filtro, setFiltro] = useState<StatusMesa | 'TODAS'>('TODAS');
    const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
    const [loading, setLoading] = useState(true);

    // Função para carregar dados da API
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

    // Ciclo de vida e Auto-refresh
    useEffect(() => {
        load();
    }, [load]);

    useMesasWebSocket(useCallback((listaAtualizada: Mesa[]) => {
        setMesas(listaAtualizada);
    }, []));

    // Lógica de Filtro e Contagem (Processa tudo em um único loop)
    const { filtered, counts } = useMemo(() => {
        const countsObj = {
            DISPONIVEL: 0,
            OCUPADA: 0,
            AGUARDANDO_PAGAMENTO: 0,
        };

        const filteredList = mesas.filter(mesa => {
            const statusNormalizado = mesa.status?.toUpperCase() as keyof typeof countsObj;

            if (statusNormalizado in countsObj) {
                countsObj[statusNormalizado]++;
            }

            // Lógica do Filtro de Status
            const matchStatus = filtro === 'TODAS' || statusNormalizado === filtro;

            // Lógica de Busca (Número da mesa ou Nome do Cliente)
            const nomeCliente = mesa.comandaAtiva?.nomeCliente?.toLowerCase() || '';
            const matchBusca = mesa.numero.toString().includes(busca) ||
                nomeCliente.includes(busca.toLowerCase());

            return matchStatus && matchBusca;
        });

        return { filtered: filteredList, counts: countsObj };
    }, [mesas, filtro, busca]);

    return (
        <div className={styles.page}>
            {/* Header com Resumo de Quantidades */}
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

            {/* Barra de Filtros */}
            <nav className={styles.filters}>
                {/* Grupo da Esquerda: Botões de Status */}
                <div className={styles.filterGroup}>
                    {FILTROS.map(f => (
                        <button
                            key={f.value}
                            className={`${styles.filterBtn} ${filtro === f.value ? styles.active : ''}`}
                            onClick={() => setFiltro(f.value)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Grupo da Direita: Busca e Refresh */}
                <div className={styles.actionsGroup}>
                    <div className={styles.searchWrapper}>
                        <span className={styles.searchIcon}>🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar mesa ou cliente..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <button className={styles.refreshBtn} onClick={load} title="Atualizar agora">
                        ↻
                    </button>
                </div>
            </nav>

            {/* Conteúdo Principal */}
            <main className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>
                        <span className={styles.spinner} />
                        <p>Carregando mesas...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={styles.empty}>
                        <p>Nenhuma mesa encontrada com o status: <strong>{filtro}</strong></p>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {filtered.map(mesa => (
                            <MesaCard
                                key={mesa.id}
                                mesa={mesa}
                                onClick={() => setSelectedMesa(mesa)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Modal de Detalhes da Mesa */}
            {selectedMesa && (
                <MesaModal
                    mesa={selectedMesa}
                    onClose={() => setSelectedMesa(null)}
                    onRefresh={async () => {
                        await load();
                        setSelectedMesa(null);
                    }}
                />
            )}
        </div>
    );
}