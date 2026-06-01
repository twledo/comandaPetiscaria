import { useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import type { AuthUser } from '../types';

export function useMesasWebSocket(onMessageReceived: (data: any) => void) {
    // Usamos refs para controlar o timeout e evitar que ele tente reconectar se o usuário sair da página de Mesas
    const reconnectTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        let stompClient: Stomp.Client | null = null;

        const connect = () => {
            const raw = localStorage.getItem('petiscaria_auth');
            const user = raw ? (JSON.parse(raw) as AuthUser) : null;

            // const socket = new SockJS('/ws-petiscaria'); //TROCAR RSYNC -
            const socket = new SockJS('http://localhost:8080/ws-petiscaria');
            stompClient = Stomp.over(socket);
            // Desativa o log verboso do Stomp no console
            stompClient.debug = () => {};

            // 1. HEARTBEAT: Mantém a conexão viva enviando "pings" a cada 10 segundos
            stompClient.heartbeat.outgoing = 10000;
            stompClient.heartbeat.incoming = 10000;

            const headers = {
                Authorization: `Bearer ${user?.token}`
            };

            stompClient.connect(
                headers,
                () => {
                    console.log("🟢 WebSocket Conectado!");

                    stompClient!.subscribe('/topic/mesas', (message) => {
                        if (message.body) {
                            const data = JSON.parse(message.body);
                            onMessageReceived(data);
                        }
                    });
                },
                (error) => {
                    console.error("🔴 WebSocket caiu ou falhou. Tentando reconectar...", error);
                    scheduleReconnect(); // Dispara a tentativa de reconexão
                }
            );
        };

        // 2. AUTO-RECONNECT: Tenta ligar de novo a cada 1 segundo se cair
        const scheduleReconnect = () => {
            if (!isMounted.current) return; // Se o usuário mudou de tela, não reconecta
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = setTimeout(() => {
                console.log("⏳ Tentando reconectar WebSocket...");
                connect();
            }, 1000);
        };

        // Inicia a primeira conexão
        connect();

        // Limpa tudo quando o garçom sair da tela de Mesas
        return () => {
            isMounted.current = false;
            clearTimeout(reconnectTimeout.current);
            if (stompClient && stompClient.connected) {
                stompClient.disconnect(() => console.log("⚪ WebSocket desconectado intencionalmente"));
            }
        };
    }, [onMessageReceived]);
}