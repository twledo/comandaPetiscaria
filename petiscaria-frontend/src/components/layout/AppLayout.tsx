import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import styles from './AppLayout.module.css';

interface Props {
    children: React.ReactNode;
    // 🌟 1. Adicionamos 'caixa' como uma página válida
    activePage: 'mesas' | 'gestao' | 'caixa';
    onNavigate: (page: 'mesas' | 'gestao' | 'caixa') => void;
}

export default function AppLayout({ children, activePage, onNavigate }: Props) {
    const { user, logout, isAdmin } = useAuth();
    const { theme, toggle } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const firstName = user?.nomeCompleto?.split(' ')[0] ?? 'Usuário';

    return (
        <div className={styles.layout}>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
                <div className={styles.sidebarHeader}>
                    <span className={styles.sidebarBrand}>Petiscaria</span>
                </div>

                <nav className={styles.nav}>
                    <button
                        className={`${styles.navItem} ${activePage === 'mesas' ? styles.active : ''}`}
                        onClick={() => { onNavigate('mesas'); setSidebarOpen(false); }}
                    >
                        <span>Mapa de Mesas</span>
                    </button>

                    {/* Menu exclusivo para ADMIN */}
                    {isAdmin && (
                        <>
                            <button
                                className={`${styles.navItem} ${activePage === 'gestao' ? styles.active : ''}`}
                                onClick={() => { onNavigate('gestao'); setSidebarOpen(false); }}
                            >
                                <span>Gestão</span>
                            </button>

                            {/* 🌟 2. NOVO BOTÃO DO CAIXA AQUI */}
                            <button
                                className={`${styles.navItem} ${activePage === 'caixa' ? styles.active : ''}`}
                                onClick={() => { onNavigate('caixa'); setSidebarOpen(false); }}
                            >
                                <span>Caixa</span>
                            </button>
                        </>
                    )}
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                            {firstName[0]}
                        </div>
                        <div className={styles.userMeta}>
                            <span className={styles.userName}>{firstName}</span>
                            <span className={styles.userRole}>
                                {user?.cargo === 'ADMIN' ? 'Administrador' : 'Garçom'}
                            </span>
                        </div>
                    </div>

                    <div className={styles.footerActions}>
                        <button className={styles.iconBtn} onClick={toggle} title="Alternar tema">
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                        <button className={styles.iconBtn} onClick={logout} title="Sair">
                            ⏻
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div className={styles.main}>
                <header className={styles.topbar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            className={styles.menuBtn}
                            onClick={() => setSidebarOpen(o => !o)}
                        >
                            ☰
                        </button>
                        <h2 className={styles.pageTitle} style={{ margin: 0 }}>
                            {/* 🌟 3. Atualizamos o título da página no cabeçalho */}
                            {activePage === 'mesas' && 'Mapa de Mesas'}
                            {activePage === 'gestao' && 'Gestão de Produtos'}
                            {activePage === 'caixa' && 'Controle de Caixa'}
                        </h2>
                    </div>

                    <div id="topbar-actions" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: '1rem' }}></div>
                </header>

                <main className={styles.content}>
                    {children}
                </main>
            </div>
        </div>
    );
}