import React, { useState } from 'react';
import Login from './login/Login';
import Sidebar from './sidebar/Sidebar.tsx';
import Header from './header/Header.tsx';
import GestaoMesas from './sidebar/comandas/GestaoMesas';
import GestaoContainer from "./sidebar/GestaoContainer.jsx";

function App() {
    const [token, setToken] = useState(localStorage.getItem('@Petiscaria:Token'));
    const [abaAtiva, setAbaAtiva] = useState('comandas');

    const handleSair = () => {
        localStorage.removeItem('@Petiscaria:Token');
        setToken(null);
    };

    // Se NÃO houver token, mostra APENAS a tela de Login
    if (!token) {
        return (
            <Login aoLogar={setToken} />
        );
    }

    // Se houver token, mostra o Sistema
    return (
        <div className="flex min-h-screen bg-[#0f1115]">
            <Sidebar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} onSair={handleSair} />

            <div className="flex-1 md:ml-64 flex flex-col pb-20 md:pb-0">
                <Header titulo={abaAtiva === 'comandas' ? 'Comandas' : 'Administração'} />

                <main className="flex-1 w-full p-6">
                    {/* Lógica de abas principais */}
                    {abaAtiva === 'comandas' ? <GestaoMesas /> : <GestaoContainer />}
                </main>
            </div>
        </div>
    );
}

export default App;