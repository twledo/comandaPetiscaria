import type { AuthUser, Comanda, LoginResponse, Mesa, PageResponse, Produto } from '../types';

const BASE_URL = 'http://192.168.100.184:8080';

function getToken(): string | null {
    const raw = localStorage.getItem('petiscaria_auth');
    if (!raw) return null;
    try {
        return (JSON.parse(raw) as AuthUser).token;
    } catch {
        return null;
    }
}

async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    if (!res.ok) {
        const text = await res.text().catch(() => 'Erro desconhecido');
        throw new Error(text || `HTTP ${res.status}`);
    }
    if (res.status === 204 || res.headers.get('content-length') === '0') {
        return undefined as T;
    }
    return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
    login: (username: string, senha: string) =>
        request<LoginResponse>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, senha }),
        }),
};

// ── Mesas ─────────────────────────────────────────────────────────────────────
export const mesasApi = {
    listarTodas: () => request<Mesa[]>('/api/mesas'),
    listarDisponiveis: () => request<Mesa[]>('/api/mesas/disponiveis'),
};

// ── Enuns ──────────────────────────────────────────────────────────────────
export interface Opcao {
    value: string | number;
    label: string;
}

export interface Dominios {
    categorias: Opcao[];
    unidades: Opcao[];
    metodosPagamento: Opcao[];
    statusMesa: Opcao[];
    statusComanda: Opcao[];
}

export const dominiosApi = {
    buscarTodos: () => request<Dominios>('/api/dominios'),
};

// ── Comandas ──────────────────────────────────────────────────────────────────
export const comandasApi = {
    abrir: (mesaId: number, nomeCliente: string) =>
        request<Comanda>(
            `/api/comandas/abrir/${mesaId}?nomeCliente=${encodeURIComponent(nomeCliente)}`,
            { method: 'POST' }
        ),

    // 🚀 NOVO: Lançamento em Lote (Carrinho) -> Gera o Ticket Agrupado na Cozinha!
    lancarItens: (
        comandaId: number,
        itensParaEnviar: Array<{ produtoId: number; quantidade: number; meiaPorcao: boolean; observacao?: string }>
    ) =>
        request<Comanda>(`/api/comandas/${comandaId}/lancar-itens`, {
            method: 'POST',
            body: JSON.stringify({ itens: itensParaEnviar }), // Empacota no DTO LancamentoLoteDTO
        }),

    estornarItem: (comandaId: number, itemId: number) =>
        request<Comanda>(`/api/comandas/${comandaId}/itens/${itemId}`, {
            method: 'DELETE',
        }),

    fechar: (comandaId: number) =>
        request<Comanda>(`/api/comandas/${comandaId}/fechar`, { method: 'PATCH' }),

    reabrir: (comandaId: number) =>
        request<Comanda>(`/api/comandas/${comandaId}/reabrir`, { method: 'PATCH' }),

    finalizar: (comandaId: number) =>
        request<void>(`/api/comandas/${comandaId}/recebimento`, { method: 'POST' }),

    pagarItens: (comandaId: number, dados: {
        itens: Array<{ itemId: number; quantidadePagar: number }>;
        metodoPagamento: string
    }) =>
        request<Comanda>(`/api/comandas/${comandaId}/pagar-itens`, {
            method: 'POST',
            body: JSON.stringify(dados),
        }),

    dividirConta: (comandaId: number, dados: any) =>
        request<Comanda>(`/api/comandas/${comandaId}/dividir-conta`, {
            method: 'POST',
            body: JSON.stringify(dados),
        }),
};

// ── Produtos ──────────────────────────────────────────────────────────────────
export const produtosApi = {
    listarTodos: () => request<Produto[]>('/api/produtos/todos'),

    buscarCardapio: (params: {
        nome?: string;
        categoria?: string;
        page?: number;
        size?: number;
    }) => {
        const q = new URLSearchParams();
        if (params.nome) q.set('nome', params.nome);
        if (params.categoria) q.set('categoria', params.categoria);
        q.set('page', String(params.page ?? 0));
        q.set('size', String(params.size ?? 50));
        return request<PageResponse<Produto>>(`/api/produtos/cardapio/filtro?${q}`);
    },

    cadastrar: (produto: Omit<Produto, 'id'>) =>
        request<Produto>('/api/produtos/cadastrar', {
            method: 'POST',
            body: JSON.stringify(produto),
        }),

    atualizar: (id: number, produto: Omit<Produto, 'id'>) =>
        request<Produto>(`/api/produtos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(produto),
        }),

    alternarEstoque: (id: number) =>
        request<Produto>(`/api/produtos/${id}/estoque`, { method: 'PATCH' }),
};