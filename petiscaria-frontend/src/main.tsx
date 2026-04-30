import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 1. Importe o AuthProvider (Ajuste o caminho da pasta se necessário)
import {AuthProvider} from './contexts/AuthContext'
import {ThemeProvider} from "./contexts/ThemeContext.tsx";

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider>
            <AuthProvider>
                <App/>
            </AuthProvider>
        </ThemeProvider>
    </StrictMode>,
)