import api from './api';
import type { Comanda, AdicionarItemRequest } from '@/types';

// Como sua baseURL no api.ts provavelmente é http://localhost:8080
// Vamos usar o caminho completo começando com /api
const BASE = '/comandas';

export const comandasService = {
    // Lista todas as comandas abertas para o dashboard de mesas
    listar: async () => {
        const response = await api.get<Comanda[]>(`${BASE}/ativas`);
        return response.data;
    },

    buscarPorId: async (id: number) => {
        const response = await api.get<Comanda>(`${BASE}/${id}`);
        return response.data;
    },

    // Abre uma nova comanda. mesaId deve ser número!
    criar: async (mesaId: number) => {
        const response = await api.post<Comanda>(`${BASE}/abrir/${mesaId}`);
        return response.data;
    },

    /**
     * Adiciona item à comanda.
     * Note que passamos o produtoId como params para bater com o @RequestParam do Java
     */
    adicionarItem: async (comandaId: number, produtoId: number, item: AdicionarItemRequest) => {
        const response = await api.post<Comanda>(`${BASE}/${comandaId}/itens`, item, {
            params: { produtoId }
        });
        return response.data;
    },

    removerItem: async (comandaId: number, itemId: number) => {
        const response = await api.delete<Comanda>(`${BASE}/${comandaId}/itens/${itemId}`);
        return response.data;
    },

    enviarParaCozinha: async (comandaId: number) => {
        const response = await api.put(`${BASE}/${comandaId}/enviar`);
        return response.data;
    },

    fechar: async (id: number) => {
        const response = await api.patch<Comanda>(`/comandas/${id}/fechar`);
        return response.data;
    },
};