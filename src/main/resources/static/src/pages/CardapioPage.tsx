import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, X, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import ProdutoCard from '@/components/cardapio/ProdutoCard';
import AddItemModal from '@/components/cardapio/AddItemModal';
import CartDrawer from '@/components/cardapio/CartDrawer';
import EmptyState from '@/components/ui/EmptyState';
import { useProdutos } from '@/hooks/useProdutos';
import { useCartStore } from '@/context/cartStore';
import { categoriaLabel } from '@/utils/formatters';
import type { Produto, CategoriaProduto } from '@/types';

const CATEGORIAS: CategoriaProduto[] = [
  'PORCOES', 'BEBIDAS', 'PETISCOS', 'PRATOS', 'SOBREMESAS', 'OUTROS',
];

export default function CardapioPage() {
  const { produtos, loading, error } = useProdutos();
  const cartItems  = useCartStore((s) => s.items);
  const mesaId     = useCartStore((s) => s.mesaId);
  const comandaId  = useCartStore((s) => s.comandaId);

  const [search,       setSearch]       = useState('');
  const [categoria,    setCategoria]    = useState<CategoriaProduto | 'TODOS'>('TODOS');
  const [selected,     setSelected]     = useState<Produto | null>(null);
  const [cartOpen,     setCartOpen]     = useState(false);

  const filtered = useMemo(() => {
    return produtos.filter((p) => {
      const matchCat = categoria === 'TODOS' || p.categoria === categoria;
      const matchQ   = p.nome.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchQ;
    });
  }, [produtos, search, categoria]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Cardápio"
        subtitle={mesaId ? `Mesa ${mesaId}` : 'Selecione uma mesa'}
        actions={
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setCartOpen(true)}
            className="relative btn-icon"
          >
            <ShoppingBag size={18} className="text-[var(--text-secondary)]" />
            <AnimatePresence>
              {cartItems.length > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ember-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-glow-ember"
                >
                  {cartItems.length}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        }
      />

      {/* No mesa warning */}
      {!mesaId && (
        <div className="mx-4 mt-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm shrink-0">
          <AlertTriangle size={15} />
          Nenhuma mesa selecionada — vá para Mesas para abrir uma comanda.
        </div>
      )}

      {/* Search */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
          />
          <input
            className="input pl-10 pr-10"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide shrink-0">
        {(['TODOS', ...CATEGORIAS] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoria(cat)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
              categoria === cat
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-coal-800 border-white/10 text-[var(--text-muted)] hover:border-white/20 hover:text-white'
            }`}
          >
            {cat === 'TODOS' ? 'Todos' : categoriaLabel[cat]}
          </button>
        ))}
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 md:pb-6 flex flex-col gap-2">
        {error && (
          <div className="card border-rose-500/30 p-4 text-sm text-rose-400">
            ⚠ {error}
          </div>
        )}

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum produto encontrado"
            description="Tente mudar os filtros ou a busca"
          />
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((produto, idx) => (
              <ProdutoCard
                key={produto.id}
                produto={produto}
                index={idx}
                onAddClick={setSelected}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Floating cart button (mobile) */}
      <AnimatePresence>
        {cartItems.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0,  opacity: 1 }}
            exit={{   y: 80,  opacity: 0 }}
            className="md:hidden fixed bottom-20 left-4 right-4 z-30"
          >
            <button
              onClick={() => setCartOpen(true)}
              className="w-full btn-primary justify-between px-5 py-3.5 rounded-xl shadow-glow-ember"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} />
                <span>{cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}</span>
              </div>
              <span className="font-mono font-bold">Ver pedido</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AddItemModal produto={selected} onClose={() => setSelected(null)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
