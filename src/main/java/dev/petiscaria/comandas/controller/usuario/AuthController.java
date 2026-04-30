package dev.petiscaria.comandas.controller.usuario;

import dev.petiscaria.comandas.dto.login.LoginRequest;
import dev.petiscaria.comandas.dto.login.LoginResponse; // Certifique-se de importar seu novo DTO
import dev.petiscaria.comandas.models.usuario.Usuario;
import dev.petiscaria.comandas.service.usuario.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final UsuarioService usuarioService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest data) {
        // Agora o service retorna um objeto LoginResponse completo
        LoginResponse response = usuarioService.login(data.username(), data.senha());

        // Retornamos o objeto inteiro (Token + Nome + Cargo)
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('ADMIN')") // Somente ADMIN pode registrar novos usuários
    @PostMapping("/registrar")
    public ResponseEntity<Usuario> registrar(@RequestBody Usuario usuario) {
        Usuario novoUsuario = usuarioService.registrar(usuario);
        return ResponseEntity.ok(novoUsuario);
    }
}