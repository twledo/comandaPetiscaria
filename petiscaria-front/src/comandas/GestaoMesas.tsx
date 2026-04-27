import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, PlusCircle, Receipt, ChevronRight, RefreshCw } from 'lucide-react';
import api from '../api/auth';
import ModalComanda from "./ModalComanda";

export default function GestaoMesas() {
    const [mesas, setMesas] = useState([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [mesaSelecionada, setMesaSelecionada] = useState(null);
    const [tipoAcao, setTipoAcao] = useState('');
    const [atualizando, setAtualizando] = useState(false);
    const [cargo, setCargo] = useState('');

    const fetchMesas = useCallback(async (isManual = false) => {
        if (isManual) setAtualizando(true);
        try {
            const response = await api.get('/comandas/ativas');
            const dadosOrdenados = response.data.sort((a, b) => a.mesaId - b.mesaId);
            setMesas(dadosOrdenados);
        } catch (error) {
            console.error("Erro ao buscar mesas:", error);
        } finally {
            if (isManual) setTimeout(() => setAtualizando(false), 600);
        }
    }, []);

    useEffect(() => {
        fetchMesas();
        // Polling de 5 segundos (corrigido de 500000 para 5000)
        const interval = setInterval(() => fetchMesas(), 5000);
        return () => clearInterval(interval);
    }, [fetchMesas]);

    // Busca o cargo do usuário uma única vez ao montar
    useEffect(() => {
        const stored = localStorage.getItem('@Petiscaria:User');
        if (stored) {
            try {
                setCargo(JSON.parse(stored).cargo);
            } catch (e) {
                console.error("Erro ao ler cargo", e);
            }
        }
    }, []);

    const abrirModal = (mesa, acao) => {
        setMesaSelecionada(mesa);
        setTipoAcao(acao);
        setModalAberto(true);
    };

    const confirmarAberturaComanda = async (mesaId) => {
        try {
            await api.post(`/comandas/abrir/${mesaId}`);
            fetchMesas();
        } catch (error) {
            alert("Erro ao abrir mesa.");
        }
    };

    const confirmarFechamentoComanda = async (comandaId) => {
        try {
            await api.patch(`/comandas/${comandaId}/fechar`);
            setModalAberto(false);
            fetchMesas();
        } catch (error) {
            alert("Erro ao fechar comanda.");
        }
    };

    return (
        <div className="bg-[#0f1115] text-gray-100 p-4 md:p-8 font-sans min-h-screen">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-amber-500 p-2 md:p-3 rounded-xl shadow-lg shadow-amber-500/20">
                            <LayoutDashboard className="text-black" size={24}/>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase italic">
                            Visão <span className="text-amber-500">Geral</span>
                        </h1>
                    </div>
                    <p className="text-gray-500 text-sm font-medium ml-1">Controle em tempo real do salão</p>
                </div>

                <button
                    onClick={() => fetchMesas(true)}
                    disabled={atualizando}
                    className="flex items-center gap-2 bg-[#16181d] hover:bg-white/5 text-gray-400 hover:text-white px-5 py-3 rounded-2xl border border-white/5 transition-all active:scale-95 disabled:opacity-50 group"
                >
                    <RefreshCw size={18} className={`${atualizando ? 'animate-spin text-amber-500' : 'group-hover:rotate-180 transition-transform duration-500'}`}/>
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        {atualizando ? 'Sincronizando...' : 'Atualizar Salão'}
                    </span>
                </button>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
                {mesas.map((mesa) => (
                    <CardMesa key={mesa.id} mesa={mesa} abrirModal={abrirModal} cargo={cargo} />
                ))}
            </div>

            <ModalComanda
                isOpen={modalAberto}
                onClose={() => setModalAberto(false)}
                mesa={mesaSelecionada}
                acao={tipoAcao}
                onConfirmAbrir={confirmarAberturaComanda}
                onConfirmFechar={confirmarFechamentoComanda}
            />
        </div>
    );
}

function CardMesa({ mesa, abrirModal, cargo }) {
    const isOcupada = mesa.status === 'OCUPADA';

    return (
        <div className={`relative transition-all duration-500 rounded-[2.5rem] border-2 overflow-hidden shadow-2xl
            ${isOcupada ? 'border-red-500/30 bg-[#1a1212]' : 'border-white/5 bg-[#16181d] hover:border-amber-500/40'}`}>

            <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em]
                ${isOcupada ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}>
                {isOcupada ? 'Ocupada' : 'Livre'}
            </div>

            <div className="p-8">
                <h3 className="text-3xl font-black italic mb-6">Mesa {mesa.mesaId.toString().padStart(2, '0')}
                </h3>

                <div className="bg-black/40 rounded-[1.5rem] p-5 border border-white/5 mb-8">
                    <p className="text-[9px] uppercase text-gray-500 font-black mb-1 tracking-widest">Consumo</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-amber-500">R$</span>
                        <span className="text-3xl font-black tracking-tighter">
                            {Number(mesa.total).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </span>
                    </div>
                </div>

                {!isOcupada ? (
                    <button
                        onClick={() => abrirModal(mesa, 'abrir')}
                        className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-amber-500 py-4 rounded-2xl font-black uppercase text-xs transition-all active:scale-95 shadow-xl"
                    >
                        <PlusCircle size={18}/> Abrir Mesa
                    </button>
                ) : (
                    <button
                        onClick={() => abrirModal(mesa, 'detalhes')}
                        className="w-full flex items-center justify-center gap-2 bg-[#2a2d35] hover:bg-[#353942] text-white py-4 rounded-2xl font-black uppercase text-xs transition-all border border-white/10 shadow-lg"
                    >
                        <Receipt size={16}/> Ver Itens <ChevronRight size={14}/>
                    </button>
                )}
            </div>
        </div>
    );
}