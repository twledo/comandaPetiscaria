import api from './api';

export const mesasService = {
  /**
   * The backend may expose a /mesas endpoint returning the list of active mesa IDs.
   * If not, we derive mesa state from the comandas list (see useMesas hook).
   */
  listar: () =>
    api.get<number[]>('/mesas').then((r) => r.data).catch(() => [] as number[]),
};
