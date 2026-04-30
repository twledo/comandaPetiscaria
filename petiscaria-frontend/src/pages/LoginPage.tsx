import { useState } from 'react';
import { authApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
    const { login } = useAuth();
    const { theme, toggle } = useTheme();
    const [username, setUsername] = useState('');
    const [senha, setSenha] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await authApi.login(username, senha);
            login({ token: res.token, nomeCompleto: res.nomeCompleto, cargo: res.cargo });
        } catch {
            setError('Usuário ou senha inválidos.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.page}>
            <button className={styles.themeBtn} onClick={toggle} title="Alternar tema">
                {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <div className={styles.card + ' animate-scale'}>
                <div className={styles.brand}>
                    <span className={styles.brandIcon}>🍻</span>
                    <h1 className={styles.brandName}>Petiscaria</h1>
                    <p className={styles.brandSub}>Sistema de Comandas</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label>Usuário</label>
                        <input
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Ex: THIAGOWAL"
                            autoComplete="username"
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Senha</label>
                        <input
                            type="password"
                            value={senha}
                            onChange={e => setSenha(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <button type="submit" className={styles.btnLogin} disabled={loading}>
                        {loading ? <span className={styles.spinner} /> : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}