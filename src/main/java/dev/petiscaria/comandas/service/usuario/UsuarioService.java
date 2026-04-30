package dev.petiscaria.comandas.service.usuario;

import dev.petiscaria.comandas.dto.login.LoginResponse;
import dev.petiscaria.comandas.models.usuario.Usuario;
import dev.petiscaria.comandas.repository.usuario.UsuarioRepository;
import dev.petiscaria.comandas.security.TokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lógica de geração de USUÁRIO:
 * - Thiago Walczinski -> THIAGOWAL (3 primeiras do sobrenome)
 * - Thiago Walczinski Lucinski -> THIAGOWL (iniciais dos sobrenomes)
 */
@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository repository;
    private final TokenService tokenService;
    private final BCryptPasswordEncoder passwordEncoder;

    public LoginResponse login(String username, String senha) {
        var usuario = repository.findByUsername(username.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        if (passwordEncoder.matches(senha, usuario.getSenha())) {
            String token = tokenService.gerarToken(usuario);
            // Retornamos tudo que o front precisa para o layout
            return new LoginResponse(token, usuario.getNomeCompleto(), usuario.getCargo().name());
        }
        throw new RuntimeException("Senha inválida");
    }

    @Transactional
    public Usuario registrar(Usuario usuario) {
        // 1. Validar se o usuário já existe pelo nome completo (opcional) ou se o ID gerado conflita
        String usernameGerado = gerarUsername(usuario.getNomeCompleto());

        if (repository.findByUsername(usernameGerado).isPresent()) {
            throw new RuntimeException("Este usuário já está cadastrado ou o ID gerado já existe.");
        }

        // 2. Definir o username gerado (sempre em uppercase)
        usuario.setUsername(usernameGerado);

        // 3. Criptografar a senha antes de salvar
        usuario.setSenha(passwordEncoder.encode(usuario.getSenha()));

        // 4. Salvar no banco
        return repository.save(usuario);
    }

    /**
     * Lógica de geração de ID:
     * - Thiago Walczinski -> THIAGOWAL (3 primeiras do sobrenome)
     * - Thiago Walczinski Lucinski -> THIAGOWL (iniciais dos sobrenomes)
     */
    private String gerarUsername(String nomeCompleto) {
        if (nomeCompleto == null || nomeCompleto.isBlank()) {
            throw new RuntimeException("Nome completo é obrigatório para gerar o ID.");
        }

        String[] partes = nomeCompleto.trim().toUpperCase().split("\\s+");
        String primeiroNome = partes[0];

        if (partes.length == 2) {
            // Caso: Nome + 1 Sobrenome
            String sobrenome = partes[1];
            String sufixo = sobrenome.length() >= 3 ? sobrenome.substring(0, 3) : sobrenome;
            return primeiroNome + sufixo;
        }

        if (partes.length > 2) {
            // Caso: Nome + Vários Sobrenomes
            StringBuilder iniciais = new StringBuilder();
            for (int i = 1; i < partes.length; i++) {
                iniciais.append(partes[i].charAt(0));
            }
            return primeiroNome + iniciais.toString();
        }

        return primeiroNome; // Caso tenha apenas o primeiro nome
    }
}