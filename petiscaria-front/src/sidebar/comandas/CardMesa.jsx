import React from 'react';
import { User, Clock, CheckCircle2 } from 'lucide-react';

export default function CardMesa({ mesa, onClick }) {
    const statusConfig = {
        DISPONIVEL: {
            bg: 'bg-[#16181d]',
            border: 'border-white/5',
            text: 'text-gray-500',
            icon: <User size={20} />,
            label: 'Livre'
        },
        OCUPADA: {
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            text: 'text-amber-500',
            icon: <Clock size={20} />,
            label: 'Em consumo'
        },
        AGUARDANDO_PAGAMENTO: {
            bg: 'bg-green-500/10',
            border: 'border-green-500/20',
            text: 'text-green-500',
            icon: <CheckCircle2 size={20} />,
            label: 'Financeiro'
        }
    };

    const config = statusConfig[mesa.status];

    return (
        <button
            onClick={onClick}
            className={`${config.bg} ${config.border} border-2 rounded-[2.5rem] p-6 flex flex-col items-center gap-4 transition-all hover:scale-105 hover:border-white/20 active:scale-95 group`}
        >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${config.text} bg-black/20 group-hover:bg-black/40 transition-colors`}>
                <span className="text-2xl font-black">{mesa.numero}</span>
            </div>

            <div className="text-center">
                <p className={`text-[10px] font-black uppercase tracking-tighter ${config.text}`}>
                    {config.label}
                </p>
                {mesa.comandaAtiva && (
                    <p className="text-white font-black text-sm mt-1">
                        R$ {mesa.comandaAtiva.total.toFixed(2)}
                    </p>
                )}
            </div>
        </button>
    );
}