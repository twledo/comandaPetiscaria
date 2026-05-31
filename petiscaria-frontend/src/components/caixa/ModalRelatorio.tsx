function ModalRelatorio({ sessaoId, onClose }: { sessaoId: number, onClose: () => void }) {
    const [relatorio, setRelatorio] = useState<any>(null);

    useEffect(() => {
        caixaApi.gerarRelatorio(sessaoId).then(setRelatorio);
    }, [sessaoId]);

    if (!relatorio) return <div className={styles.backdrop}>Carregando relatório...</div>;

    return (
        <div className={styles.backdrop}>
            <div className={styles.modal} style={{ maxWidth: '500px' }}>
                <h3>Relatório do Turno #{sessaoId}</h3>
                <div className={styles.relatorioBody} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p>Dinheiro (Vendas): <b>R$ {Number(relatorio.totalDinheiroVendas).toFixed(2)}</b></p>
                    <p>PIX: <b>R$ {Number(relatorio.totalPix).toFixed(2)}</b></p>
                    <p>Débito: <b>R$ {Number(relatorio.totalDebito).toFixed(2)}</b></p>
                    <p>Crédito: <b>R$ {Number(relatorio.totalCredito).toFixed(2)}</b></p>
                    <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '10px 0' }} />
                    <p>Saldo Inicial: R$ {Number(relatorio.saldoInicial).toFixed(2)}</p>
                    <p>Suprimentos: R$ {Number(relatorio.totalSuprimentos).toFixed(2)}</p>
                    <p>Sangrias: R$ {Number(relatorio.totalSangrias).toFixed(2)}</p>
                    <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '10px 0' }} />
                    <p style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>
                        <strong>Diferença de Caixa: R$ {Number(relatorio.diferencaCaixa).toFixed(2)}</strong>
                    </p>
                </div>
                <button className={styles.btnPrimary} style={{ marginTop: '20px' }} onClick={onClose}>Fechar</button>
            </div>
        </div>
    );
}