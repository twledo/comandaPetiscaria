import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { comandasService } from '@/services/comandas.service';
import { useToast } from '@/components/ui/Toaster';
import { formatBRL } from '@/utils/formatters';
import { DollarSign, CreditCard, Receipt } from 'lucide-react';
import type { MesaUI } from '@/types';

interface Props {
    mesa: MesaUI | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CheckoutModal({ mesa, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const toast = useToast(s => s.push);

    if (!mesa) return null;

    const handleFinalizar = async () => {
        try {
            setLoading(true);
            // Supondo que você use o comandaId para fechar
            await comandasService.fechar(mesa.comandaId!);
            toast('success', `Mesa ${mesa.id} fechada com sucesso!`);
            onSuccess();
            onClose();
        } catch (e: any) {
            toast('error', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={!!mesa} onClose={onClose} title="Finalizar Pagamento" size="sm">
            <div className="flex flex-col gap-6 py-2">
                <div className="bg-coal-900 rounded-2xl p-6 border border-white/5 text-center">
                    <p className="text-zinc-500 text-xs uppercase tracking-tighter font-mono">Total da Mesa {mesa.id}</p>
                    <h2 className="text-4xl font-black text-amber-400 mt-1">
                        {formatBRL(mesa.valorTotal || 0)}
                    </h2>
                </div>

                <div className="space-y-3">
                    <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest px-1">Método de recebimento</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-zinc-300">
                            <DollarSign size={20} /> <span className="text-xs">Dinheiro</span>
                        </button>
                        <button className="flex flex-col items-center gap-2 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                            <Receipt size={20} /> <span className="text-xs">Cartão / Pix</span>
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleFinalizar}
                    disabled={loading}
                    className="btn-primary w-full py-4 bg-jade-500 hover:bg-jade-400 text-coal-950 text-lg shadow-glow-jade"
                >
                    {loading ? 'Processando...' : 'CONFIRMAR RECEBIMENTO'}
                </button>
            </div>
        </Modal>
    );
}