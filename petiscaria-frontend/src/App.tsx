import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import MesasPage from './pages/MesasPage';
import GestaoPage from './pages/GestaoPage';

type Page = 'mesas' | 'gestao';

export default function App() {
  const { user, isAdmin } = useAuth();
  const [page, setPage] = useState<Page>('mesas');

  if (!user) return <LoginPage />;

  // Garçom cannot access gestao
  const safePage: Page = page === 'gestao' && !isAdmin ? 'mesas' : page;

  return (
      <AppLayout activePage={safePage} onNavigate={setPage}>
        {safePage === 'mesas' && <MesasPage />}
        {safePage === 'gestao' && isAdmin && <GestaoPage />}
      </AppLayout>
  );
}