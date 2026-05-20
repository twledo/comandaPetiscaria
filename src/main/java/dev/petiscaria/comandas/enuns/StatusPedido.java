package dev.petiscaria.comandas.enuns;

public enum StatusPedido {
    PENDENTE,   // Acabou de ser lançado pelo garçom
    PREPARANDO, // Cozinha/Bar aceitou e está fazendo
    PRONTO,     // Pronto para o garçom retirar
    ENTREGUE,   // Chegou na mesa do cliente
    CANCELADO   // Estornado ou cancelado
}