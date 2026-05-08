import { useState, useEffect } from 'react';
import { produtosApi, dominiosApi } from "../api";
import type { Opcao, Dominios } from "../api";
import type { Produto } from '../types';
import styles from './GestaoPage.module.css';

const EMPTY: Omit<Produto, 'id'> = {
    nome: '', preco: 0, categoria: '', descricao: '',
    permiteMeia: false, disponivel: true, unidadeMedida: '', quantidadePorUnidade: 1,
};

export default function GestaoPage() {
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [dominios, setDominios] = useState<Dominios | null>(null); // <-- TUDO DINÂMICO
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Produto | null>(null);
    const [busca, setBusca] = useState('');
    const [catFiltro, setCatFiltro] = useState<string | number | 'TODAS'>('TODAS');

    async function load() {
        try {
            const data = await produtosApi.listarTodos();
            setProdutos(data);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        dominiosApi.buscarTodos().then(setDominios).catch(console.error);
        load();
    }, []);

    async function toggleEstoque(id: number) {
        const updated = await produtosApi.alternarEstoque(id);
        setProdutos(prev => prev.map(p => p.id === id ? updated : p));
    }

    const filtered = produtos.filter(p => {
        const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
        const matchCat = catFiltro === 'TODAS' || p.categoria === catFiltro;
        return matchBusca && matchCat;
    });

    const getCatLabel = (valorDaCategoria: any) => {
        return dominios?.categorias.find(c => c.value === valorDaCategoria)?.label || valorDaCategoria;
    };

    return (
        <div className={styles.page}>
            <div className={styles.toolbar}>
                <input
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar produto..."
                    className={styles.searchInput}
                />

                <div className={styles.catFilters}>
                    <button
                        className={`${styles.catBtn} ${catFiltro === 'TODAS' ? styles.active : ''}`}
                        onClick={() => setCatFiltro('TODAS')}
                    >
                        Todas
                    </button>
                    {dominios?.categorias.map(c => (
                        <button
                            key={c.value}
                            className={`${styles.catBtn} ${catFiltro === c.value ? styles.active : ''}`}
                            onClick={() => setCatFiltro(c.value)}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>

                <button
                    className={styles.addBtn}
                    onClick={() => { setEditing(null); setShowModal(true); }}
                >
                    + Novo Produto
                </button>
            </div>

            {loading ? (
                <div className={styles.loading}><span className={styles.spinner} /> Carregando...</div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Categoria</th>
                            <th>Preço</th>
                            <th>Meia?</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map(p => (
                            <tr key={p.id} className={!p.disponivel ? styles.inativo : ''}>
                                <td>
                                    <span className={styles.produtoNome}>{p.nome}</span>
                                    {p.descricao && <span className={styles.produtoDesc}>{p.descricao}</span>}
                                </td>
                                <td><span className={styles.catTag}>{getCatLabel(p.categoria)}</span></td>
                                <td className={styles.preco}>R$ {Number(p.preco).toFixed(2).replace('.', ',')}</td>
                                <td>{p.permiteMeia ? '✓' : '–'}</td>
                                <td>
                                    <button
                                        className={`${styles.statusToggle} ${p.disponivel ? styles.disponivel : styles.indisponivel}`}
                                        onClick={() => toggleEstoque(p.id!)}
                                    >
                                        {p.disponivel ? 'Disponível' : 'Indisponível'}
                                    </button>
                                </td>
                                <td>
                                    <button className={styles.editBtn} onClick={() => { setEditing(p); setShowModal(true); }}>
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className={styles.empty}>Nenhum produto encontrado.</div>
                    )}
                </div>
            )}

            {showModal && dominios && (
                <ProdutoModal
                    produto={editing}
                    dominios={dominios} // <-- PASSANDO OS DOMÍNIOS PRO MODAL
                    onClose={() => setShowModal(false)}
                    onSave={async () => { await load(); setShowModal(false); }}
                />
            )}
        </div>
    );
}

interface ProdutoModalProps {
    produto: Produto | null;
    dominios: Dominios;
    onClose: () => void;
    onSave: () => Promise<void>;
}

function ProdutoModal({ produto, dominios, onClose, onSave }: ProdutoModalProps) {
    const [form, setForm] = useState<Omit<Produto, 'id'>>(
        produto ? { ...produto } : { ...EMPTY }
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
        setForm(f => ({ ...f, [k]: v }));
    }

    async function submit() {
        setError('');
        setLoading(true);
        try {
            if (produto?.id) {
                await produtosApi.atualizar(produto.id, form);
            } else {
                await produtosApi.cadastrar(form);
            }
            await onSave();
        } catch (e: any) {
            setError(e.response?.data?.message || e.message || 'Erro ao salvar produto.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={`${styles.modal} animate-scale`}>
                <div className={styles.modalHeader}>
                    <h2>{produto ? 'Editar Produto' : 'Novo Produto'}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.formGrid}>
                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label>Nome *</label>
                            <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome do produto" />
                        </div>

                        <div className={styles.field}>
                            <label>Preço (R$) *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.preco}
                                onChange={e => set('preco', parseFloat(e.target.value) || 0)}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Categoria *</label>
                            <select value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                                <option value="">Selecione...</option>
                                {dominios.categorias.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label>Unidade de Medida</label>
                            <select value={form.unidadeMedida ?? ''} onChange={e => set('unidadeMedida', e.target.value)}>
                                <option value="">Selecione...</option>
                                {dominios.unidades.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label>Qtd por Unidade</label>
                            <input
                                type="number"
                                min="1"
                                value={form.quantidadePorUnidade ?? 1}
                                onChange={e => set('quantidadePorUnidade', parseInt(e.target.value) || 1)}
                            />
                        </div>

                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label>Descrição</label>
                            <textarea
                                value={form.descricao ?? ''}
                                onChange={e => set('descricao', e.target.value)}
                                placeholder="Descrição opcional"
                                rows={2}
                            />
                        </div>

                        <div className={styles.checkboxRow}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={form.permiteMeia}
                                    onChange={e => set('permiteMeia', e.target.checked)}
                                />
                                <span>Permite meia porção</span>
                            </label>
                        </div>

                        <div className={styles.checkboxRow}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={form.disponivel}
                                    onChange={e => set('disponivel', e.target.checked)}
                                />
                                <span>Disponível no cardápio</span>
                            </label>
                        </div>
                    </div>
                    {error && <p className={styles.error}>{error}</p>}
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
                    <button className={styles.saveBtn} onClick={submit} disabled={loading || !form.nome}>
                        {loading ? <span className={styles.spinner} /> : (produto ? 'Salvar' : 'Cadastrar')}
                    </button>
                </div>
            </div>
        </div>
    );
}