import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';
import { useCartStore } from '@/context/cartStore';
import { useToast } from '@/components/ui/Toaster';
import { formatBRL } from '@/utils/formatters';
import type { Produto } from '@/types';

interface AddItemModalProps {
  produto: Produto | null;
  onClose: () => void;
}

export default function AddItemModal({ produto, onClose }: AddItemModalProps) {
  const [quantidade, setQuantidade] = useState(1);
  const [meiaPorcao, setMeiaPorcao] = useState(false);
  const [observacao, setObservacao] = useState('');

  const { addItem } = useCartStore();
  const toast = useToast(s => s.push);

  // Reset quando produto muda
  useEffect(() => {
    if (produto) {
      setQuantidade(1);
      setMeiaPorcao(false);
      setObservacao('');
    }
  }, [produto?.id]);

  if (!produto) return null;

  const precoBase = produto.preco;
  const precoFinal = meiaPorcao ? precoBase * 0.6 : precoBase;
  const totalPreview = precoFinal * quantidade;

  const handleAdicionarAoCarrinho = () => {
    addItem(produto, quantidade, meiaPorcao, observacao);
    toast('success', `${produto.nome} adicionado ao pedido!`);
    onClose();
  };

  const incrementarQtd = () => setQuantidade(q => q + 1);
  const decrementarQtd = () => setQuantidade(q => Math.max(1, q - 1));

  return (
    <AnimatePresence>
      {produto && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-sm bg-coal-800 border border-white/[0.08] rounded-2xl shadow-card overflow-hidden"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-coal-900/50">
              <div className="flex-1">
                <h2 className="font-display text-lg font-semibold text-white">{produto.nome}</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{produto.descricao}</p>
              </div>
              <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-6 space-y-6">
              {/* Preço Base */}
              <div className="card p-4 bg-zinc-900/40 border border-white/5">
                <p className="text-xs text-zinc-400 font-mono">Valor Unitário</p>
                <p className="text-2xl font-black text-amber-400 mt-2">{formatBRL(precoBase)}</p>
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">Quantidade</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={decrementarQtd}
                    className="btn-icon bg-coal-700 hover:bg-coal-600 border border-white/10"
                    disabled={quantidade === 1}
                  >
                    <Minus size={18} />
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-3xl font-black text-white">{quantidade}</p>
                  </div>
                  <button
                    onClick={incrementarQtd}
                    className="btn-icon bg-amber-500 hover:bg-amber-400 text-black"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* Meia Porção */}
              {produto.permiteMeia && (
                <div className="card p-4 bg-amber-500/10 border border-amber-500/20">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={meiaPorcao}
                      onChange={(e) => setMeiaPorcao(e.target.checked)}
                      className="w-4 h-4 rounded bg-coal-700 border border-white/20 cursor-pointer accent-amber-400"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">Meia Porção</p>
                      <p className="text-xs text-amber-300 font-mono">60% do valor ({formatBRL(precoBase * 0.6)})</p>
                    </div>
                  </label>
                </div>
              )}

              {/* Observação */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Observação (opcional)</label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex: Muito quente, Sem cebola, Com açúcar..."
                  className="input resize-none h-20"
                />
              </div>

              {/* Preview do Total */}
              <motion.div
                layout
                className="card p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-zinc-400">
                    {formatBRL(precoFinal)} × {quantidade}
                  </span>
                  {meiaPorcao && (
                    <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded">Meia</span>
                  )}
                </div>
                <div className="flex justify-between items-baseline">
                  <p className="text-sm text-zinc-400">Total</p>
                  <p className="text-2xl font-black text-emerald-400">{formatBRL(totalPreview)}</p>
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 bg-coal-900/50 border-t border-white/[0.06] flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdicionarAoCarrinho}
                className="flex-1 btn-primary"
              >
                <Plus size={16} /> Adicionar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

