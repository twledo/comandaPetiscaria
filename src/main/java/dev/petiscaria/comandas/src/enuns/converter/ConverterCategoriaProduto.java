package dev.petiscaria.comandas.src.enuns.converter;

import dev.petiscaria.comandas.src.enuns.CategoriaProduto;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ConverterCategoriaProduto implements AttributeConverter<CategoriaProduto, Integer> {

    @Override
    public Integer convertToDatabaseColumn(CategoriaProduto categoria) {
        return (categoria == null) ? null : categoria.getId();
    }

    @Override
    public CategoriaProduto convertToEntityAttribute(Integer id) {
        if (id == null) return null;
        // Usa o método que você criou no Enum
        return CategoriaProduto.fromId(id);
    }
}