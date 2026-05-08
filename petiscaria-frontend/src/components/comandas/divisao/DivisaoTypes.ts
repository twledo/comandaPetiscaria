// Tipos relacionados à divisão de conta — adicione ao seu types/index.ts

export type MetodoPagamento = 'DINHEIRO' | 'PIX' | 'CREDITO' | 'DEBITO';

export type ModalidadeDivisao = 'IGUALITARIO' | 'VALOR_LIVRE';

export interface ParcelaPessoa {
    nomePessoa: string;
    valor: number;
}

// Body para POST /api/comandas/{id}/dividir-conta
export interface PagamentoParcialDTO {
    modalidade: ModalidadeDivisao;
    numeroPessoas?: number;       // IGUALITARIO
    parcelas?: ParcelaPessoa[];   // VALOR_LIVRE
    metodoPagamento: String;
}

// Body para POST /api/comandas/{id}/pagar-itens
export interface ItemSelecionado {
    itemId: number;
    quantidadePagar: number;
}

export interface PagamentoItensDTO {
    itens: ItemSelecionado[];
    metodoPagamento: String;
}