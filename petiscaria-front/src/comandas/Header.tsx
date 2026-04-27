import React from 'react';
import { Calendar, Clock } from 'lucide-react';

const Header = ({ titulo }) => {
    const dataHoje = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long'
    });

    return (
        <header className="h-16 md:h-20 bg-[#0f1115]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 md:px-10 sticky top-0 z-40">
            <div className="flex flex-col">
                <div className="flex items-center gap-1 md:gap-2 text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">
                    <span>Dashboard</span>
                    <span className="text-amber-500">/</span>
                    <span className="text-gray-300">{titulo}</span>
                </div>
                <h2 className="text-lg md:text-xl font-black text-white italic uppercase tracking-tight">
                    Painel de <span className="text-amber-500 italic">Controle</span>
                </h2>
            </div>

            <div className="hidden md:flex items-center gap-6">
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 text-amber-500">
                        <Calendar size={14} />
                        <span className="text-[12px] font-black uppercase">{dataHoje}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                        <Clock size={12} />
                        <span className="text-[10px] font-bold uppercase">Sistema Online</span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;