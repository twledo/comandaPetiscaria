import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { produtosService } from '@/services/produtos.service';
import { useToast } from '@/components/ui/Toaster';
import { categoriaLabel } from '@/utils/formatters';
import type { Produto, CriarProdutoRequest, CategoriaProduto, UnidadeMedida } from '@/types';

const CATEGORIAS: CategoriaProduto[] = [
  'PORCOES', 'BEBIDAS', 'PETISCOS', 'PRATOS', 'SOBREMESAS', 'OUTROS',
];
const UNIDADES: UnidadeMedida[] = ['UN', 'KG', 'G', 'L', 'ML', 'PORCAO'];

interface ProdutoFormModalProps {
  produto: Produto | null;   // null = create mode
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const empty: CriarProdutoRequest = {
  nome: '', preco: 0, categoria: 'PORCOES',
  descricao: '', permiteMeia: false, disponivel: true, unidadeMedida: 'UN',
};

export default function ProdutoFormModal({ produto, open, onClose, onSaved }: ProdutoFormModalProps) {
  const toast = useToast((s) => s.push);
  const [form,    setForm]    = useState<CriarProdutoRequest>(empty);
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<Partial<Record<keyof CriarProdutoRequest, string>>>({});

  useEffect(() => {
    if (open) setForm(produto ? { ...produto } : empty);
  }, [open, produto]);

  const set = <K extends keyof CriarProdutoRequest>(k: K, v: CriarProdutoRequest[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.nome.trim())    e.nome  = 'Nome obrigatório';
    if (form.preco <= 0)      e.preco = 'Preço deve ser > 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      if (produto) {
        await produtosService.atualizar(produto.id, form);
        toast('success', 'Produto atualizado!');
      } else {
        await produtosService.criar(form);
        toast('success', 'Produto criado!');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={produto ? 'Editar Produto' : 'Novo Produto'}
      size="md"
    >
      <div className="flex flex-col gap-4">
        {/* Nome */}
        <div>
          <label className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest mb-1.5 block">
            Nome *
          </label>
          <input
            className={`input ${errors.nome ? 'border-rose-500/50' : ''}`}
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            placeholder="Ex: Frango à passarinho"
          />
          {errors.nome && <p className="text-xs text-rose-400 mt-1">{errors.nome}</p>}
        </div>

        {/* Preço + Unidade */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest mb-1.5 block">
              Preço (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={`input ${errors.preco ? 'border-rose-500/50' : ''}`}
              value={form.preco}
              onChange={(e) => set('preco', parseFloat(e.target.value) || 0)}
            />
            {errors.preco && <p className="text-xs text-rose-400 mt-1">{errors.preco}</p>}
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest mb-1.5 block">
              Unidade
            </label>
            <select
              className="input"
              value={form.unidadeMedida}
              onChange={(e) => set('unidadeMedida', e.target.value as UnidadeMedida)}
            >
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Categoria */}
        <div>
          <label className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest mb-1.5 block">
            Categoria
          </label>
          <select
            className="input"
            value={form.categoria}
            onChange={(e) => set('categoria', e.target.value as CategoriaProduto)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{categoriaLabel[c]}</option>
            ))}
          </select>
        </div>

        {/* Descrição */}
        <div>
          <label className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest mb-1.5 block">
            Descrição
          </label>
          <textarea
            className="input resize-none h-20"
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
            placeholder="Breve descrição do item..."
          />
        </div>

        {/* Toggles */}
        <div className="flex gap-3">
          {[
            { key: 'permiteMeia' as const, label: 'Permite Meia Porção' },
            { key: 'disponivel'  as const, label: 'Disponível para venda' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => set(key, !form[key])}
              className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${
                form[key]
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-coal-700 border-white/10 text-[var(--text-muted)]'
              }`}
            >
              <span className="text-xs">{label}</span>
              <div className={`w-8 h-4 rounded-full transition-all relative ${form[key] ? 'bg-amber-500' : 'bg-coal-600'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${form[key] ? 'left-4' : 'left-0.5'}`} />
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button className="btn-ghost flex-1" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="btn-primary flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Salvando...' : produto ? 'Salvar' : 'Criar Produto'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
