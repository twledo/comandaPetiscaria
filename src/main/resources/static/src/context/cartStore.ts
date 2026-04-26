import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Produto } from '@/types';

interface CartState {
    // Estado
    mesaId: number | null;
    comandaId: number | null;
    items: CartItem[];

    // Actions
    setMesa: (mesaId: number, comandaId: number) => void;
    addItem: (produto: Produto, quantidade: number, meiaPorcao: boolean, observacao: string) => void;
    removeItem: (cartId: string) => void;
    updateQuantity: (cartId: string, delta: number) => void;
    clearCart: () => void;

    // Getters (Computados)
    getTotal: () => number;
    getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            mesaId: null,
            comandaId: null,
            items: [],

            // Define a mesa e a comanda atual que o garçom está atendendo
            setMesa: (mesaId, comandaId) => set({ mesaId, comandaId }),

            addItem: (produto, quantidade, meiaPorcao, observacao) => {
                // Regra de Negócio: 60% do valor para meia porção
                // Arredondamos para 2 casas decimais para evitar bugs de float do JS
                const precoBase = produto.preco;
                const precoFinal = meiaPorcao
                    ? Number((precoBase * 0.6).toFixed(2))
                    : precoBase;

                const newItem: CartItem = {
                    cartId: crypto.randomUUID(), // ID único mais robusto
                    produto,
                    quantidade,
                    meiaPorcao,
                    observacao,
                    precoUnitarioFinal: precoFinal,
                };

                set((state) => ({
                    items: [...state.items, newItem],
                }));
            },

            removeItem: (cartId) => set((state) => ({
                items: state.items.filter((item) => item.cartId !== cartId),
            })),

            // Atualiza a quantidade (delta pode ser 1 ou -1)
            updateQuantity: (cartId, delta) => {
                set((state) => ({
                    items: state.items.map((item) => {
                        if (item.cartId === cartId) {
                            const newQty = item.quantidade + delta;
                            return newQty > 0 ? { ...item, quantidade: newQty } : item;
                        }
                        return item;
                    }).filter(item => item.quantidade > 0) // Remove se chegar a 0
                }));
            },

            // Limpa apenas os itens, mantém a mesa se necessário ou limpa tudo no checkout
            clearCart: () => set({ items: [], mesaId: null, comandaId: null }),

            // Helpers de cálculo
            getTotal: () => {
                const items = get().items;
                return items.reduce((acc, item) => acc + (item.precoUnitarioFinal * item.quantidade), 0);
            },

            getItemCount: () => {
                return get().items.reduce((acc, item) => acc + item.quantidade, 0);
            },
        }),
        {
            name: 'petiscaria-cart-storage', // Nome da chave no LocalStorage
            // Filtramos o que queremos persistir (opcional, mas boa prática)
            partialize: (state) => ({
                items: state.items,
                mesaId: state.mesaId,
                comandaId: state.comandaId
            }),
        }
    )
);