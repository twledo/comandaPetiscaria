import type { Mesa } from '../../types';
import styles from './MesaCard.module.css';

interface Props {
  mesa: Mesa;
  onClick: (mesa: Mesa) => void;
}

const STATUS_LABELS: Record<string, string> = {
  DISPONIVEL: 'Disponível',
  OCUPADA: 'Ocupada',
  AGUARDANDO_PAGAMENTO: 'Aguard. Pgto',
};

export default function MesaCard({ mesa, onClick }: Props) {
  const status = mesa.status.toLowerCase().replace('_', '-');
  const total = mesa.comandaAtiva?.total;

  return (
    <button
      className={`${styles.card} ${styles[status]} animate-fade`}
      onClick={() => onClick(mesa)}
    >
      <div className={styles.header}>
        <span className={styles.dot} />
        <span className={styles.statusLabel}>{STATUS_LABELS[mesa.status]}</span>
      </div>

      <div className={styles.numero}>{mesa.numero}</div>

      {total !== undefined && total !== null && (
        <div className={styles.total}>
          R$ {Number(total).toFixed(2).replace('.', ',')}
        </div>
      )}

      {mesa.status === 'DISPONIVEL' && (
        <div className={styles.action}>Iniciar →</div>
      )}
      {mesa.status === 'OCUPADA' && (
        <div className={styles.action}>Lançar item →</div>
      )}
      {mesa.status === 'AGUARDANDO_PAGAMENTO' && (
        <div className={styles.action}>Ver conta →</div>
      )}
    </button>
  );
}