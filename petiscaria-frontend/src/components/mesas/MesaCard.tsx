import type { Mesa } from '../../types';
import styles from './MesaCard.module.css';

interface Props {
  mesa: Mesa;
  statusLabel: string; // <-- NOVA PROP
  onClick: (mesa: Mesa) => void;
}

export default function MesaCard({ mesa, statusLabel, onClick }: Props) {
  const statusClass = mesa.status.toLowerCase().replace('_', '-');
  const comanda = mesa.comandaAtiva;

  const valorTotal = typeof comanda?.total === 'object'
      ? (comanda.total as any).parsedValue
      : comanda?.total;

  return (
      <button
          className={`${styles.card} ${styles[statusClass]} animate-fade`}
          onClick={() => onClick(mesa)}
      >
        <div className={styles.header}>
          <div className={styles.statusGroup}>
            <span className={styles.dot} />
            <span className={styles.statusLabel}>{statusLabel}</span>
          </div>
          {comanda?.nomeCliente && (
              <span className={styles.clienteNome} title={comanda.nomeCliente}>
                {comanda.nomeCliente.toUpperCase()}
          </span>
          )}
        </div>
        <div className={styles.numero}>{mesa.numero}</div>
        {valorTotal !== undefined && valorTotal !== null && (
            <div className={styles.total}>
              R$ {Number(valorTotal).toFixed(2).replace('.', ',')}
            </div>
        )}
      </button>
  );
}