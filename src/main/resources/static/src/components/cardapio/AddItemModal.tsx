import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Scissors, ShoppingBag, X } from 'lucide-react';
import type { Produto } from '@/types';
import { formatBRL } from '@/utils/formatters';
import { useCartStore } from '@/context/cartStore';
import { useToast } from '@/components/ui/Toaster';

interface AddItemModalProps {
  produto: Produto | null;
  onClose: () => void;
}

export default function AddItemModal({ produto, onClose }: AddItemModalProps) {
  const [qtd,       setQtd]       = useState(1);
  const [meia,      setMeia]      = useState(false);
  const [obs,       setObs]       = useState('');
  const addItem = useCartStore((s) => s.addItem);
  const toast   = useToast((s) => s.push);

  const open = !!produto;

  const precoFinal = produto
    ? meia
      ? parseFloat((produto.preco * 0.6).toFixed(2))
      : produto.preco
    : 0;

  const handleAdd = () => {
    if (!produto) return;
    addItem(produto, qtd, meia, obs);
    toast('success', `${qtd}× ${produto.nome} adicionado à comanda`);
    onClose();
    setQtd(1); setMeia(false); setObs('');
  };

  return (
    <AnimatePresence>
      {open && produto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-sm bg-coal-800 border border-white/[0.08] rounded-2xl shadow-card overflow-hidden"
            initial={{ opacity: 0, y: 60  }}
            animate={{ opacity: 1, y: 0   }}
            exit={{   opacity: 0, y: 60   }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex items-start justify-between">
              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest mb-1">
                  Adicionar item
                </p>
                <h2 className="font-display text-xl font-semibold text-white leading-tight">
                  {produto.nome}
                </h2>
                {produto.descricao && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">{produto.descricao}</p>
                )}
              </div>
              <button onClick={onClose} className="btn-ghost p-1 mt-0.5">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              {/* Meia porção toggle */}
              {produto.permiteMeia && (
                <button
                  onClick={() => setMeia(!meia)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    meia
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-coal-700 border-white/10 text-[var(--text-secondary)] hover:border-white/20'
                  }`}
                >
                  <Scissors size={16} />
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium">Meia Porção</p>
                    <p className="text-xs opacity-70">60% do valor ({formatBRL(produto.preco * 0.6)})</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    meia ? 'border-amber-400 bg-amber-400' : 'border-white/30'
                  }`}>
                    {meia && <div className="w-2 h-2 rounded-full bg-coal-950" />}
                  </div>
                </button>
              )}

              {/* Quantidade */}
              <div>
                <label className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest mb-2 block">
                  Quantidade
                </label>
                <div className="flex items-center gap-4 bg-coal-900 rounded-xl p-3 border border-white/[0.06]">
                  <button
                    onClick={() => setQtd((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg bg-coal-700 hover:bg-coal-600 border border-white/10 flex items-center justify-center transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="flex-1 text-center font-mono text-2xl font-semibold text-white">
                    {qtd}
                  </span>
                  <button
                    onClick={() => setQtd((q) => q + 1)}
                    className="w-9 h-9 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-coal-950 shadow-glow-amber transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Observação */}
              <div>
                <label className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest mb-2 block">
                  Observação
                </label>
                <textarea
                  className="input resize-none h-20 text-sm"
                  placeholder="Ex: sem cebola, bem passado..."
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                />
              </div>

              {/* Subtotal + CTA */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Subtotal</p>
                  <p className="font-mono text-xl font-bold text-amber-400">
                    {formatBRL(precoFinal * qtd)}
                  </p>
                  {meia && (
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {formatBRL(precoFinal)} × {qtd}
                    </p>
                  )}
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAdd}
                  className="btn-primary gap-2 px-6"
                >
                  <ShoppingBag size={15} />
                  Adicionar
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
