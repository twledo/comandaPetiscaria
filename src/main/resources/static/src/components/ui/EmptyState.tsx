import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-coal-700 border border-white/[0.06] flex items-center justify-center">
        <Icon size={28} className="text-[var(--text-muted)]" />
      </div>
      <div>
        <p className="font-display text-lg font-medium text-[var(--text-primary)]">{title}</p>
        {description && (
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
