import api from './api';
import type { Produto, CriarProdutoRequest } from '@/types';

const BASE = '/produtos'; // O @RequestMapping do seu Controller

export const produtosService = {
  // Para o Admin ver todos
  listar: () =>
      api.get<Produto[]>(`${BASE}/todos`).then((r) => r.data),

  // Para o Garçom ver apenas o cardápio ativo
  listarCardapio: () =>
      api.get<Produto[]>(`${BASE}/cardapio`).then((r) => r.data),

  buscarPorId: (id: number) =>
      api.get<Produto>(`${BASE}/${id}`).then((r) => r.data),

  // Ajustado para o endpoint @PostMapping("/cadastrar")
  criar: (data: CriarProdutoRequest) =>
      api.post<Produto>(`${BASE}/cadastrar`, data).then((r) => r.data),

  // Ajustado para o endpoint @PatchMapping("/{id}/estoque")
  toggleDisponibilidade: (id: number) =>
      api.patch<Produto>(`${BASE}/${id}/estoque`).then((r) => r.data),

  // Partial: No Java precisaremos do @PutMapping("/{id}") se quiser usar este
  atualizar: (id: number, data: Partial<CriarProdutoRequest>) =>
      api.put<Produto>(`${BASE}/${id}`, data).then((r) => r.data),
};