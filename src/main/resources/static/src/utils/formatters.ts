export const formatBRL = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const categoriaLabel: Record<string, string> = {
  PORCOES:    'Porções',
  BEBIDAS:    'Bebidas',
  SOBREMESAS: 'Sobremesas',
  PETISCOS:   'Petiscos',
  PRATOS:     'Pratos',
  OUTROS:     'Outros',
};

export const statusComandaLabel: Record<string, string> = {
  ABERTA:           'Aberta',
  ENVIADA_COZINHA:  'Na Cozinha',
  PRONTA:           'Pronta',
  FECHADA:          'Fechada',
  CANCELADA:        'Cancelada',
};

export const statusPreparoLabel: Record<string, string> = {
  PENDENTE:   'Pendente',
  PREPARANDO: 'Preparando',
  PRONTO:     'Pronto',
  ENTREGUE:   'Entregue',
};

export const statusComandaColor: Record<string, string> = {
  ABERTA:           'text-amber-400 bg-amber-500/10 border-amber-500/20',
  ENVIADA_COZINHA:  'text-ember-400 bg-ember-500/10 border-ember-500/20',
  PRONTA:           'text-jade-400 bg-jade-500/10 border-jade-500/20',
  FECHADA:          'text-[var(--text-muted)] bg-white/5 border-white/10',
  CANCELADA:        'text-rose-400 bg-rose-500/10 border-rose-500/20',
};
