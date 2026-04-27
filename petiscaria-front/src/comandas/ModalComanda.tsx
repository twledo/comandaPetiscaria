import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle, Package, ReceiptText, Search, ShoppingCart } from 'lucide-react';
import axios from 'axios';

const ModalComanda = ({ isOpen, onClose, mesa, acao, onConfirmAbrir, onConfirmFechar }) => {
    const [passo, setPasso] = useState('confirmacao'); // 'confirmacao' ou 'cardapio'
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cargo, setCargo] = useState('');

    // Resetar o passo quando o modal abrir/fechar
    useEffect(() => {
        if (!isOpen) setPasso('confirmacao');
    }, [isOpen]);

    // Buscar produtos quando entrar no passo cardápio
    useEffect(() => {
        if (passo === 'cardapio') {
            setLoading(true);
            axios.get('http://localhost:8080/api/produtos/todos')
                .then(res => setProdutos(res.data))
                .catch(err => console.error("Erro ao carregar cardápio", err))
                .finally(() => setLoading(false));
        }
    }, [passo]);

    useEffect(() => {
        if (isOpen) {
            const stored = localStorage.getItem('@Petiscaria:User');
            if (stored) setCargo(JSON.parse(stored).cargo);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isDetalhes = acao === 'detalhes';

    // Função para abrir e avançar
    const handleConfirmarAbertura = async () => {
        await onConfirmAbrir(mesa.mesaId);

        // SÓ AVANÇA para o cardápio se for GARCOM
        if (cargo === 'GARCOM') {
            setPasso('cardapio');
        } else {
            // Se for ADMIN, fecha o modal ou apenas não avança
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className={`relative bg-[#16181d] border border-white/10 w-full ${passo === 'cardapio' ? 'max-w-4xl' : 'max-w-xl'} rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-500`}>

                {(cargo === 'GARCOM' || !isDetalhes) && (
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                        <div>
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">
                                Mesa <span className="text-amber-500">{mesa?.mesaId.toString().padStart(2, '0')}</span>
                            </h2>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                                {passo === 'cardapio' ? 'Adicionar Itens ao Pedido' : (isDetalhes ? 'Resumo da Comanda' : 'Nova Comanda')}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 transition-all">
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Corpo Dinâmico */}
                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">

                    {/* PASSO 1: CARDÁPIO (Abre após confirmar abertura ou se já estiver detalhes) */}
                    {passo === 'cardapio' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {loading ? (
                                <p className="text-amber-500 font-bold animate-pulse">Carregando cardápio...</p>
                            ) : produtos.map(prod => (
                                <div key={prod.id} className="flex items-center justify-between bg-black/30 p-4 rounded-2xl border border-white/5 group hover:border-amber-500/50 transition-all">
                                    <div className="flex flex-col">
                                        <span className="text-gray-200 font-bold uppercase text-sm tracking-tight">{prod.nome}</span>
                                        <span className="text-amber-500 font-black italic text-lg">R$ {prod.preco.toFixed(2)}</span>
                                    </div>
                                    <button className="bg-amber-500 p-3 rounded-xl text-black hover:bg-amber-400 active:scale-90 transition-all">
                                        <Plus size={20} strokeWidth={3} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* PASSO ORIGINAL: DETALHES OU CONFIRMAÇÃO */
                        isDetalhes ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-end mb-4">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Consumo Atual</p>
                                    <span className="text-amber-500 font-black text-xl italic">R$ {mesa.total.toFixed(2)}</span>
                                </div>
                                {mesa.itens?.length > 0 ? (
                                    mesa.itens.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between bg-black/20 p-4 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white/5 rounded-lg text-gray-400"><Package size={16} /></div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-200">{item.nomeProduto}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Qtd: {item.quantidade}</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-gray-300">R$ {(item.precoUnitario * item.quantidade).toFixed(2)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-[2rem]">
                                        <p className="text-gray-600 text-sm italic font-bold">Nenhum item lançado.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                                    <ReceiptText className="text-amber-500" size={28} />
                                </div>
                                <h3 className="text-white font-black uppercase text-lg italic tracking-tight">Confirmar Abertura?</h3>
                                <p className="text-gray-500 text-sm font-medium mt-2">Deseja iniciar um novo atendimento para esta mesa?</p>
                            </div>
                        )
                    )}
                </div>

                {/* Footer Dinâmico */}
                <div className="p-8 bg-black/20 flex gap-3">
                    {passo === 'cardapio' ? (
                        /* Removido apenas o botão de Voltar aqui, mantendo o container */
                        null
                    ) : (
                        isDetalhes ? (
                            <>
                                {cargo === 'ADMIN' && (
                                    <button onClick={() => onConfirmFechar(mesa.id)} className="flex-[2] py-4 rounded-2xl bg-amber-500 text-black font-black uppercase text-[10px] shadow-lg hover:bg-amber-400 transition-all flex items-center justify-center gap-2">
                                        <CheckCircle size={16} /> Encerrar e Pagar
                                    </button>
                                )}
                                {cargo === 'GARCOM' && (
                                    <button onClick={() => setPasso('cardapio')} className="flex-1 py-4 rounded-2xl border border-amber-500/30 text-amber-500 font-black uppercase text-[10px] hover:bg-amber-500/10 transition-all">
                                        Lançar Itens
                                    </button>
                                )}
                            </>
                        ) : (
                            <button onClick={handleConfirmarAbertura} className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase text-[14px] shadow-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                                <Plus size={16} /> Iniciar Atendimento
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModalComanda;