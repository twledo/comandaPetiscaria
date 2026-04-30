import { useState, useEffect, useCallback } from 'react';
import { mesasApi } from '../api';
import type { Mesa, StatusMesa } from 'types';
import MesaCard from '..//components/mesas/MesaCard.tsx';
import MesaModal from '..//components/mesas/MesaModal';
import styles from './MesasPage.module.css';

const FILTROS: { label: string; value: StatusMesa | 'TODAS' }[] = [
    { label: 'Todas', value: 'TODAS' },
    { label: 'Disponíveis', value: 'DISPONIVEL' },
    { label: 'Ocupadas', value: 'OCUPADA' },
    { label: 'Aguard. Pagto', value: 'AGUARDANDO_PAGAMENTO' },
];

export default function MesasPage() {
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [filtro, setFiltro] = useState<StatusMesa | 'TODAS'>('TODAS');
    const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const data = await mesasApi.listarTodas();
            setMesas(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 15000);
        return () => clearInterval(interval);
    }, [load]);

    const filtered = filtro === 'TODAS' ? mesas : mesas.filter(m => m.status === filtro);

    const counts = {
        DISPONIVEL: mesas.filter(m => m.status === 'DISPONIVEL').length,
        OCUPADA: mesas.filter(m => m.status === 'OCUPADA').length,
        AGUARDANDO_PAGAMENTO: mesas.filter(m => m.status === 'AGUARDANDO_PAGAMENTO').length,
    };

    return (
        <div className={styles.page}>
            {/* Summary */}
            <div className={styles.summary}>
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
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                {FILTROS.map(f => (
                    <button
                        key={f.value}
                        className={`${styles.filterBtn} ${filtro === f.value ? styles.active : ''}`}
                        onClick={() => setFiltro(f.value)}
                    >
                        {f.label}
                    </button>
                ))}

                <button className={styles.refreshBtn} onClick={load} title="Atualizar">
                    ↻
                </button>
            </div>

            {/* Grid */}
            {loading ? (
                <div className={styles.loading}>
                    <span className={styles.spinner} />
                    <span>Carregando mesas...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className={styles.empty}>Nenhuma mesa encontrada.</div>
            ) : (
                <div className={styles.grid}>
                    {filtered.map(mesa => (
                        <MesaCard
                            key={mesa.id}
                            mesa={mesa}
                            onClick={setSelectedMesa}
                        />
                    ))}
                </div>
            )}

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