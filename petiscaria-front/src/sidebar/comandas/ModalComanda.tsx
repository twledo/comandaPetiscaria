import React, { useState, useEffect } from 'react';
import { X, Plus, ReceiptText, CheckCircle, ArrowLeft, Loader2, RotateCcw, DollarSign } from 'lucide-react';
import api from '../../api/auth';

const ModalComanda = ({ isOpen, onClose, mesa, acao, cargo, refreshData }) => {
    const [passo, setPasso] = useState('detalhes');
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(false);

    // Simplificamos a lógica: se a mesa está disponível, o passo inicial é 'confirmar_abertura'
    useEffect(() => {
        if (isOpen) {
            if (mesa?.status === 'DISPONIVEL') {
                setPasso('confirmar_abertura');
            } else {
                setPasso('detalhes');
            }
        }
    }, [isOpen, mesa]);

    const carregarProdutos = async () => {
        setLoading(true);
        try {
            const res = await api.get('/produtos/todos');
            setProdutos(res.data);
            setPasso('cardapio');
        } finally { setLoading(false); }
    };

    const handleExecutarAcao = async (url, metodo = 'post') => {
        setLoading(true);
        try {
            const res = await api[metodo](url);

            // Se a ação for abrir comanda, o 'res.data' contém a comanda nova.
            // Mas o ideal é dar o refresh completo no pai:
            await refreshData();

            // Se acabamos de abrir a comanda, mude para o passo de detalhes
            // em vez de fechar o modal, assim o garçom já pode lançar itens.
            if (url.includes('/abrir/')) {
                setPasso('detalhes');
            } else {
                onClose();
            }
        } catch (e) {
            alert(e.response?.data?.message || "Erro na operação");
        } finally { setLoading(false); }
    };

    const handleAdicionarItem = async (produtoId) => {
        const comandaId = mesa?.comandaAtiva?.id;

        if (!comandaId) {
            // Se cair aqui, significa que o refreshData() ainda não terminou
            // ou o Java não devolveu a comandaAtiva no JSON da Mesa.
            console.error("Erro: comandaId não encontrado no objeto mesa", mesa);
            alert("A comanda ainda não foi carregada. Aguarde um instante ou reabra o modal.");
            return;
        }

        try {
            await api.post(`/comandas/${comandaId}/itens`,
                { quantidade: 1 },
                { params: { produtoId } }
            );
            refreshData();
        } catch (e) {
            console.error(e);
            alert("Erro ao adicionar item.");
        }
    };''

    if (!isOpen || !mesa) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
            <div className={`relative bg-[#16181d] border border-white/10 w-full ${passo === 'cardapio' ? 'max-w-4xl' : 'max-w-xl'} rounded-[2.5rem] shadow-2xl overflow-hidden`}>

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {passo !== 'detalhes' && passo !== 'confirmar_abertura' && (
                            <button onClick={() => setPasso('detalhes')} className="text-gray-400 hover:text-white">
                                <ArrowLeft size={20}/>
                            </button>
                        )}
                        <h2 className="text-2xl font-black italic uppercase text-white">
                            Mesa <span className="text-amber-500">{mesa.numero}</span>
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white"><X size={20}/></button>
                </div>

                {/* Conteúdo */}
                <div className="p-8 max-h-[60vh] overflow-y-auto">

                    {/* Passo: Confirmar Abertura (Mesa Livre) */}
                    {passo === 'confirmar_abertura' && (
                        <div className="text-center py-10">
                            <ReceiptText size={48} className="mx-auto text-amber-500 mb-4 opacity-20" />
                            <p className="text-white font-bold text-lg mb-6">Deseja iniciar um novo atendimento para esta mesa?</p>
                            <button
                                onClick={() => handleExecutarAcao(`/comandas/abrir/${mesa.id}`)}
                                className="w-full py-4 bg-amber-500 text-black rounded-2xl font-black uppercase text-xs"
                            >
                                Iniciar Atendimento
                            </button>
                        </div>
                    )}

                    {/* Passo: Detalhes da Comanda */}
                    {passo === 'detalhes' && mesa.comandaAtiva && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                <span className="text-gray-500 font-black uppercase text-[10px]">Total Acumulado</span>
                                <span className="text-3xl font-black text-amber-500">R$ {mesa.comandaAtiva.total.toFixed(2)}</span>
                            </div>
                            {mesa.comandaAtiva.itens?.length > 0 ? (
                                mesa.comandaAtiva.itens.map(item => (
                                    <div key={item.id} className="flex justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                                        <span className="font-bold text-gray-200">{item.nomeProduto} x{item.quantidade}</span>
                                        <span className="font-black text-white">R$ {item.precoUnitario.toFixed(2)}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-600 py-4 italic">Nenhum item lançado ainda.</p>
                            )}
                        </div>
                    )}

                    {/* Passo: Cardápio */}
                    {passo === 'cardapio' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {produtos.map(prod => (
                                <div key={prod.id} className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/5">
                                    <div>
                                        <p className="text-white font-bold uppercase text-xs">{prod.nome}</p>
                                        <p className="text-amber-500 font-black italic">R$ {prod.preco.toFixed(2)}</p>
                                    </div>
                                    <button onClick={() => handleAdicionarItem(prod.id)} className="bg-amber-500 p-3 rounded-xl text-black active:scale-90 transition-all">
                                        <Plus size={20} strokeWidth={3}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer de Ações */}
                {passo === 'detalhes' && mesa.status !== 'DISPONIVEL' && (
                    <div className="p-8 bg-black/20 border-t border-white/5 flex flex-col gap-3">
                        <div className="flex gap-4">
                            {mesa.status === 'OCUPADA' ? (
                                <button
                                    onClick={() => handleExecutarAcao(`/comandas/${mesa.comandaAtiva.id}/fechar`, 'patch')}
                                    className="flex-1 py-4 bg-amber-500 text-black rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={14}/> Pedir Conta
                                </button>
                            ) : (
                                <div className="flex-1 py-4 bg-white/5 text-gray-500 border border-white/10 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2">
                                    <Loader2 size={14} className="animate-spin"/> Aguardando Financeiro
                                </div>
                            )}
                            <button
                                onClick={carregarProdutos}
                                disabled={mesa.status !== 'OCUPADA'}
                                className="flex-1 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase text-[10px] disabled:opacity-20"
                            >
                                + Lançar Itens
                            </button>
                        </div>

                        {cargo === 'ADMIN' && mesa.status === 'AGUARDANDO_PAGAMENTO' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleExecutarAcao(`/comandas/${mesa.comandaAtiva.id}/reabrir`, 'patch')}
                                    className="p-4 bg-white/5 text-white rounded-2xl border border-white/10 hover:bg-white/10"
                                    title="Reabrir Mesa"
                                >
                                    <RotateCcw size={20}/>
                                </button>
                                <button
                                    onClick={() => handleExecutarAcao(`/comandas/${mesa.comandaAtiva.id}/recebimento`)}
                                    className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-green-500 transition-colors"
                                >
                                    <DollarSign size={16}/> Finalizar e Liberar Mesa
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModalComanda;