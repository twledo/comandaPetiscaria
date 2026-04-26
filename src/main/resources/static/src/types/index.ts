// ─── Domain enums ────────────────────────────────────────────────────────────

export type StatusComanda =
  | 'ABERTA'
  | 'ENVIADA_COZINHA'
  | 'PRONTA'
  | 'FECHADA'
  | 'CANCELADA';

export type StatusPreparo =
  | 'PENDENTE'
  | 'PREPARANDO'
  | 'PRONTO'
  | 'ENTREGUE';

export type CategoriaProduto =
  | 'PORCOES'
  | 'BEBIDAS'
  | 'SOBREMESAS'
  | 'PETISCOS'
  | 'PRATOS'
  | 'OUTROS';

export type UnidadeMedida =
  | 'UN'
  | 'KG'
  | 'G'
  | 'L'
  | 'ML'
  | 'PORCAO';

// ─── API entities ────────────────────────────────────────────────────────────

export interface Produto {
  id: number;
  nome: string;
  preco: number;
  categoria: CategoriaProduto;
  descricao: string;
  permiteMeia: boolean;
  disponivel: boolean;
  unidadeMedida: UnidadeMedida;
}

export interface ItemPedido {
  id: number;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  observacao?: string;
  statusPreparo: StatusPreparo;
  meiaPorcao: boolean;
}

export interface Comanda {
  id: number;
  mesaId: number;
  status: StatusComanda;
  total: number;
  itens: ItemPedido[];
}

// ─── Request / Response DTOs ─────────────────────────────────────────────────

export interface CriarComandaRequest {
  mesaId: number;
}

export interface AdicionarItemRequest {
  produtoId: number;
  quantidade: number;
  observacao?: string;
  meiaPorcao: boolean;
}

export interface CriarProdutoRequest {
  nome: string;
  preco: number;
  categoria: CategoriaProduto;
  descricao: string;
  permiteMeia: boolean;
  disponivel: boolean;
  unidadeMedida: UnidadeMedida;
}

// ─── Cart (local state before sending to API) ────────────────────────────────

export interface CartItem {
  /** Temporary client-side id */
  cartId: string;
  produto: Produto;
  quantidade: number;
  observacao: string;
  meiaPorcao: boolean;
  /** Computed: meiaPorcao ? produto.preco * 0.6 : produto.preco */
  precoUnitarioFinal: number;
}

// ─── UI helpers ──────────────────────────────────────────────────────────

export interface MesaUI {
  id: number;
  numero?: number;
  ocupada: boolean;
  comandaId?: number | null;
  valorTotal?: number;
  qtdItens?: number;
  comanda?: Comanda;
}
