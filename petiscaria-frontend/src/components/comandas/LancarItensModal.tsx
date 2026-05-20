import { useState, useEffect } from 'react';
import { produtosApi, comandasApi, dominiosApi } from '../../api';
import type { Opcao } from '../../api';
import type { Comanda, Mesa, Produto } from '../../types';
import styles from './LancarItensModal.module.css';

interface Props {
    comanda: Comanda;
    mesa: Mesa;
    onClose: () => void;
    onRefresh: () => Promise<void>;
}

// Estendemos o tipo localmente para garantir que o TypeScript aceite a observação
export type ItemDoCarrinho = {
    produto: Produto;
    quantidade: number;
    meiaPorcao: boolean;
    observacao?: string;
};

export const TAXA_MEIA_PORCAO = 0.6;

export default function LancarItensModal({ comanda, mesa, onClose, onRefresh }: Props) {
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [categorias, setCategorias] = useState<Opcao[]>([]);
    const [busca, setBusca] = useState('');
    const [categoria, setCategoria] = useState<number | string>('');

    // Carrinho
    const [carrinho, setCarrinho] = useState<ItemDoCarrinho[]>([]);

    // Modal de Observação
    const [produtoParaObservacao, setProdutoParaObservacao] = useState<{produto: Produto, meiaPorcao: boolean} | null>(null);
    const [observacaoTemp, setObservacaoTemp] = useState('');

    const [loading, setLoading] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        dominiosApi.buscarTodos().then(res => setCategorias(res.categorias)).catch(console.error);
    }, []);

    useEffect(() => {
        setLoading(true);
        produtosApi
            .buscarCardapio({
                nome: busca || undefined,
                categoria: categoria !== '' ? String(categoria) : undefined,
                size: 100
            })
            .then(r => setProdutos(r.content))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [busca, categoria]);

    // ─── Lógica do Modal de Observação ──────────────────────────────────────────

    function abrirModalObservacao(produto: Produto, meiaPorcao: boolean) {
        setProdutoParaObservacao({ produto, meiaPorcao });
        setObservacaoTemp(''); // Limpa a observação anterior
    }

    function confirmarAdicaoComObservacao() {
        if (!produtoParaObservacao) return;

        const { produto, meiaPorcao } = produtoParaObservacao;
        const obsFinal = observacaoTemp.trim() !== '' ? observacaoTemp.trim() : undefined;

        setCarrinho(prev => {
            // Verifica se já existe um item EXATAMENTE igual (mesmo id, porção e observação)
            const exist = prev.find(i =>
                i.produto.id === produto.id &&
                i.meiaPorcao === meiaPorcao &&
                i.observacao === obsFinal
            );

            if (exist) {
                return prev.map(i =>
                    i.produto.id === produto.id && i.meiaPorcao === meiaPorcao && i.observacao === obsFinal
                        ? { ...i, quantidade: i.quantidade + 1 }
                        : i
                );
            }
            return [...prev, { produto, quantidade: 1, meiaPorcao, observacao: obsFinal }];
        });

        // Fecha o modal de observação
        setProdutoParaObservacao(null);
    }

    // ─── Controles do Carrinho ──────────────────────────────────────────────────

    function alterarQuantidadeCarrinho(produtoId: number, meiaPorcao: boolean, observacao: string | undefined, delta: number) {
        setCarrinho(prev =>
            prev.map(i =>
                i.produto.id === produtoId && i.meiaPorcao === meiaPorcao && i.observacao === observacao
                    ? { ...i, quantidade: i.quantidade + delta }
                    : i
            ).filter(i => i.quantidade > 0)
        );
    }

    const totalCarrinho = carrinho.reduce(
        (acc, i) => acc + Number(i.produto.preco) * (i.meiaPorcao ? TAXA_MEIA_PORCAO : 1) * i.quantidade,
        0
    );

    // ─── Envio para a API ───────────────────────────────────────────────────────

    async function confirmar() {
        if (carrinho.length === 0) return;
        setEnviando(true);
        setError('');

        try {
            const itensParaEnviar = carrinho.map(item => ({
                produtoId: item.produto.id,
                quantidade: item.quantidade,
                meiaPorcao: item.meiaPorcao || false,
                observacao: item.observacao || null // Envia a observação para o backend
            }));

            await comandasApi.lancarItens(comanda.id, itensParaEnviar);

            await onRefresh();
            onClose();
        } catch (e: any) {
            setError(e.response?.data?.message || e.message || 'Erro ao lançar itens.');
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={`${styles.modal} animate-scale`}>

                {/* ── HEADER ── */}
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Lançar Itens</h2>
                        <p className={styles.subtitle}>Mesa {mesa.numero} · Comanda #{comanda.id}</p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* ── BODY ── */}
                <div className={styles.body}>

                    {/* ── LISTA DE PRODUTOS ── */}
                    <div className={styles.cardapioPanel}>
                        <div className={styles.searchBar}>
                            <input
                                value={busca}
                                onChange={e => setBusca(e.target.value)}
                                placeholder="Buscar produto..."
                                className={styles.searchInput}
                            />
                        </div>

                        <div className={styles.catFilters}>
                            <button
                                className={`${styles.catBtn} ${categoria === '' ? styles.active : ''}`}
                                onClick={() => setCategoria('')}
                            >
                                Todas
                            </button>
                            {categorias.map(c => (
                                <button
                                    key={c.value}
                                    className={`${styles.catBtn} ${categoria === c.value ? styles.active : ''}`}
                                    onClick={() => setCategoria(c.value)}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className={styles.loadingState}>
                                <span className={styles.spinner} /> Carregando...
                            </div>
                        ) : (
                            <div className={styles.produtosList}>
                                {produtos.map(produto => {
                                    // Total de itens desse produto no carrinho (independente de meia/inteira ou obs)
                                    const qtdCarrinho = carrinho
                                        .filter(i => i.produto.id === produto.id)
                                        .reduce((s, i) => s + i.quantidade, 0);

                                    return (
                                        <div key={produto.id} className={styles.produtoCard}>
                                            <div className={styles.produtoInfo}>
                                                <span className={styles.produtoNome}>{produto.nome}</span>
                                                {produto.descricao && (
                                                    <span className={styles.produtoDesc}>{produto.descricao}</span>
                                                )}
                                                <span className={styles.produtoPreco}>
                                                    R$ {Number(produto.preco).toFixed(2).replace('.', ',')}
                                                </span>
                                            </div>

                                            <div className={styles.produtoActions}>
                                                {qtdCarrinho > 0 && (
                                                    <span className={styles.qtdBadge}>{qtdCarrinho}</span>
                                                )}
                                                <button
                                                    className={styles.addBtn}
                                                    onClick={() => abrirModalObservacao(produto, false)}
                                                    title="Adicionar porção inteira"
                                                >
                                                    +
                                                </button>
                                                {produto.permiteMeia && (
                                                    <button
                                                        className={`${styles.addBtn} ${styles.addBtnMeia}`}
                                                        onClick={() => abrirModalObservacao(produto, true)}
                                                        title="Adicionar meia porção"
                                                    >
                                                        ½
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── CARRINHO LATERAL ── */}
                    <div className={styles.carrinhoPanel}>
                        <div className={styles.carrinhoHeader}>
                            <span>Carrinho</span>
                            <span className={styles.carrinhoCount}>{carrinho.length} itens distintos</span>
                        </div>

                        {carrinho.length === 0 ? (
                            <p className={styles.carrinhoEmpty}>Selecione itens ao lado.</p>
                        ) : (
                            <ul className={styles.carrinhoList}>
                                {carrinho.map(item => (
                                    // Chave única considerando produto, porção e observação
                                    <li key={`${item.produto.id}-${item.meiaPorcao}-${item.observacao || ''}`} className={styles.carrinhoItem}>

                                        <div className={styles.carrinhoItemNome}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {item.produto.nome}
                                                {item.meiaPorcao && <span className={styles.meiaTag}>½</span>}
                                            </div>
                                        </div>

                                        <div className={styles.carrinhoControls}>
                                            <button
                                                className={styles.controlBtn}
                                                onClick={() => alterarQuantidadeCarrinho(item.produto.id, item.meiaPorcao, item.observacao, -1)}
                                            >−</button>
                                            <span>{item.quantidade}</span>
                                            {/* O botão de + no carrinho não pede observação novamente, só soma a quantidade daquele item idêntico */}
                                            <button
                                                className={styles.controlBtn}
                                                onClick={() => alterarQuantidadeCarrinho(item.produto.id, item.meiaPorcao, item.observacao, 1)}
                                            >+</button>

                                            {/* Exibe a observação se existir */}
                                            {item.observacao && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginLeft: '5px', marginTop: '2px' }}>
                                                    Obs: {item.observacao}
                                                </div>
                                            )}
                                        </div>

                                        <span className={styles.carrinhoItemTotal}>
                                            R$ {(Number(item.produto.preco) * (item.meiaPorcao ? TAXA_MEIA_PORCAO : 1) * item.quantidade)
                                            .toFixed(2).replace('.', ',')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {carrinho.length > 0 && (
                            <div className={styles.carrinhoFooter}>
                                <div className={styles.carrinhoTotal}>
                                    <span>Total</span>
                                    <span>R$ {totalCarrinho.toFixed(2).replace('.', ',')}</span>
                                </div>
                                {error && <p className={styles.error}>{error}</p>}
                                <button
                                    className={styles.confirmarBtn}
                                    onClick={confirmar}
                                    disabled={enviando}
                                >
                                    {enviando ? <><span className={styles.spinner} /> Enviando...</> : '✓ Confirmar Pedido'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── MODAL DE OBSERVAÇÃO (SOBREPOSTO) ── */}
            {produtoParaObservacao && (
                <div className={styles.obsBackdrop}>
                    <div className={styles.obsModal}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>
                            Adicionar {produtoParaObservacao.produto.nome}
                            {produtoParaObservacao.meiaPorcao && ' (Meia)'}
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 600 }}>
                                Observação (Opcional):
                            </label>
                            <textarea
                                placeholder="Ex: Sem cebola, gelo e limão, bem passado..."
                                value={observacaoTemp}
                                onChange={(e) => setObservacaoTemp(e.target.value)}
                                rows={3}
                                className={styles.obsInput}
                                autoFocus
                            />
                        </div>

                        <div className={styles.obsActions}>
                            <button
                                onClick={() => setProdutoParaObservacao(null)}
                                className={styles.btnCancelar}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarAdicaoComObservacao}
                                className={styles.btnConfirmar}
                            >
                                Adicionar ao Pedido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}