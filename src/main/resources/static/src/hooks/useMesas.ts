import { useState, useEffect, useCallback } from 'react';
import { comandasService } from '@/services/comandas.service'; // Check se está com {}
import type { MesaUI, Comanda } from '@/types';

export function useMesas() {
  const [mesas, setMesas] = useState<MesaUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const comandasAbertas = await comandasService.listar();

      // Lógica para gerar as 20 mesas do restaurante
      // e marcar quais estão ocupadas baseado nas comandas vindo do Java
      const gridMesas: MesaUI[] = Array.from({ length: 20 }, (_, i) => {
        const mesaNum = i + 1;
        const comandaDaMesa = comandasAbertas.find(c => c.mesaId === mesaNum);

        return {
          id: mesaNum,
          numero: mesaNum,
          ocupada: !!comandaDaMesa,
          comandaId: comandaDaMesa?.id || null,
          valorTotal: comandaDaMesa?.total || 0,
        };
      });

      setMesas(gridMesas);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { mesas, loading, error, refresh };
}