import { useState } from 'react';
import { ClipboardList, Search, Clock } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useComandas } from '@/hooks/useComandas';
import { formatBRL } from '@/utils/formatters';
import MesaModal from '@/components/mesas/MesaModal';
import type { Comanda } from '@/types';

export default function ComandaPage() {
  const { comandas, loading, refresh } = useComandas();
  const [busca, setBusca] = useState('');
  const [comandaFoco, setComandaFoco] = useState<any | null>(null);

  const filtradas = comandas.filter((c: Comanda) => c.mesaId.toString().includes(busca));

  return (
      <div className="flex flex-col h-full">
        <PageHeader title="Comandas" subtitle="Acompanhamento de pedidos ativos" />

        <div className="px-6 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
                className="input pl-10"
                placeholder="Buscar por número da mesa..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-20">
          {filtradas.map(c => (
              <div
                  key={c.id}
                  onClick={() => setComandaFoco({ id: c.mesaId, ocupada: true, comandaId: c.id, valorTotal: c.total })}
                  className="card p-4 flex items-center justify-between hover:border-amber-500/40 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-coal-800 border border-white/5 flex items-center justify-center font-bold text-lg text-white">
                    {c.mesaId}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Comanda #{c.id}</p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-mono">
                      <Clock size={10} /> Aberta há 22 min
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-amber-400 font-bold text-lg">{formatBRL(c.total)}</p>
                  <p className="text-[10px] text-zinc-500">{c.itens?.length || 0} itens pedidos</p>
                </div>
              </div>
          ))}
        </div>

        {/* Reaproveitamos o MESMO modal da mesa para manter o padrão */}
        <MesaModal
            mesa={comandaFoco}
            onClose={() => setComandaFoco(null)}
            onRefresh={() => {}}
        />
      </div>
  );
}