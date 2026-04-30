export type StatusMesa = 'DISPONIVEL' | 'OCUPADA' | 'AGUARDANDO_PAGAMENTO';
export type CategoriaProduto = 'BEBIDA' | 'PORCAO' | 'PRATO' | 'SOBREMESA' | 'OUTROS';
export type UnidadeMedida = 'UNIDADE' | 'GRAMA' | 'ML' | 'LITRO';
export type TipoUsuario = 'ADMIN' | 'GARCOM';

export interface Mesa {
    id: number;
    numero: number;
    status: StatusMesa;
    comandaAtiva?: Comanda;
}

export interface ItemPedido {
    id: number;
    nomeProduto: string;
    quantidade: number;
    precoUnitario: number;
    totalItem: number;
    meiaPorcao: boolean;
    observacao?: string;
    produto: Produto;
}

export interface Comanda {
    id: number;
    mesa: Mesa;
    total: number;
    itens: ItemPedido[];
    createdAt: string;
    updatedAt: string;
}

export interface Produto {
    id: number;
    nome: string;
    preco: number;
    categoria: CategoriaProduto;
    descricao?: string;
    permiteMeia: boolean;
    disponivel: boolean;
    unidadeMedida?: UnidadeMedida;
    quantidadePorUnidade?: number;
}

export interface LoginResponse {
    token: string;
    nomeCompleto: string;
    cargo: TipoUsuario;
}

export interface AuthUser {
    token: string;
    nomeCompleto: string;
    cargo: TipoUsuario;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export interface CarrinhoItem {
    produto: Produto;
    quantidade: number;
    meiaPorcao: boolean;
    observacao?: string;
}