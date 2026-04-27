import React, { useState } from 'react';
import api from './api/auth';
import Login from './login/Login';
import Registro from './login/Registro';
import Sidebar from './comandas/Sidebar';
import Header from './comandas/Header';
import GestaoMesas from './comandas/GestaoMesas';

function App() {
    const [token, setToken] = useState(localStorage.getItem('@Petiscaria:Token'));
    const [abaAtiva, setAbaAtiva] = useState('comandas');

    // NOVO: Controla se mostra Login ou Registro quando deslogado
    const [modoExterno, setModoExterno] = useState('login');

    const handleSair = () => {
        localStorage.removeItem('@Petiscaria:Token');
        setToken(null);
        setModoExterno('login');
    };

    // Lógica para usuários NÃO AUTENTICADOS
    if (!token) {
        return modoExterno === 'login' ? (
            <Login
                aoLogar={setToken}
                irParaRegistro={() => setModoExterno('registro')}
            />
        ) : (
            <Registro
                voltarParaLogin={() => setModoExterno('login')}
            />
        );
    }

    // Lógica para usuários AUTENTICADOS
    return (
        <div className="flex min-h-screen bg-[#0f1115]">
            <Sidebar
                abaAtiva={abaAtiva}
                setAbaAtiva={setAbaAtiva}
                onSair={handleSair}
            />

            <div className="flex-1 md:ml-64 flex flex-col pb-20 md:pb-0">
                <Header titulo={abaAtiva === 'comandas' ? 'Comandas' : 'Gestão'} />

                <main className="flex-1 w-full p-4">
                    {abaAtiva === 'comandas' ? <GestaoMesas /> : <Registro />}
                </main>
            </div>
        </div>
    );
}

export default App;