function ModalContagem({ tipo, onClose, onSuccess }: any) {
    const [contagem, setContagem] = useState<Record<string, string>>({});
    const notas = ['200', '100', '50', '20', '10', '5', '2', '1', '0.50', '0.25', '0.10', '0.05'];

    const total = notas.reduce((acc, v) => acc + (parseFloat(v) * (parseInt(contagem[v] || '0'))), 0);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const payload = {
            qtd200: parseInt(contagem['200']) || 0,
            qtd100: parseInt(contagem['100']) || 0,
            qtd50: parseInt(contagem['50']) || 0,
            qtd20: parseInt(contagem['20']) || 0,
            qtd10: parseInt(contagem['10']) || 0,
            qtd5: parseInt(contagem['5']) || 0,
            qtd2: parseInt(contagem['2']) || 0,
            qtd1: parseInt(contagem['1']) || 0,
            qtd050: parseInt(contagem['0.50']) || 0,
            qtd025: parseInt(contagem['0.25']) || 0,
            qtd010: parseInt(contagem['0.10']) || 0,
            qtd005: parseInt(contagem['0.05']) || 0
        };

        try {
            if (tipo === 'ABRIR') await caixaApi.abrir(payload);
            else await caixaApi.fechar(payload);
            onSuccess();
            onClose();
        } catch (e) { alert("Erro ao salvar contagem"); }
    }

    return (
        <div className={styles.backdrop}>
            <form className={styles.modal} onSubmit={handleSubmit}>
                <h3>{tipo === 'ABRIR' ? 'Contagem de Troco' : 'Conferência de Fechamento'}</h3>
                <div className={styles.calculadoraGrid}>
                    {notas.map(n => (
                        <input key={n} placeholder={`R$ ${n}`} onChange={e => setContagem({...contagem, [n]: e.target.value})} />
                    ))}
                </div>
                <strong>Total: R$ {total.toFixed(2)}</strong>
                <button type="submit">Confirmar</button>
            </form>
        </div>
    );
}