import React, { useState } from 'react';
import { Lock, User, Utensils, ArrowRight } from 'lucide-react';
import api from '../api/auth';

const Login = ({ aoLogar, irParaRegistro }) => {
    const [username, setUsername] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro(false);

        try {
            // Enviamos o username em Uppercase como o Back-end espera
            const response = await api.post('/auth/login', {
                username: username.toUpperCase(),
                senha
            });

            // Desestruturamos os dados que o novo DTO do Back-end envia
            const { token } = response.data;

            // Salvamos o token e os dados do perfil para a Sidebar usar
            localStorage.setItem('@Petiscaria:Token', token);

            // Notifica o App.jsx que o login deu certo
            aoLogar(token);

        } catch (err) {
            console.error("Erro no login:", err);
            setErro(true);
            setSenha('');
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#16181d] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">

                {/* Header do Card */}
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-amber-500 p-4 rounded-2xl mb-4 text-black shadow-lg shadow-amber-500/20">
                        <Utensils size={32}/>
                    </div>
                    <h1 className="text-2xl font-black italic text-white uppercase tracking-tighter text-center">
                        Petiscaria <span className="text-amber-500 underline decoration-2">Sistema</span>
                    </h1>
                </div>

                {/* Formulário */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20}/>
                        <input
                            type="text"
                            placeholder="USUÁRIO"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black/40 border-2 border-white/5 focus:border-amber-500 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none uppercase transition-all"
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20}/>
                        <input
                            type="password"
                            placeholder="SENHA"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            className={`w-full bg-black/40 border-2 ${erro ? 'border-red-500' : 'border-white/5'} focus:border-amber-500 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none transition-all`}
                        />
                    </div>

                    {erro && (
                        <p className="text-red-500 text-[10px] font-black uppercase text-center animate-pulse">
                            Acesso Negado
                        </p>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-white hover:bg-amber-500 text-black py-4 rounded-2xl font-black uppercase transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-white/5"
                    >
                        Entrar <ArrowRight size={18}/>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;