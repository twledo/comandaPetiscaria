import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (type: ToastType, message: string) => void;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  push: (type, message) => {
    const id = Date.now().toString();
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const icons = {
  success: <CheckCircle2 size={16} className="text-jade-400 shrink-0" />,
  error:   <XCircle     size={16} className="text-rose-400 shrink-0"  />,
  info:    <AlertCircle size={16} className="text-amber-400 shrink-0" />,
};
const styles = {
  success: 'border-jade-500/30',
  error:   'border-rose-500/30',
  info:    'border-amber-500/30',
};

export default function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0,  scale: 1   }}
            exit={{   opacity: 0, x: 40,  scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-coal-800 border ${styles[t.type]} shadow-card max-w-xs`}
          >
            {icons[t.type]}
            <span className="text-sm text-[var(--text-primary)] flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="text-[var(--text-muted)] hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
