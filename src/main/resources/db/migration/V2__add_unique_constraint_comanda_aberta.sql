CREATE UNIQUE INDEX ux_comanda_aberta_por_mesa
ON comanda (mesa_id)
WHERE status = 'ABERTA';
