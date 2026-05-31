import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import MesasPage from './pages/MesasPage';
import GestaoPage from './pages/GestaoPage';

// 🌟 1. Importe a nova tela do caixa (ajuste o caminho se tiver salvo dentro da pasta pages)
import TelaCaixa from './components/caixa/TelaCaixa';

// 🌟 2. Adicione 'caixa' aos tipos permitidos
type Page = 'mesas' | 'gestao' | 'caixa';

export default function App() {
  const { user, isAdmin } = useAuth();
  const [page, setPage] = useState<Page>('mesas');

  if (!user) return <LoginPage />;

  // 🌟 3. Proteção de rota: Garçom não pode acessar 'gestao' nem 'caixa'
  const safePage: Page = (page === 'gestao' || page === 'caixa') && !isAdmin ? 'mesas' : page;

  return (
      <AppLayout activePage={safePage} onNavigate={setPage}>
        {safePage === 'mesas' && <MesasPage />}
        {safePage === 'gestao' && isAdmin && <GestaoPage />}

        {/* 🌟 4. Renderize a tela do caixa quando estiver ativa */}
        {safePage === 'caixa' && isAdmin && <TelaCaixa />}
      </AppLayout>
  );
}