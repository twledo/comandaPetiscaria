import React, {useEffect, useState} from 'react';
import {LayoutDashboard, LogOut, Settings, Utensils} from 'lucide-react';
import {jwtDecode} from "jwt-decode";

const Sidebar = ({ abaAtiva, setAbaAtiva, onSair }) => {
    const [userData, setUserData] = useState({ username: '', cargo: '', nome: '' });

    useEffect(() => {
        const token = localStorage.getItem('@Petiscaria:Token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUserData({
                    username: decoded.sub,
                    cargo: decoded.role,
                    nome: decoded.sub
                });
            } catch (e) {
                console.error("Token inválido", e);
                onSair();
            }
        } else {
            onSair(); // Se não tem token, força logout
        }
    }, [onSair]);

    // Filtra o menu: Gestão só aparece para ADMIN
    const menuItems = [
        { id: 'comandas', label: 'Comandas', icon: LayoutDashboard },
        { id: 'gestao', label: 'Gestão', icon: Settings, adminOnly: true },
    ].filter(item => !item.adminOnly || userData.cargo === 'ADMIN');

    return (
        <>
            {/* DESKTOP SIDEBAR */}
            <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-[#16181d] border-r border-white/5 flex-col z-50">
                <div className="p-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-500 p-2 rounded-xl shadow-lg shadow-amber-500/20">
                            <Utensils className="text-black" size={20} />
                        </div>
                        <span className="text-xl font-black tracking-tighter text-white italic uppercase">PETISCARIA</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setAbaAtiva(item.id)}
                                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-sm transition-all duration-300
                                ${abaAtiva === item.id
                                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10'
                                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
                            >
                                <Icon size={20} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* PERFIL E SAIR */}
                <div className="p-4 border-t border-white/5 space-y-2">
                    <div className="bg-black/20 p-4 rounded-2xl flex items-center gap-3 border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-black font-black">
                            {userData.username ? userData.username.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[11px] font-black text-white uppercase tracking-tighter truncate">
                                {userData.username || 'Usuário'}
                            </p>
                            <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">
                                {userData.cargo}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onSair}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-500/60 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.2em]"
                    >
                        <LogOut size={16} />
                        Sair
                    </button>
                </div>
            </aside>

            {/* MOBILE BOTTOM BAR */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full h-20 bg-[#16181d] border-t border-white/10 z-50 flex items-center justify-around px-2 pb-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setAbaAtiva(item.id)}
                        className={`flex flex-col items-center justify-center w-20 h-16 rounded-2xl ${abaAtiva === item.id ? 'text-amber-500' : 'text-gray-500'}`}
                    >
                        <item.icon size={24} />
                        <span className="text-[10px] font-bold mt-1 uppercase">{item.label}</span>
                    </button>
                ))}
            </nav>
        </>
    );
};

export default Sidebar;