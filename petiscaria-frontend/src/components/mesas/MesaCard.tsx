import type { Mesa } from '../../types';
import styles from './MesaCard.module.css';

interface Props {
  mesa: Mesa;
  onClick: (mesa: Mesa) => void;
}

const STATUS_LABELS: Record<string, string> = {
  DISPONIVEL: 'DISPONÍVEL',
  OCUPADA: 'OCUPADA',
  AGUARDANDO_PAGAMENTO: 'AGUARD. PGTO',
};

export default function MesaCard({ mesa, onClick }: Props) {
  const statusClass = mesa.status.toLowerCase().replace('_', '-');
  const comanda = mesa.comandaAtiva;

  // Tratativa para o total (lidando com o objeto complexo que vimos no JSON)
  const valorTotal = typeof comanda?.total === 'object'
      ? comanda.total.parsedValue
      : comanda?.total;

  return (
      <button
          className={`${styles.card} ${styles[statusClass]} animate-fade`}
          onClick={() => onClick(mesa)}
      >
        <div className={styles.header}>
          <div className={styles.statusGroup}>
            <span className={styles.dot} />
            <span className={styles.statusLabel}>{STATUS_LABELS[mesa.status]}</span>
          </div>

          {/* EXIBIÇÃO DO NOME DO CLIENTE NO TOPO DO CARD */}
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

        <div className={styles.action}>
          {mesa.status === 'DISPONIVEL' && 'Iniciar →'}
          {mesa.status === 'OCUPADA' && 'Lançar item →'}
          {mesa.status === 'AGUARDANDO_PAGAMENTO' && 'Ver conta →'}
        </div>
      </button>
  );
}