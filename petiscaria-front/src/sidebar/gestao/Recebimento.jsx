import React from 'react';
import { CircleDollarSign } from 'lucide-react';

const Recebimento = () => {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <CircleDollarSign size={48} className="mb-4 opacity-20" />
            <p className="font-black uppercase italic tracking-widest">Módulo de Recebimento</p>
            <p className="text-xs mt-2 text-gray-600 uppercase">Em desenvolvimento para o Rei do Espetinho</p>
        </div>
    );
};

export default Recebimento;