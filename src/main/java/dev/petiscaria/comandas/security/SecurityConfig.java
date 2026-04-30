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
                    config.setAllowedOrigins(java.util.List.of("http://localhost:5173")); // URL do seu Vite
                    config.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
                    config.setAllowedHeaders(java.util.List.of("*"));
                    config.setAllowCredentials(true);
                    return config;
                }))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(req -> {
                    // IMPORTANTE: Liberar o OPTIONS para todas as rotas por causa do CORS
                    req.requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll();

                    req.requestMatchers(org.springframework.http.HttpMethod.POST, "/api/auth/login").permitAll();
                    req.requestMatchers(org.springframework.http.HttpMethod.POST, "/api/auth/registrar").permitAll();

                    req.requestMatchers("/api/usuarios/registrar").hasRole(TipoUsuario.ADMIN.name());
                    req.requestMatchers("/api/produtos/**").hasRole(TipoUsuario.ADMIN.name());
                    req.requestMatchers("/api/comandas/**").hasAnyRole(TipoUsuario.ADMIN.name(), TipoUsuario.GARCOM.name());
                    req.requestMatchers("/api/mesas/**").hasAnyRole(TipoUsuario.ADMIN.name(), TipoUsuario.GARCOM.name());

                    req.anyRequest().authenticated();
                })
                .addFilterBefore(securityFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}