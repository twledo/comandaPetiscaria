package dev.petiscaria.comandas.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Canal onde o frontend vai "ouvir" as atualizações
        config.enableSimpleBroker("/topic");
        // Prefixo para quando o frontend enviar algo (opcional no seu caso)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-petiscaria")
                // Patterns é mais seguro e flexível que o "*" puro para SockJS
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}