package dev.petiscaria.comandas.security;

import dev.petiscaria.comandas.enuns.TipoUsuario;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final SecurityFilter securityFilter;

    public SecurityConfig(SecurityFilter securityFilter) {
        this.securityFilter = securityFilter;
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(cors -> cors.configurationSource(request -> {
                    var config = new org.springframework.web.cors.CorsConfiguration();

                    config.setAllowedOriginPatterns(java.util.List.of(
                            "http://localhost:5173",
                            "http://192.168.100.184:5173", // Seu IP atual
                            "http://192.168.100.*:5173",    // Qualquer dispositivo na sua rede
                            "https://reidoespetinhopetiscaria.com",
                            "https://www.reidoespetinhopetiscaria.com"
                    ));

                    config.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
                    config.setAllowedHeaders(java.util.List.of("*"));
                    config.setAllowCredentials(true);
                    return config;
                }))
                .csrf(csrf -> csrf.disable())
                // IMPORTANTE para SockJS funcionar corretamente:
                .headers(headers -> headers.frameOptions(frame -> frame.disable()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(req -> {
                    req.requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll();

                    // Liberar o Handshake do WebSocket ANTES das outras regras
                    req.requestMatchers("/ws-petiscaria/**").permitAll();

                    req.requestMatchers(org.springframework.http.HttpMethod.POST, "/api/auth/**").permitAll();

//                    req.requestMatchers(HttpMethod.POST, "/api/auth/registrar")
//                          .hasRole(TipoUsuario.ADMIN.name());

                    req.requestMatchers(HttpMethod.POST, "/api/pedidos/**")
                            .hasAnyRole(
                                    TipoUsuario.ADMIN.name(),
                                    TipoUsuario.GARCOM.name()
                            );

                    req.requestMatchers(HttpMethod.GET, "/api/produtos/cardapio/**")
                            .hasAnyRole(
                                    TipoUsuario.ADMIN.name(),
                                    TipoUsuario.GARCOM.name()
                            );

                    req.requestMatchers("/api/produtos/**")
                            .hasRole(TipoUsuario.ADMIN.name());

                    req.requestMatchers("/api/caixa/**")
                            .hasRole(TipoUsuario.ADMIN.name());

                    req.requestMatchers("/api/comandas/**")
                            .hasAnyRole(
                                    TipoUsuario.ADMIN.name(),
                                    TipoUsuario.GARCOM.name()
                            );

                    req.requestMatchers("/api/mesas/**")
                            .hasAnyRole(
                                    TipoUsuario.ADMIN.name(),
                                    TipoUsuario.GARCOM.name()
                            );

                    req.anyRequest().authenticated();
                })
                .addFilterBefore(securityFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
