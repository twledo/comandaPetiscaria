import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Send, ShoppingBag, Minus, Plus } from 'lucide-react';
import { useCartStore } from '@/context/cartStore';
import { comandasService } from '@/services/comandas.service';
import { useToast } from '@/components/ui/Toaster';
import { formatBRL } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, getTotal, comandaId, clearCart } = useCartStore();
  const toast    = useToast((s) => s.push);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleEnviar = async () => {
    if (!comandaId) {
      toast('error', 'Nenhuma comanda selecionada. Selecione uma mesa primeiro.');
      return;
    }
    try {
      setLoading(true);
      for (const item of items) {
        await comandasService.adicionarItem(comandaId, item.produto.id, {
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          observacao: item.observacao,
          meiaPorcao: item.meiaPorcao,
        });
      }
      clearCart();
      toast('success', 'Pedido enviado com sucesso!');
      onClose();
      navigate('/comanda');
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            className="relative w-full max-w-sm bg-coal-900 border-l border-white/[0.08] flex flex-col shadow-card"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-amber-400" />
                <h2 className="font-display text-lg font-semibold text-white">
                  Pedido Pendente
                </h2>
                {items.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-coal-950 text-[10px] font-bold flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <ShoppingBag size={36} className="text-[var(--text-muted)]" />
                  <p className="text-[var(--text-secondary)] text-sm">Nenhum item adicionado</p>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.cartId}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0  }}
                    exit={{   opacity: 0, x: 20  }}
                    className="card p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {item.produto.nome}
                        </p>
                        {item.meiaPorcao && (
                          <span className="badge badge-amber text-[10px] mt-0.5">½ porção</span>
                        )}
                        {item.observacao && (
                          <p className="text-xs text-[var(--text-muted)] mt-1 italic">
                            "{item.observacao}"
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.cartId)}
                        className="text-rose-400/60 hover:text-rose-400 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <button
                           onClick={() => updateQuantity(item.cartId, -1)}
                           className="w-6 h-6 rounded-md bg-coal-700 border border-white/10 flex items-center justify-center hover:bg-coal-600 transition-colors"
                         >
                           <Minus size={12} />
                         </button>
                         <span className="font-mono text-sm font-semibold w-4 text-center text-white">
                           {item.quantidade}
                         </span>
                         <button
                           onClick={() => updateQuantity(item.cartId, 1)}
                           className="w-6 h-6 rounded-md bg-coal-700 border border-white/10 flex items-center justify-center hover:bg-coal-600 transition-colors"
                         >
                           <Plus size={12} />
                         </button>
                       </div>
                      <span className="font-mono text-sm font-semibold text-amber-400">
                        {formatBRL(item.precoUnitarioFinal * item.quantidade)}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-4 py-4 border-t border-white/[0.06] flex flex-col gap-3">
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-[var(--text-secondary)]">Total do pedido</span>
                   <span className="font-mono text-xl font-bold text-amber-400">
                     {formatBRL(getTotal())}
                   </span>
                 </div>
                <button
                  className="btn-primary w-full"
                  onClick={handleEnviar}
                  disabled={loading}
                >
                  <Send size={15} />
                  {loading ? 'Enviando...' : 'Confirmar Pedido'}
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
