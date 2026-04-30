import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, RefreshCw, Search } from 'lucide-react';
import api from '../../api/auth';
import ModalComanda from "./ModalComanda";
import CardMesa from "./CardMesa";
import { jwtDecode } from "jwt-decode";

export default function GestaoMesas() {
    const [mesas, setMesas] = useState([]);
    const [filtro, setFiltro] = useState('');
    const [loading, setLoading] = useState(false);
    const [modalAberto, setModalAberto] = useState(false);
    const [mesaSelecionada, setMesaSelecionada] = useState(null);
    const [cargo, setCargo] = useState('');

    const fetchMesas = useCallback(async (silencioso = false) => {
        if (!silencioso) setLoading(true);
        try {
            const response = await api.get('/mesas');

            // SEGURANÇA: Verifica se a resposta é um Array
            if (Array.isArray(response.data)) {
                const ordenadas = response.data.sort((a, b) => a.numero - b.numero);
                setMesas(ordenadas);
            } else {
                console.error("O backend não retornou uma lista:", response.data);
                setMesas([]); // Evita que o resto do código quebre
            }

        } catch (error) {
            console.error("Erro ao carregar mapa de mesas:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMesas();
        const token = localStorage.getItem('@Petiscaria:Token');
        if (token) setCargo(jwtDecode(token).role);
    }, [fetchMesas]);

    const mesasFiltradas = mesas.filter(m => {
        const termo = filtro.toLowerCase();
        // Se não tem filtro, mostra todas
        if (!termo) return true;

        return (
            m.numero.toString().includes(termo) ||
            (m.status && m.status.toLowerCase().includes(termo))
        );
    });

    const abrirModalMesa = (mesa) => {
        setMesaSelecionada(mesa);
        setModalAberto(true);
    };

    return (
        <div className="bg-[#0f1115] min-h-screen p-8 text-white">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-500 p-3 rounded-2xl shadow-lg shadow-amber-500/20">
                        <LayoutDashboard className="text-black" size={24}/>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase italic leading-none">
                            Monitor de <span className="text-amber-500">Mesas</span>
                        </h1>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Status em tempo real</p>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar mesa..."
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                            className="w-full bg-[#16181d] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:border-amber-500/50 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={() => fetchMesas()}
                        className="p-4 bg-[#16181d] rounded-2xl border border-white/5 hover:bg-white/10 transition-all active:scale-95"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin text-amber-500' : ''} />
                    </button>
                </div>
            </header>

            {/* Grid de Mesas */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {mesasFiltradas.map(mesa => (
                    <CardMesa
                        key={mesa.id}
                        mesa={mesa}
                        onClick={() => abrirModalMesa(mesa)}
                    />
                ))}
            </div>

            {/* Modal Único para tudo (Abertura, Lançamento, Fechamento) */}
            <ModalComanda
                isOpen={modalAberto}
                onClose={() => setModalAberto(false)}
                mesa={mesaSelecionada}
                cargo={cargo}
                refreshData={() => fetchMesas(true)}
            />
        </div>
    );
}