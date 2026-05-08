package dev.petiscaria.comandas.controller.dominio;

import dev.petiscaria.comandas.dto.opcao.OpcaoDTO;
import dev.petiscaria.comandas.enuns.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dominios")
public class DominioController {

    @GetMapping
    public ResponseEntity<Map<String, List<OpcaoDTO>>> listarTodos() {
        Map<String, List<OpcaoDTO>> dominios = new HashMap<>();

        // 1. Categorias (value = id numérico, label = Nome formatado)
        dominios.put("categorias", Arrays.stream(CategoriaProduto.values())
                .map(c -> new OpcaoDTO(c.getId(), formatarNome(c.name())))
                .toList());

        // 2. Unidades de Medida (value = sigla, label = Nome formatado)
        dominios.put("unidades", Arrays.stream(UnidadeMedida.values())
                .map(u -> new OpcaoDTO(u.getSigla(), formatarNome(u.name())))
                .toList());

        // 3. Métodos de Pagamento (value = name, label = descricao)
        dominios.put("metodosPagamento", Arrays.stream(MetodoPagamento.values())
                .map(m -> new OpcaoDTO(m.name(), m.getDescricao()))
                .toList());

        // 4. Status da Mesa (value = name, label = formatado)
        dominios.put("statusMesa", Arrays.stream(StatusMesa.values())
                .map(s -> new OpcaoDTO(s.name(), formatarNome(s.name())))
                .toList());

        // 5. Status da Comanda (value = name, label = descricao)
        dominios.put("statusComanda", Arrays.stream(StatusComanda.values())
                .map(s -> new OpcaoDTO(s.name(), s.getDescricao()))
                .toList());

        return ResponseEntity.ok(dominios);
    }

    // Método utilitário para transformar "MINI_PIZZA" em "Mini Pizza"
    private String formatarNome(String nomeEnum) {
        if (nomeEnum == null || nomeEnum.isEmpty()) return "";
        String nomeComEspacos = nomeEnum.replace("_", " ").toLowerCase();

        // Capitaliza a primeira letra de cada palavra
        String[] palavras = nomeComEspacos.split(" ");
        StringBuilder resultado = new StringBuilder();
        for (String palavra : palavras) {
            if (!palavra.isEmpty()) {
                resultado.append(Character.toUpperCase(palavra.charAt(0)))
                        .append(palavra.substring(1))
                        .append(" ");
            }
        }
        return resultado.toString().trim();
    }
}