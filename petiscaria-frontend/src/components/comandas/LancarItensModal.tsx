import { useState, useEffect } from 'react';
import { produtosApi, comandasApi, dominiosApi } from '../../api';
import type { Opcao } from '../../api'; // <-- Importando como TIPO
import type { Comanda, Mesa, Produto, CarrinhoItem } from '../../types';
import styles from './LancarItensModal.module.css';

interface Props {
    comanda: Comanda;
    mesa: Mesa;
    onClose: () => void;
    onRefresh: () => Promise<void>;
}

export const TAXA_MEIA_PORCAO = 0.6;

export default function LancarItensModal({ comanda, mesa, onClose, onRefresh }: Props) {
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [categorias, setCategorias] = useState<Opcao[]>([]); // <-- STATE DINÂMICO
    const [busca, setBusca] = useState('');
    const [categoria, setCategoria] = useState<number | string>('');
    const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Busca as categorias do backend uma única vez
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

    function addCarrinho(produto: Produto, meiaPorcao: boolean) {
        setCarrinho(prev => {
            const exist = prev.find(i => i.produto.id === produto.id && i.meiaPorcao === meiaPorcao);
            if (exist) {
                return prev.map(i =>
                    i.produto.id === produto.id && i.meiaPorcao === meiaPorcao
                        ? { ...i, quantidade: i.quantidade + 1 }
                        : i
                );
            }
            return [...prev, { produto, quantidade: 1, meiaPorcao }];
        });
    }

    function removeCarrinho(produtoId: number, meiaPorcao: boolean) {
        setCarrinho(prev =>
            prev
                .map(i =>
                    i.produto.id === produtoId && i.meiaPorcao === meiaPorcao
                        ? { ...i, quantidade: i.quantidade - 1 }
                        : i
                )
                .filter(i => i.quantidade > 0)
        );
    }

    const totalCarrinho = carrinho.reduce(
        (acc, i) => acc + Number(i.produto.preco) * (i.meiaPorcao ? TAXA_MEIA_PORCAO : 1) * i.quantidade,
        0
    );

    async function confirmar() {
        if (carrinho.length === 0) return;
        setEnviando(true);
        setError('');

        try {
            for (const item of carrinho) {
                await comandasApi.adicionarItem(comanda.id, item.produto.id, {
                    quantidade: item.quantidade,
                    meiaPorcao: item.meiaPorcao,
                });
            }
            await onRefresh();
            onClose();
        } catch (e: any) {
            setError(e.response?.data?.message || e.message || 'Erro ao lançar itens.');
            setEnviando(false);
        }
    }

    return (
        <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={`${styles.modal} animate-scale`}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Lançar Itens</h2>
                        <p className={styles.subtitle}>Mesa {mesa.numero} · Comanda #{comanda.id}</p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <div className={styles.body}>
                    <div className={styles.cardapioPanel}>
                        <div className={styles.searchBar}>
                            <input
                                value={busca}
                                onChange={e => setBusca(e.target.value)}
                                placeholder="Buscar produto..."
                                className={styles.searchInput}
                            />
                        </div>

                        {/* FILTROS DINÂMICOS AQUI */}
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
                                                    onClick={() => addCarrinho(produto, false)}
                                                    title="Adicionar porção inteira"
                                                >
                                                    +
                                                </button>
                                                {produto.permiteMeia && (
                                                    <button
                                                        className={`${styles.addBtn} ${styles.addBtnMeia}`}
                                                        onClick={() => addCarrinho(produto, true)}
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

                    <div className={styles.carrinhoPanel}>
                        <div className={styles.carrinhoHeader}>
                            <span>Carrinho</span>
                            <span className={styles.carrinhoCount}>{carrinho.length} itens</span>
                        </div>

                        {carrinho.length === 0 ? (
                            <p className={styles.carrinhoEmpty}>Selecione itens ao lado.</p>
                        ) : (
                            <ul className={styles.carrinhoList}>
                                {carrinho.map(item => (
                                    <li key={`${item.produto.id}-${item.meiaPorcao}`} className={styles.carrinhoItem}>
                                        <div className={styles.carrinhoItemNome}>
                                            {item.produto.nome}
                                            {item.meiaPorcao && <span className={styles.meiaTag}>½</span>}
                                        </div>
                                        <div className={styles.carrinhoControls}>
                                            <button
                                                className={styles.controlBtn}
                                                onClick={() => removeCarrinho(item.produto.id, item.meiaPorcao)}
                                            >−</button>
                                            <span>{item.quantidade}</span>
                                            <button
                                                className={styles.controlBtn}
                                                onClick={() => addCarrinho(item.produto, item.meiaPorcao)}
                                            >+</button>
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
        </div>
    );
}