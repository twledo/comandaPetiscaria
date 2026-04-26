import { motion } from 'framer-motion';
import { Users, CircleDot, Clock } from 'lucide-react'; // Adicionei o Clock para o estilo pendente
import type { MesaUI } from '@/types';
import { formatBRL, statusComandaLabel, statusComandaColor } from '@/utils/formatters';
import clsx from 'clsx';

interface MesaCardProps {
  mesa: MesaUI;
  index: number;
  onClick: (mesa: MesaUI) => void;
}

export default function MesaCard({ mesa, index, onClick }: MesaCardProps) {
  const { id, ocupada, comanda } = mesa;

  return (
      <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.3 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onClick(mesa)}
          className={clsx(
              'card-hover text-left p-4 w-full flex flex-col gap-3 cursor-pointer transition-all duration-300',
              // --- LÓGICA DE CORES DE FUNDO ---
              ocupada
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]' // Cor de "Pendente"
                  : 'bg-coal-900 border-white/5' // Cor de "Livre"
          )}
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {ocupada ? (
                <Clock size={15} className="text-amber-400" />
            ) : (
                <Users size={15} className="text-[var(--text-muted)]" />
            )}
            <span className={clsx(
                "font-mono text-xs uppercase tracking-widest",
                ocupada ? "text-amber-400/80" : "text-[var(--text-muted)]"
            )}>
            Mesa
          </span>
          </div>
          <CircleDot
              size={10}
              className={clsx(
                  ocupada ? 'text-amber-400 animate-pulse-slow' : 'text-jade-400',
              )}
          />
        </div>

        {/* Number */}
        <div className={clsx(
            'font-display text-4xl font-semibold leading-none transition-colors',
            ocupada ? 'text-amber-400' : 'text-white',
        )}>
          {String(id).padStart(2, '0')}
        </div>

        {/* Status / value */}
        <div className="flex items-center justify-between mt-auto">
          {ocupada && comanda ? (
              <>
            <span className="badge bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
              {statusComandaLabel[comanda.status]}
            </span>
                <span className="font-mono text-sm font-bold text-amber-400">
              {formatBRL(comanda.total)}
            </span>
              </>
          ) : (
              <span className="badge badge-jade text-[10px]">Livre</span>
          )}
        </div>
      </motion.button>
  );
}