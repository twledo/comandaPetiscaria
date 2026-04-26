import { useState, useEffect, useCallback } from 'react';
import { produtosService } from '@/services/produtos.service';
import type { Produto } from '@/types';

export function useProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await produtosService.listar();
      setProdutos(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { produtos, loading, error, refresh: fetch };
}
