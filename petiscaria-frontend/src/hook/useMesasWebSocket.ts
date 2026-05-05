import { useEffect } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import type { AuthUser } from '../types';

export function useMesasWebSocket(onMessageReceived: (data: any) => void) {
    useEffect(() => {
        // Recupera o token para autenticação
        const raw = localStorage.getItem('petiscaria_auth');
        const user = raw ? (JSON.parse(raw) as AuthUser) : null;

        const socket = new SockJS('http://192.168.100.184:8080/ws-petiscaria');
        const stompClient = Stomp.over(socket);

        // Desativa o log de debug no console (opcional)
        stompClient.debug = () => {};

        const headers = {
            Authorization: `Bearer ${user?.token}`
        };

        stompClient.connect(headers, () => {
            // Se inscreve no tópico definido no Java
            stompClient.subscribe('/topic/mesas', (message) => {
                if (message.body) {
                    const data = JSON.parse(message.body);
                    onMessageReceived(data);
                }
            });
        }, (error) => {
            console.error("Erro WebSocket:", error);
        });

        // Limpa a conexão quando o componente for desmontado
        return () => {
            if (stompClient && stompClient.connected) {
                stompClient.disconnect(() => console.log("WebSocket desconectado"));
            }
        };
    }, [onMessageReceived]);
}