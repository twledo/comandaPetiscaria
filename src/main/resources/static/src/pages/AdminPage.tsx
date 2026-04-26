import { useState } from 'react';
import { ShoppingBag, CreditCard, Plus, Search, MoreVertical, ToggleLeft, Trash2, Edit, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '@/components/ui/PageHeader';
import { useProdutos } from '@/hooks/useProdutos';
import { useComandas } from '@/hooks/useComandas';
import { produtosService } from '@/services/produtos.service';
import { comandasService } from '@/services/comandas.service';
import { useToast } from '@/components/ui/Toaster';
import { formatBRL, categoriaLabel } from '@/utils/formatters';
import type { Produto } from '@/types';

type Tab = 'produtos' | 'caixa';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('produtos');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [buscaCaixa, setBuscaCaixa] = useState('');
  const [novoProdutoForm, setNovoProdutoForm] = useState<Partial<Produto> | null>(null);

  const { produtos, refresh: refreshProdutos } = useProdutos();
  const { comandas, refresh: refreshComandasas } = useComandas();
  const toast = useToast(s => s.push);

  // Filtros
  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
  );

  const comandasFiltradas = comandas.filter(c =>
    c.mesaId.toString().includes(buscaCaixa) && c.status === 'ABERTA'
  );

  const totalCaixa = comandasFiltradas.reduce((sum, c) => sum + c.total, 0);

  // Handlers
  const handleToggleDisponibilidade = async (produtoId: number) => {
    try {
      await produtosService.toggleDisponibilidade(produtoId);
      toast('success', 'Disponibilidade atualizada!');
      refreshProdutos();
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const handleFecharComanda = async (comandaId: number) => {
    try {
      await comandasService.fechar(comandaId);
      toast('success', 'Comanda fechada!');
      refreshComandasas();
    } catch (e: any) {
      toast('error', 'Erro ao fechar comanda');
    }
  };

  return (
    <div className="flex flex-col h-full bg-coal-950">
      <PageHeader
        title="Administração"
        subtitle={activeTab === 'produtos' ? 'Gestão de produtos' : 'Gestão de pagamentos'}
      />

      {/* Abas */}
      <div className="flex border-b border-white/[0.06] bg-coal-900/50 sticky top-0 z-10 px-6">
        {[
          { id: 'produtos', label: 'Produtos', icon: ShoppingBag },
          { id: 'caixa', label: 'Caixa', icon: CreditCard },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === (tab.id as Tab);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all relative ${
                isActive
                  ? 'text-amber-400'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400"
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo das Abas */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === 'produtos' ? (
            /* --- ABA PRODUTOS --- */
            <motion.div
              key="produtos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4 p-6 h-full overflow-hidden"
            >
              {/* Barra de Busca + Botão */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar produto..."
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    className="input pl-10"
                  />
                </div>
                <button
                  onClick={() => setNovoProdutoForm({})}
                  className="btn-primary gap-2 flex-shrink-0"
                >
                  <Plus size={18} /> Novo
                </button>
              </div>

              {/* Lista de Produtos */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {produtosFiltrados.length > 0 ? (
                  produtosFiltrados.map((p, idx) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="card p-4 flex items-center justify-between group hover:bg-coal-700/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-white truncate">{p.nome}</h3>
                          {!p.disponivel && (
                            <span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">Indisponível</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400">
                          <span className="font-mono font-bold text-amber-400">{formatBRL(p.preco)}</span>
                          <span className="text-zinc-600">{categoriaLabel[p.categoria]}</span>
                          {p.permiteMeia && <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Meia</span>}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleToggleDisponibilidade(p.id)}
                          className={`btn-icon ${p.disponivel ? 'bg-jade-500/20 text-jade-400' : 'bg-coal-700 text-zinc-500'}`}
                          title={p.disponivel ? 'Disponível' : 'Indisponível'}
                        >
                          <ToggleLeft size={16} />
                        </button>
                        <button className="btn-icon bg-coal-700 text-zinc-400 hover:text-white">
                          <Edit size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 text-zinc-500">
                    Nenhum produto encontrado
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* --- ABA CAIXA --- */
            <motion.div
              key="caixa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4 p-6 h-full overflow-hidden"
            >
              {/* Barra de Busca + Total */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por mesa..."
                    value={buscaCaixa}
                    onChange={(e) => setBuscaCaixa(e.target.value)}
                    className="input pl-10"
                  />
                </div>
                <div className="card px-4 py-2.5 text-right">
                  <p className="text-xs text-zinc-400 uppercase font-mono">Total em Aberto</p>
                  <p className="text-2xl font-black text-jade-400">{formatBRL(totalCaixa)}</p>
                </div>
              </div>

              {/* Lista de Comandas */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {comandasFiltradas.length > 0 ? (
                  comandasFiltradas.map((c, idx) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="card p-4 flex items-center justify-between group hover:bg-coal-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-coal-700/50 border border-white/10 flex items-center justify-center font-bold text-lg text-amber-400">
                          {String(c.mesaId).padStart(2, '0')}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">Comanda #{c.id}</p>
                          <p className="text-xs text-zinc-400">{c.itens?.length || 0} items</p>
                        </div>
                      </div>

                      {/* Valor + Botão */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-black text-jade-400">{formatBRL(c.total)}</p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleFecharComanda(c.id)}
                          className="px-4 py-2.5 bg-jade-500 hover:bg-jade-400 text-coal-950 font-bold text-sm rounded-lg transition-colors shadow-glow-jade"
                        >
                          Receber
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 text-zinc-500">
                    Nenhuma comanda aberta
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}