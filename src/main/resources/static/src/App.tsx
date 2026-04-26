import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout   from '@/components/layout/AppLayout';
import MesasPage   from '@/pages/MesasPage';
import CardapioPage from '@/pages/CardapioPage';
import ComandaPage  from '@/pages/ComandaPage';
import AdminPage    from '@/pages/AdminPage';
import Toaster      from '@/components/ui/Toaster';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index         element={<MesasPage />}   />
          <Route path="cardapio" element={<CardapioPage />} />
          <Route path="comanda"  element={<ComandaPage />}  />
          <Route path="admin"    element={<AdminPage />}    />
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
