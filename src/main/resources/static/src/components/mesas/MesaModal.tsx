import { useState, useEffect } from 'react';
import { UtensilsCrossed, ClipboardList, ArrowLeft, Search, Plus, Trash2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/ui/Modal';
import { useProdutos } from '@/hooks/useProdutos';
import { useCartStore } from '@/context/cartStore';
import { comandasService } from '@/services/comandas.service';
import { useToast } from '@/components/ui/Toaster';
import { formatBRL } from '@/utils/formatters';
import AddItemModal from './AddItemModal'; // O seu modal de customização
import type { MesaUI, Produto, Comanda } from '@/types';

interface Props {
  mesa: MesaUI | null;
  onClose: () => void;
  onRefresh: () => void;
}

export default function MesaModal({ mesa, onClose, onRefresh }: Props) {
  const [view, setView] = useState<'detalhes' | 'cardapio'>('detalhes');
  const [busca, setBusca] = useState('');
  const [selectedProd, setSelectedProd] = useState<Produto | null>(null);
  const [comanda, setComanda] = useState<Comanda | null>(null);
  const [carregandoCom, setCarregandoCom] = useState(false);

  const { produtos } = useProdutos();
  const { setMesa, items, clearCart, comandaId } = useCartStore();
  const toast = useToast(s => s.push);

  // Efeito para carregar a comanda completa quando mesa é ocupada
  useEffect(() => {
    if (mesa?.ocupada && mesa?.comandaId) {
      const loadComanda = async () => {
        setCarregandoCom(true);
        try {
          const cmd = await comandasService.buscarPorId(mesa.comandaId!);
          setComanda(cmd);
        } catch (e: any) {
          toast('error', 'Erro ao carregar comanda');
        } finally {
          setCarregandoCom(false);
        }
      };
      loadComanda();
    }
  }, [mesa?.ocupada, mesa?.comandaId]);

  if (!mesa) return null;

  // Filtro de produtos para o cardápio interno
  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) && p.disponivel
  );

  const handleAbrirComanda = async () => {
    try {
      const novaComanda = await comandasService.criar(mesa.id);
      setComanda(novaComanda);
      setMesa(mesa.id, novaComanda.id);
      onRefresh();
      setView('cardapio'); // Já abre o cardápio direto ao abrir mesa
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const handleEnviarPedido = async () => {
    if (items.length === 0) {
      toast('info', 'Nenhum item selecionado');
      return;
    }

    try {
      for (const item of items) {
        await comandasService.adicionarItem(
          comandaId!,
          item.produto.id,
          {
            produtoId: item.produto.id,
            quantidade: item.quantidade,
            meiaPorcao: item.meiaPorcao,
            observacao: item.observacao,
          }
        );
      }
      clearCart();
      toast('success', `${items.length} item(ns) adicionado(s)!`);
      onRefresh();
      // Recarrega a comanda
      if (comandaId) {
        const cmd = await comandasService.buscarPorId(comandaId);
        setComanda(cmd);
      }
      setView('detalhes'); // Volta para os detalhes da mesa
    } catch (e: any) {
      toast('error', 'Falha ao enviar itens');
    }
  };

  return (
    <Modal
      open={!!mesa}
      onClose={() => { setView('detalhes'); clearCart(); onClose(); }}
      title={view === 'detalhes' ? `Mesa ${mesa.id}` : 'Adicionar ao Pedido'}
      size={view === 'cardapio' ? 'lg' : 'md'}
    >
      <AnimatePresence mode="wait">
        {view === 'detalhes' ? (
          /* --- TELA DE DETALHES (HISTÓRICO) --- */
          <motion.div
            key="detalhes"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            {mesa.ocupada && comanda ? (
              <>
                {/* Card da Comanda */}
                <div className="card p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/30">
                  <p className="text-xs text-amber-400 font-mono font-semibold tracking-wider">COMANDA #{comanda.id}</p>
                  <div className="mt-3 flex justify-between items-baseline">
                    <span className="text-sm text-zinc-400">Total Atual</span>
                    <p className="text-3xl font-black text-amber-400">{formatBRL(comanda.total)}</p>
                  </div>
                </div>

                {/* Histórico de Itens */}
                {carregandoCom ? (
                  <div className="text-center py-8 text-zinc-500">Carregando itens...</div>
                ) : comanda.itens && comanda.itens.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">Itens Pedidos</p>
                    {comanda.itens.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="card p-3 bg-zinc-900/40 border border-white/5 flex justify-between items-start gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{item.nomeProduto}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <span className="text-amber-400 font-semibold">{item.quantidade}x</span>
                            {item.meiaPorcao && <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-xs">Meia</span>}
                            {item.statusPreparo && (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                                item.statusPreparo === 'PRONTO' ? 'bg-jade-500/20 text-jade-300' :
                                item.statusPreparo === 'PREPARANDO' ? 'bg-amber-500/20 text-amber-300' :
                                'bg-zinc-700/40 text-zinc-400'
                              }`}>
                                {item.statusPreparo}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-amber-400 font-bold text-sm whitespace-nowrap">
                          {formatBRL(item.precoUnitario * item.quantidade)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-zinc-500 text-sm">Nenhum item pedido ainda</div>
                )}

                {/* Botões de Ação */}
                <button 
                  className="btn-primary w-full gap-2" 
                  onClick={() => { setMesa(mesa.id, mesa.comandaId!); setView('cardapio'); }}
                >
                  <UtensilsCrossed size={16} /> Adicionar Itens
                </button>
              </>
            ) : (
              /* MESA VAZIA */
              <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
                  <UtensilsCrossed size={24} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-zinc-400 font-medium">Mesa Disponível</p>
                  <p className="text-xs text-zinc-500 mt-1">Deseja iniciar um novo atendimento?</p>
                </div>
                <button className="btn-primary w-full" onClick={handleAbrirComanda}>
                  Abrir Mesa
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          /* --- TELA DE CARDÁPIO (DENTRO DO MODAL) --- */
          <motion.div
            key="cardapio"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4 h-[600px] sm:h-[500px]"
          >
            {/* Barra de Busca */}
            <div className="sticky top-0 z-10">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                className="input pl-10 w-full" 
                placeholder="Buscar produto..." 
                value={busca} 
                onChange={e => setBusca(e.target.value)} 
                autoFocus
              />
            </div>

            {/* Lista de Produtos */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {produtosFiltrados.length > 0 ? (
                produtosFiltrados.map((p, idx) => (
                  <motion.div 
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="card p-3 flex justify-between items-center hover:bg-coal-700/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{p.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-amber-400 font-mono font-bold">{formatBRL(p.preco)}</p>
                        {p.permiteMeia && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Meia</span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedProd(p)} 
                      className="btn-icon bg-amber-500 text-black hover:bg-amber-400 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  {busca ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
                </div>
              )}
            </div>

            {/* Carrinho flutuante */}
            <AnimatePresence>
              {items.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl shadow-lg flex justify-between items-center sticky bottom-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-black/20 px-3 py-1 rounded-lg text-black font-bold text-sm">
                      {items.length} {items.length === 1 ? 'item' : 'itens'}
                    </div>
                    <span className="text-black/80 text-sm">
                      {formatBRL(items.reduce((sum, i) => sum + (i.precoUnitarioFinal * i.quantidade), 0))}
                    </span>
                  </div>
                  <button 
                    onClick={handleEnviarPedido} 
                    className="bg-black text-amber-400 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-black/80 transition-colors"
                  >
                    <Send size={14} /> CONFIRMAR
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botão Voltar */}
            <button 
              className="btn-ghost w-full flex items-center justify-center gap-2" 
              onClick={() => setView('detalhes')}
            >
              <ArrowLeft size={16} /> Voltar para Mesa
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Customização (sobreposto) */}
      <AddItemModal
        produto={selectedProd}
        onClose={() => setSelectedProd(null)}
      />
    </Modal>
  );
}