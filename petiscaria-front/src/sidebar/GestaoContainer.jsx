import React, { useState } from 'react';
import { PackagePlus, CircleDollarSign } from 'lucide-react';
import CadastroProdutos from './gestao/CadastroProduto.jsx';
import Recebimento from './gestao/Recebimento';

const GestaoContainer = () => {
    const [subAba, setSubAba] = useState('cadastro');

    return (
        <div className="space-y-6">
            {/* Sub-menu de navegação interna */}
            <div className="flex gap-4 bg-black/20 p-2 rounded-2xl border border-white/5 w-fit">
                <button
                    onClick={() => setSubAba('cadastro')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all
                    ${subAba === 'cadastro' ? 'bg-amber-500 text-black' : 'text-gray-500 hover:text-white'}`}
                >
                    <PackagePlus size={18} />
                    Produtos
                </button>
                <button
                    onClick={() => setSubAba('recebimento')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all
                    ${subAba === 'recebimento' ? 'bg-amber-500 text-black' : 'text-gray-500 hover:text-white'}`}
                >
                    <CircleDollarSign size={18} />
                    Recebimento
                </button>
            </div>

            {/* Conteúdo Dinâmico da Sub-aba */}
            <div className="bg-[#16181d] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                {subAba === 'cadastro' ? <CadastroProdutos /> : <Recebimento />}
            </div>
        </div>
    );
};

export default GestaoContainer;