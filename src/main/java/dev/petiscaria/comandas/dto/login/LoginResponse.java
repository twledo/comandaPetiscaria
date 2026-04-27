package dev.petiscaria.comandas.dto.login;

public record LoginResponse(String token, String nomeCompleto, String cargo) {
}