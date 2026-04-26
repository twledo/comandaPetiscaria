import { motion } from 'framer-motion';
import { Plus, Scissors } from 'lucide-react';
import type { Produto } from '@/types';
import { formatBRL } from '@/utils/formatters';
import clsx from 'clsx';

interface ProdutoCardProps {
  produto: Produto;
  index: number;
  onAddClick: (produto: Produto) => void;
}

export default function ProdutoCard({ produto, index, onAddClick }: ProdutoCardProps) {
  const { nome, preco, descricao, disponivel, permiteMeia } = produto;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.28 }}
      className={clsx(
        'card-hover p-4 flex items-start gap-4',
        !disponivel && 'opacity-50 pointer-events-none',
      )}
    >
      {/* Icon square */}
      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-2xl select-none">
        {categoriaEmoji(produto.categoria)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm text-[var(--text-primary)] leading-tight">{nome}</p>
            {descricao && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{descricao}</p>
            )}
          </div>
          <span className="font-mono text-sm font-semibold text-amber-400 shrink-0">
            {formatBRL(preco)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            {permiteMeia && (
              <span className="badge badge-amber text-[10px]">
                <Scissors size={10} />
                Meia
              </span>
            )}
            {!disponivel && (
              <span className="badge badge-muted text-[10px]">Indisponível</span>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onAddClick(produto)}
            className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-coal-950 shadow-glow-amber transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function categoriaEmoji(cat: string): string {
  const map: Record<string, string> = {
    BEBIDAS:    '🍺',
    PORCOES:    '🍗',
    PETISCOS:   '🧆',
    SOBREMESAS: '🍮',
    PRATOS:     '🍽️',
    OUTROS:     '🍴',
  };
  return map[cat] ?? '🍴';
}
