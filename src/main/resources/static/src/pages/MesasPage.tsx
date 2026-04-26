import { useState } from 'react';
import { Users, Filter } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import MesaCard from '@/components/mesas/MesaCard';
import MesaModal from '@/components/mesas/MesaModal'; // O modal "central" que fizemos
import { useMesas } from '@/hooks/useMesas';
import clsx from 'clsx';

export default function MesasPage() {
    const { mesas, loading, refresh } = useMesas();
    const [filtro, setFiltro] = useState<'TODAS' | 'LIVRES' | 'OCUPADAS'>('TODAS');
    const [mesaSelecionada, setMesaSelecionada] = useState<any | null>(null);

    const filtradas = mesas.filter(m => {
        if (filtro === 'LIVRES') return !m.ocupada;
        if (filtro === 'OCUPADAS') return m.ocupada;
        return true;
    });

    return (
        <div className="flex flex-col h-full bg-coal-950">
            <PageHeader
                title="Salão"
                subtitle="Gerenciamento de mesas em tempo real"
                actions={
                    <div className="flex bg-coal-800 p-1 rounded-lg border border-white/5">
                        {(['TODAS', 'LIVRES', 'OCUPADAS'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFiltro(f)}
                                className={clsx(
                                    "px-3 py-1.5 text-[10px] font-bold rounded-md transition-all",
                                    filtro === f ? "bg-amber-500 text-black shadow-glow-amber" : "text-zinc-500 hover:text-white"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                }
            />

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filtradas.map((mesa, idx) => (
                    <MesaCard
                        key={mesa.id}
                        mesa={mesa}
                        index={idx}
                        onClick={() => setMesaSelecionada(mesa)}
                    />
                ))}
            </div>

            <MesaModal
                mesa={mesaSelecionada}
                onClose={() => setMesaSelecionada(null)}
                onRefresh={refresh}
            />
        </div>
    );
}