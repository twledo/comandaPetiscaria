import React, { useState, useEffect } from 'react';
import { UserPlus, ArrowLeft, CheckCircle2, Eye, EyeOff, Copy } from 'lucide-react';
import api from '../api/auth';

const Registro = ({ voltarParaLogin }) => {
    const [nomeCompleto, setNomeCompleto] = useState('');
    const [senha, setSenha] = useState('');
    const [sucesso, setSucesso] = useState(false);
    const [usernameGerado, setUsernameGerado] = useState('');
    const [verSenha, setVerSenha] = useState(false);
    const [contagem, setContagem] = useState(5);

    // Regra de validação
    const senhaValida = /^(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/.test(senha);

    // Efeito para contagem regressiva após sucesso
    useEffect(() => {
        let timer;
        if (sucesso && contagem > 0) {
            timer = setTimeout(() => setContagem(contagem - 1), 1000);
        } else if (sucesso && contagem === 0) {
            voltarParaLogin();
        }
        return () => clearTimeout(timer);
    }, [sucesso, contagem, voltarParaLogin]);

    const handleRegistro = async (e) => {
        e.preventDefault();
        try {
            // Enviamos apenas nome e senha. O Back define o cargo GARCOM e gera o ID
            const response = await api.post('/auth/registrar', {
                nomeCompleto,
                senha,
                cargo: 'GARCOM'
            });

            // Supondo que o Back retorne o objeto do usuário criado com o username
            setUsernameGerado(response.data.username);
            setSucesso(true);
        } catch (err) {
            console.error("ERRO:", err.response?.data || err.message);
            alert("Erro ao registrar. Verifique os dados.");
        }
    };

    if (sucesso) {
        return (
            <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#16181d] border border-green-500/30 rounded-[2.5rem] p-10 shadow-2xl text-center">
                    <div className="flex justify-center text-green-500 mb-6">
                        <CheckCircle2 size={64} className="animate-bounce" />
                    </div>

                    <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">
                        Conta Criada com Sucesso!
                    </h2>
                    <p className="text-gray-500 text-xs mb-8 uppercase font-bold">
                        Guarde suas credenciais de acesso
                    </p>

                    <div className="space-y-4 mb-8">
                        {/* Box do Usuário */}
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                            <p className="text-[9px] text-amber-500 font-black uppercase mb-1">Seu ID de Usuário</p>
                            <p className="text-xl font-black text-white tracking-widest">{usernameGerado}</p>
                        </div>

                        {/* Box da Senha */}
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 relative">
                            <p className="text-[9px] text-amber-500 font-black uppercase mb-1">Sua Senha</p>
                            <p className="text-lg font-bold text-white tracking-widest">
                                {verSenha ? senha : "••••••••"}
                            </p>
                            <button
                                onClick={() => setVerSenha(!verSenha)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                            >
                                {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="text-gray-500 text-[10px] font-black uppercase">
                        Redirecionando em <span className="text-amber-500 text-sm">{contagem}s</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#16181d] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
                <h2 className="text-xl font-black text-white italic uppercase mb-8 flex items-center gap-3">
                    <UserPlus className="text-amber-500" /> Registrar <span className="text-amber-500">Garçom</span>
                </h2>

                <form onSubmit={handleRegistro} className="space-y-5">
                    <div>
                        <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Nome Completo</label>
                        <input
                            type="text"
                            placeholder="Ex: Thiago Walczinski"
                            value={nomeCompleto}
                            onChange={(e) => setNomeCompleto(e.target.value)}
                            className="w-full bg-black/40 border-2 border-white/5 focus:border-amber-500 rounded-2xl py-4 px-6 text-white font-bold outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Defina uma Senha</label>
                        <input
                            type="password"
                            placeholder="Mínimo 8 caracteres"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            className={`w-full bg-black/40 border-2 ${senha && !senhaValida ? 'border-red-500' : 'border-white/5'} focus:border-amber-500 rounded-2xl py-4 px-6 text-white font-bold outline-none transition-all`}
                        />
                        {!senhaValida && senha && (
                            <p className="text-[8px] text-red-500 mt-2 ml-2 font-bold uppercase italic">
                                Requer 8 letras, número e símbolo (!@#)
                            </p>
                        )}
                    </div>

                    <button
                        disabled={!senhaValida || nomeCompleto.length < 5}
                        className="w-full bg-amber-500 disabled:bg-gray-800 disabled:text-gray-500 text-black py-4 rounded-2xl font-black uppercase shadow-lg shadow-amber-500/10 active:scale-95 transition-all mt-4"
                    >
                        Criar minha conta
                    </button>
                </form>

                <button
                    onClick={voltarParaLogin}
                    className="w-full mt-6 text-[10px] text-gray-500 font-black uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                    <ArrowLeft size={14} /> Voltar para o Login
                </button>
            </div>
        </div>
    );
};

export default Registro;