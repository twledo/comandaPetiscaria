import React, {useState, useEffect} from 'react';
import {
    Plus, Power, X, UtensilsCrossed, Save,
    DollarSign, Tag, AlignLeft, Scale
} from 'lucide-react';
import api from '../../api/auth';

const CadastroProdutos = () => {
    const [produtos, setProdutos] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [carregando, setCarregando] = useState(false);

    const BASE_URL_API = `/produtos`;

    const [form, setForm] = useState({
        nome: '',
        categoria: 1,
        preco: '',
        descricao: '',
        unidadeMedida: 'LATA',
        quantidadePorUnidade: '',
        permiteMeia: false
    });

    const opcoesUnidades = [
        { sigla: 'G', label: 'Gramas' },
        { sigla: 'UN', label: 'Unidade' },
        { sigla: '1L', label: '1 Litro' },
        { sigla: '2L', label: '2 Litros' },
        { sigla: 'LT', label: 'Lata' },
        { sigla: 'DS', label: 'Dose' }
    ];

    const categoriasOpcoes = [
        {id: 1, label: 'BEBIDAS'},
        {id: 2, label: 'PORCOES'},
        {id: 3, label: 'ESPETINHO'}
    ];

    const carregarProdutos = async () => {
        try {
            const response = await api.get(`${BASE_URL_API}/todos`);
            setProdutos(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Erro ao carregar cardápio:", err);
        }
    };

    useEffect(() => {
        carregarProdutos();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Verificamos se a unidade selecionada exige quantidade (G, LT, DS por exemplo)
        const precisaValidarQtd = ['G', 'LT', 'DS'].includes(form.unidadeMedida);

        if (precisaValidarQtd && !form.quantidadePorUnidade) {
            alert(`Por favor, informe a quantidade numérica para ${form.unidadeMedida}`);
            return;
        }

        setCarregando(true);
        try {
            await api.post(`${BASE_URL_API}/cadastrar`, {
                ...form,
                nome: form.nome.toUpperCase(),
                preco: parseFloat(form.preco),
                // Se for unidade que precisa de valor (ml/g), converte para Int, senão null
                quantidadePorUnidade: precisaValidarQtd ? parseInt(form.quantidadePorUnidade) : null
            });

            setIsModalOpen(false);
            resetForm();
            carregarProdutos();
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar produto. Verifique o console do servidor.");
        } finally {
            setCarregando(false);
        }
    };

    const resetForm = () => {
        setForm({
            nome: '', categoria: 'ESPETINHO', preco: '', descricao: '',
            unidadeMedida: 'UNIDADE', quantidadePorUnidade: '', permiteMeia: false
        });
    };

    const toggleDisponibilidade = async (id) => {
        try {
            await api.patch(`${BASE_URL_API}/${id}/estoque`);
            carregarProdutos();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-4 space-y-6">
            {/* CABEÇALHO DA PÁGINA */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#16181d] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 text-amber-500">
                        <UtensilsCrossed size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Produtos do Rei</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{produtos.length} Itens cadastrados</p>
                    </div>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="w-full sm:w-auto bg-white hover:bg-amber-500 text-black px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95"
                >
                    <Plus size={18} strokeWidth={3} /> Adicionar Produto
                </button>
            </div>

            {/* GRID DE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[calc(100vh-280px)] pr-2 custom-scrollbar">
                {produtos.map(p => (
                    <div key={p.id} className={`group relative bg-[#16181d] border ${p.disponivel ? 'border-white/5' : 'border-red-500/20 opacity-60'} p-6 rounded-[2.5rem] transition-all hover:border-amber-500/40 shadow-lg`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="max-w-[70%]">
                                <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">{p.nome}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">
                                    {/* Mapeia o ID numérico vindo do Java para o texto visual */}
                                    {p.categoria === 1 ? 'BEBIDAS' : p.categoria === 2 ? 'PORCOES' : 'ESPETINHO'}
                                </span>
                                    {p.permiteMeia && <span className="bg-amber-500/10 text-amber-500 text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Aceita Meia</span>}
                                </div>
                            </div>
                            <span className="text-sm font-black text-white italic whitespace-nowrap">R$ {p.preco?.toFixed(2)}</span>
                        </div>

                        <p className="text-[10px] text-gray-500 line-clamp-2 min-h-[30px] italic mb-4">
                            {p.descricao || "Sem descrição cadastrada."}
                        </p>

                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                        <span className="text-[9px] text-white/40 font-bold uppercase tracking-tight">
                            {p.quantidadePorUnidade ? `${p.quantidadePorUnidade} ` : ''}
                            {/* Busca o label amigável com base na sigla (G, UN, LT...) vinda do Java */}
                            {opcoesUnidades.find(u => u.sigla === p.unidadeMedida)?.label || p.unidadeMedida}
                        </span>
                            <button
                                onClick={() => toggleDisponibilidade(p.id)}
                                className={`flex items-center gap-2 text-[9px] font-black uppercase px-3 py-1.5 rounded-xl transition-all ${p.disponivel ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
                            >
                                <Power size={12} /> {p.disponivel ? 'No Estoque' : 'Esgotado'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL DE CADASTRO */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
                    <div className="bg-[#1a1d23] w-full max-w-2xl rounded-[3.5rem] p-10 border border-white/10 relative shadow-2xl animate-in zoom-in-95 duration-200">
                        <button onClick={() => setIsModalOpen(false)} className="absolute right-10 top-10 text-gray-500 hover:text-white transition-colors">
                            <X size={28} />
                        </button>

                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-8">Novo Produto</h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* NOME E PREÇO */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-2">Nome Comercial</label>
                                    <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-4 text-white uppercase text-sm font-bold focus:border-amber-500 outline-none transition-all" placeholder="EX: COCA-COLA 600ML" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-2">Preço de Venda</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={18} />
                                        <input required type="number" step="0.01" value={form.preco} onChange={e => setForm({...form, preco: e.target.value})} className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-4 pl-12 text-white text-sm font-bold focus:border-amber-500 outline-none transition-all" placeholder="0.00" />
                                    </div>
                                </div>
                            </div>

                            {/* DESCRIÇÃO */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-2">Breve Descrição</label>
                                <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-amber-500 h-20 resize-none" placeholder="O que vem no prato ou detalhes do item..." />
                            </div>

                            {/* CATEGORIA E MEIA PORÇÃO */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-2 text-amber-500/60 tracking-widest">Categoria</label>
                                    <div className="flex gap-2">
                                        {[
                                            { id: 1, label: 'BEBIDAS' },
                                            { id: 2, label: 'PORCOES' },
                                            { id: 3, label: 'ESPETINHO' }
                                        ].map(cat => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setForm({
                                                    ...form,
                                                    categoria: cat.id,
                                                    permiteMeia: cat.id === 2 ? form.permiteMeia : false
                                                })}
                                                className={`flex-1 py-3 rounded-xl font-black text-[9px] border-2 transition-all 
                                            ${form.categoria === cat.id ? 'border-amber-500 bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/10'}`}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-2 tracking-widest italic">Configurações</label>
                                    {form.categoria === 2 ? (
                                        <label className="flex items-center gap-3 cursor-pointer bg-amber-500/10 p-3 rounded-xl border-2 border-amber-500/20 hover:border-amber-500/40 transition-all">
                                            <input type="checkbox" checked={form.permiteMeia} onChange={e => setForm({...form, permiteMeia: e.target.checked})} className="w-5 h-5 accent-amber-500" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-amber-500 uppercase">Aceita Meia?</span>
                                                <span className="text-[8px] text-amber-500/60 font-bold uppercase italic tracking-tighter">Venda Fracionada</span>
                                            </div>
                                        </label>
                                    ) : (
                                        <div className="bg-black/20 p-3 rounded-xl border-2 border-white/5 opacity-40 text-[10px] text-gray-500 uppercase font-bold text-center h-[52px] flex items-center justify-center">N/A</div>
                                    )}
                                </div>
                            </div>

                            {/* UNIDADE DE MEDIDA E QUANTIDADE DINÂMICA */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-2 text-amber-500 tracking-widest italic">Unidade e Volume</label>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    {opcoesUnidades.map(un => (
                                        <button
                                            key={un.sigla}
                                            type="button"
                                            onClick={() => setForm({...form, unidadeMedida: un.sigla})}
                                            className={`p-2 rounded-xl border-2 transition-all text-[9px] font-black uppercase 
                                        ${form.unidadeMedida === un.sigla ? 'border-amber-500 bg-amber-500 text-black shadow-lg' : 'border-white/5 bg-black/20 text-gray-500 hover:border-white/10'}`}
                                        >
                                            {un.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Campo de quantidade aparece apenas para unidades específicas (G, LT, DS...) */}
                                {['G', 'LT', 'DS'].includes(form.unidadeMedida) && (
                                    <div className="relative mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Scale className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={18} />
                                        <input
                                            required
                                            type="number"
                                            value={form.quantidadePorUnidade}
                                            onChange={e => setForm({...form, quantidadePorUnidade: e.target.value})}
                                            className="w-full bg-amber-500/5 border-2 border-amber-500/20 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-amber-500 transition-all shadow-inner"
                                            placeholder={`Qual o peso ou volume numérico?`}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* BOTÃO SALVAR */}
                            <button
                                type="submit"
                                disabled={carregando}
                                className="w-full bg-white hover:bg-amber-500 text-black font-black py-5 rounded-[2.5rem] uppercase mt-4 transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95"
                            >
                                <Save size={20} /> {carregando ? 'SALVANDO...' : 'CONFIRMAR CADASTRO'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
export default CadastroProdutos;