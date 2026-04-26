import { useState, useEffect, useCallback } from 'react';
import { comandasService } from '@/services/comandas.service';
import type { Comanda } from '@/types';

export function useComandas() {
  const [comandas, setComandas]   = useState<Comanda[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await comandasService.listar();
      setComandas(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 30_000); // poll every 30s
    return () => clearInterval(id);
  }, [fetch]);

  return { comandas, loading, error, refresh: fetch };
}

export function useComanda(id: number | null) {
  const [comanda, setComanda] = useState<Comanda | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await comandasService.buscarPorId(id);
      setComanda(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { comanda, loading, error, refresh: fetch };
}
