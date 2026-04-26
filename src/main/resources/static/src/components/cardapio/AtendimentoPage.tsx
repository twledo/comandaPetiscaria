import { useState } from 'react';
import { Plus, Search, Utensils, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '@/components/ui/PageHeader';
import { useMesas } from '@/hooks/useMesas';
import MesaModal from '@/components/mesas/MesaModal';
import EmptyState from '@/components/ui/EmptyState';
import { formatBRL } from '@/utils/formatters';

export default function AtendimentoPage() {
  const { mesas, refresh } = useMesas();
  const [busca, setBusca] = useState('');
  const [selecionada, setSelecionada] = useState<any | null>(null);
  const [mostrarLivres, setMostrarLivres] = useState(false);

  // Filtros por status
  const ativas = mesas.filter(m =>
    m.ocupada && m.id.toString().includes(busca)
  );

  const livres = mesas.filter(m =>
    !m.ocupada && m.id.toString().includes(busca)
  );

  // Total de mesas ativas
  const totalAtivo = mesas.reduce((sum, m) => sum + (m.valorTotal || 0), 0);

  return (
    <div className="flex flex-col h-full bg-coal-950">
      <PageHeader
        title="Atendimento"
        subtitle={`${ativas.length} mesas ativas • Total: ${formatBRL(totalAtivo)}`}
        actions={
          <button
            onClick={() => setSelecionada({ novoAtendimento: true })}
            className="btn-primary gap-2 flex items-center"
          >
            <Plus size={18} /> Nova Mesa
          </button>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
        {/* Barra de Busca */}
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Buscar mesa por número..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <button
            onClick={() => setMostrarLivres(!mostrarLivres)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              mostrarLivres
                ? 'bg-amber-500 text-black'
                : 'bg-coal-800 text-zinc-400 border border-white/10 hover:border-white/20'
            }`}
          >
            {mostrarLivres ? 'Todas' : 'Ativas'}
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">
          {!mostrarLivres && ativas.length > 0 ? (
            /* MESAS ATIVAS */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {ativas.map((mesa, idx) => (
                <motion.div
                  key={mesa.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelecionada(mesa)}
                  className="group card p-5 border-l-4 border-l-amber-500 hover:scale-[1.02] cursor-pointer transition-all bg-gradient-to-br from-coal-800/80 to-coal-800/40 hover:from-coal-800 hover:to-coal-700"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Mesa</span>
                      <h3 className="text-4xl font-black text-white group-hover:text-amber-400 transition-colors">
                        {String(mesa.id).padStart(2, '0')}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Total</span>
                      <p className="text-xl font-bold text-amber-400">{formatBRL(mesa.valorTotal || 0)}</p>
                    </div>
                  </div>

                  <motion.div
                    layout
                    className="flex items-center justify-between gap-2 text-zinc-400 text-xs bg-white/5 p-2 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Utensils size={14} className="text-amber-500" />
                      <span>{mesa.qtdItens || 0} itens</span>
                    </div>
                    {(mesa.comandaId) && (
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-1 rounded">
                        Cmd #{mesa.comandaId}
                      </span>
                    )}
                  </motion.div>
                </motion.div>
              ))}
            </div>
          ) : mostrarLivres && livres.length > 0 ? (
            /* MESAS LIVRES */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {livres.map((mesa, idx) => (
                <motion.div
                  key={mesa.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelecionada(mesa)}
                  className="group card p-5 border-l-4 border-l-jade-500 hover:scale-[1.02] cursor-pointer transition-all bg-gradient-to-br from-coal-800/50 to-coal-800/20 hover:from-coal-700 hover:to-coal-700/50"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Mesa</span>
                      <h3 className="text-4xl font-black text-zinc-600 group-hover:text-jade-400 transition-colors">
                        {String(mesa.id).padStart(2, '0')}
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-jade-500/20 border border-jade-500/30 flex items-center justify-center">
                      <Coffee size={18} className="text-jade-400" />
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500 font-mono">DISPONÍVEL</div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* VAZIO */
            <EmptyState
              icon={mostrarLivres ? Coffee : Utensils}
              title={mostrarLivres ? 'Nenhuma mesa livre' : 'Nenhuma mesa ativa'}
              description={mostrarLivres
                ? 'Todas as mesas estão sendo atendidas'
                : `Pressione "Nova Mesa" para iniciar um novo atendimento`
              }
              action={
                !mostrarLivres && (
                  <button
                    onClick={() => setSelecionada({ novoAtendimento: true })}
                    className="btn-primary gap-2 mt-4"
                  >
                    <Plus size={16} /> Abrir Mesa
                  </button>
                )
              }
            />
          )}
        </div>
      </div>

      {/* Modal Central */}
      <MesaModal
        mesa={selecionada}
        onClose={() => setSelecionada(null)}
        onRefresh={refresh}
      />
    </div>
  );
}