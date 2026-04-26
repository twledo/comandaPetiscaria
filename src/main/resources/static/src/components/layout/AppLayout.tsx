import { NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, ShieldCheck, Flame } from 'lucide-react';
import { useCartStore } from '@/context/cartStore';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/',      icon: ClipboardList, label: 'Atendimento' }, // Onde ficam as comandas/mesas
  { to: '/admin', icon: ShieldCheck,   label: 'Gerência'    },    // Onde fica o cadastro e o caixa
];

export default function AppLayout() {
  const cartCount = useCartStore((s) => s.items.length);

  return (
      <div className="flex h-full bg-coal-950 text-zinc-100">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex flex-col w-64 bg-coal-900 border-r border-white/5 shrink-0 py-8">
          <div className="px-6 mb-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <Flame size={20} className="text-coal-950" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold leading-none">Petiscaria</h1>
              <p className="text-[10px] text-amber-500 font-mono tracking-widest mt-1 uppercase">Digital</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2 px-3 flex-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    end
                    className={({ isActive }) =>
                        clsx(
                            'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative',
                            isActive
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : 'text-zinc-500 hover:bg-white/5 hover:text-white'
                        )
                    }
                >
                  <Icon size={20} />
                  <span>{label}</span>
                  {label === 'Atendimento' && cartCount > 0 && (
                      <span className="ml-auto w-5 h-5 bg-amber-500 rounded-full text-[10px] font-bold text-coal-950 flex items-center justify-center">
                  {cartCount}
                </span>
                  )}
                </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
  );
}