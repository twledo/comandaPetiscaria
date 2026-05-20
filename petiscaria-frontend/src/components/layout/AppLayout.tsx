import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import styles from './AppLayout.module.css';

interface Props {
    children: React.ReactNode;
    activePage: 'mesas' | 'gestao';
    onNavigate: (page: 'mesas' | 'gestao') => void;
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
                        <span className={styles.navIcon}>⊞</span>
                        <span>Mapa de Mesas</span>
                    </button>

                    {isAdmin && (
                        <button
                            className={`${styles.navItem} ${activePage === 'gestao' ? styles.active : ''}`}
                            onClick={() => { onNavigate('gestao'); setSidebarOpen(false); }}
                        >
                            <span className={styles.navIcon}>◈</span>
                            <span>Gestão</span>
                        </button>
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
                <header className={styles.topbar}>
                    <button
                        className={styles.menuBtn}
                        onClick={() => setSidebarOpen(o => !o)}
                    >
                        ☰
                    </button>
                    <h2 className={styles.pageTitle}>
                        {activePage === 'mesas' ? 'Mapa de Mesas' : 'Gestão de Produtos'}
                    </h2>
                    <div className={styles.topbarRight}>
            <span className={styles.topbarBadge}>
              {user?.cargo === 'ADMIN' ? '👑 Admin' : '🍽️ Garçom'}
            </span>
                    </div>
                </header>

                <main className={styles.content}>
                    {children}
                </main>
            </div>
        </div>
    );
}   