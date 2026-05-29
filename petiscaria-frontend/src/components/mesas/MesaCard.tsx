import type { Mesa } from '../../types';
import styles from './MesaCard.module.css';

interface Props {
    mesa: Mesa;
    statusLabel: string;
    onClick: () => void;
}

const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

const getShortLabel = (status: string) => {
    switch (status) {
        case 'DISPONIVEL': return 'Disp.';
        case 'OCUPADA': return 'Ocup.';
        case 'AGUARDANDO_PAGAMENTO': return 'A. Pgto.';
        default: return status.substring(0, 6) + '.';
    }
};

export default function MesaCard({ mesa, statusLabel, onClick }: Props) {
    const isDisponivel = mesa.status === 'DISPONIVEL';
    const statusClass = styles[mesa.status] || styles.DEFAULT;
    const comanda = mesa.comandaAtiva;

    return (
        <div className={`${styles.card} ${statusClass}`} onClick={onClick}>
            <div className={styles.topBar} />

            <div className={styles.header}>
                <div className={styles.statusBadge}>
                    <span className={styles.dot} />
                    {getShortLabel(mesa.status)}
                </div>
                <h3 className={styles.numero}>
                    <span className={styles.prefix}>Mesa</span> {mesa.numero}
                </h3>
            </div>

            <div className={styles.body}>
                {!isDisponivel && comanda?.nomeCliente ? (
                    <span className={styles.clienteNome}>{comanda.nomeCliente}</span>
                ) : (
                    <span className={styles.clienteEmpty}>Livre</span>
                )}
            </div>

            {/* Rodapé fixo para evitar desalinhamento */}
            <div className={styles.footer}>
                {!isDisponivel && comanda ? (
                    <>
                        <span className={styles.atendente}>
                            {comanda.ultimoAtendente || '—'}
                        </span>
                        <span className={styles.total}>
                            {formatarMoeda(Number(comanda.total || 0))}
                        </span>
                    </>
                ) : (
                    <>
                        <span className={styles.atendente}>—</span>
                        <span className={styles.total} style={{ color: 'var(--text-3)' }}>—</span>
                    </>
                )}
            </div>
        </div>
    );
}