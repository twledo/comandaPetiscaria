# 🧪 Guia de Testes da Refatoração Modal-First

## 🎯 Cenários de Teste

### Cenário 1: Novo Atendimento (Mesa Vazia)

**Passos:**
1. Acesse `http://localhost:5173` (página de Atendimento)
2. Clique no botão "Nova Mesa" no canto superior direito
3. MesaModal abre → "Mesa Disponível - Deseja iniciar atendimento?"
4. Clique "Abrir Mesa"
5. **Esperado:** Modal muda para View Cardápio automaticamente

**Verificar:**
- ✅ POST `/api/comandas/abrir/{mesaId}` foi chamado
- ✅ View "Cardápio" renderiza com produtos
- ✅ Campo de busca funciona em tempo real
- ✅ Scroll do carrinho flutuante é smooth

---

### Cenário 2: Adicionar Produto ao Carrinho

**Pré-requisitos:** Mesa aberta conforme Cenário 1

**Passos:**
1. Na View Cardápio, clique no botão `+` de um produto
2. AddItemModal abre sobreposto (blur no fundo)
3. Configure:
   - Quantidade: use os botões +/- para alterar
   - Meia Porção: toggle se o produto permitir
   - Observação: adicione um texto (ex: "Muito quente")
4. Clique "Adicionar"
5. **Esperado:** Modal fecha, item aparece no carrinho flutuante

**Verificar:**
- ✅ Preço da meia porção = 60% do original
- ✅ Total preview recalcula automaticamente
- ✅ Toast de sucesso aparece
- ✅ Carrinho mostra quantidade correta
- ✅ Se recarregar a página, carrinho persiste (localStorage)

---

### Cenário 3: Confirmar e Enviar Pedido

**Pré-requisitos:** Mesa com itens adicionados

**Passos:**
1. No carrinho flutuante, clique "CONFIRMAR"
2. Sistema faz POST para cada item:
   ```
   POST /api/comandas/{comandaId}/itens
   {
     "produtoId": 5,
     "quantidade": 2,
     "meiaPorcao": true,
     "observacao": "Muito quente"
   }
   ```
3. Após sucesso, carrinho limpa e View muda para "Detalhes"
4. **Esperado:** Histórico atualizado com novos itens

**Verificar:**
- ✅ Cada POST foi feito
- ✅ localStorage foi limpo (cart vazio)
- ✅ Lista de itens mostra as novas linhas
- ✅ Total foi recalculado
- ✅ Toast "12 item(ns) adicionado(s)!" aparece

---

### Cenário 4: Voltar a Mesa Já Aberta

**Pré-requisitos:** Mesa com pedidos já enviados

**Passos:**
1. Na AtendimentoPage, clique no card de uma mesa ocupada
2. MesaModal abre → View "Detalhes"
3. **Esperado:** Histórico de itens é exibido com status de preparo

**Verificar:**
- ✅ GET `/api/comandas/{id}` foi chamado
- ✅ Itens renderizam com status (PENDENTE, PREPARANDO, PRONTO)
- ✅ Total mostra valor acumulado
- ✅ Clique "Adicionar Itens" muda para cardápio
- ✅ Novo pedido enviado ACUMULA aos anteriores

---

### Cenário 5: Busca de Produtos

**Pré-requisitos:** View Cardápio aberta

**Passos:**
1. Digite na barra de busca: "agua"
2. **Esperado:** Lista filtra em tempo real, mostrando apenas "Água"
3. Limpe a busca
4. **Esperado:** Todos os produtos retornam
5. Digite "xyz"
6. **Esperado:** "Nenhum produto encontrado"

**Verificar:**
- ✅ Busca é case-insensitive
- ✅ Filtro inclui apenas produtos com `.disponivel = true`
- ✅ Atualiza instantaneamente enquanto digita

---

### Cenário 6: Toggle de Disponibilidade (Admin)

**Passos:**
1. Acesse `http://localhost:5173/admin`
2. Clique na aba "Produtos"
3. Busque um produto
4. Ao passar o mouse no card, aparece ícone de toggle
5. Clique no ícone de toggle
6. **Esperado:** PATCH `/api/produtos/{id}/estoque` é chamado
7. Ícone muda de cor (verde → cinza)

**Verificar:**
- ✅ Produto desaparece da View Cardápio do garçom
- ✅ Toast "Disponibilidade atualizada!" aparece
- ✅ Toggle volta ao abrir AdminPage novamente

---

### Cenário 7: Fechar Comanda (Caixa)

**Passos:**
1. Acesse `http://localhost:5173/admin`
2. Clique na aba "Caixa"
3. Veja lista de comandas abertas com totais
4. Clique "Receber" em uma comanda
5. **Esperado:** PATCH `/api/comandas/{id}/fechar` é chamado

**Verificar:**
- ✅ Comanda desaparece da lista
- ✅ "Total em Aberto" diminui
- ✅ Toast "Comanda fechada!" aparece
-  ✅ Na AtendimentoPage, mesa volta para "Livre"

---

### Cenário 8: Transição entre Abas (Admin)

**Passos:**
1. Acesse `/admin`
2. Clique "Produtos" → "Caixa" → "Produtos"
3. **Esperado:** Transição suave comAnimatePresence

**Verificar:**
- ✅ Conteúdo anterior desaparece com fade-out
- ✅ Novo conteúdo entra com fade-in
- ✅ Scroll position reseta
- ✅ Indicador de aba muda (underline animado)

---

### Cenário 9: Responsividade Mobile

**Setup:** Abrir DevTools → Modo responsivo (iPhone 14 Pro)

**Testes:**
1. **AtendimentoPage:**
   - ✅ Grid adapta para 1 coluna em mobile
   - ✅ Cards ficam legíveis
   - ✅ Botão "Nova Mesa" fica acessível

2. **MesaModal:**
   - ✅ Modal ocupa 100% da altura em mobile
   - ✅ Carrinho flutuante fica posicionado corretamente
   - ✅ Teclado não quebra o layout

3. **AddItemModal:**
   - ✅ Abre from bottom em mobile (sheet behavior)
   - ✅ Buttons são clicáveis (não muito pequenos)
   - ✅ Textarea é usável

---

### Cenário 10: Persistência do Carrinho

**Passos:**
1. Adicione gários itens ao carrinho (Cenário 2)
2. Abra DevTools → Applications → LocalStorage
3. Procure por chave `petiscaria-cart-storage`
4. **Esperado:** JSON com itens, mesaId, comandaId
5. Feche a aba/navegador
6. Reabra `http://localhost:5173`
7. Clique na mesma mesa
8. **Esperado:** Carrinho restaurado com os mesmos itens

**JSON Esperado:**
```json
{
  "state": {
    "items": [
      {
        "cartId": "uuid-xyz",
        "produto": { "id": 5, "nome": "Água", ... },
        "quantidade": 2,
        "meiaPorcao": true,
        "observacao": "Muito quente",
        "precoUnitarioFinal": 3.00
      }
    ],
    "mesaId": 1,
    "comandaId": 42
  }
}
```

---

## 🔍 Checklist de Validação

### Fluxos Críticos
- [ ] Novo atendimento funciona
- [ ] Adicionar item ao carrinho funciona
- [ ] Enviar pedido para backend funciona
- [ ] Busca de produtos funciona
- [ ] Toggle de disponibilidade funciona
- [ ] Fechar comanda funciona
- [ ] Transições de modal são suaves
- [ ] Persistência localStorage funciona

### Performance
- [ ] Build sem erros: `npm run build`
- [ ] Build size <= 400KB (JS)
- [ ] Sem memory leaks (DevTools)
- [ ] Modal abre em < 300ms
- [ ] Busca responde em < 100ms

### UX/Acessibilidade
- [ ] Espaçamento de buttons: >= 44px (thumb-friendly)
- [ ] Cores contrastam bem (WCAG AA)
- [ ] Teclado (Tab, Enter, Esc) funciona
- [ ] Focus states visíveis
- [ ] Toasts legíveis

### Integração com Backend
- [ ] CORS habilitado em `http://localhost:5173`
- [ ] Todos os endpoints respondem
- [ ] Erros de API exibem toasts
- [ ] Request/Response payloads estão corretos

---

## 🐛 Troubleshooting

### "Cannot find module AddItemModal"

**Solução:**
```bash
cd src/main/resources/static
npm run build
# Ou
npm run dev
```

TypeScript cache às vezes falha. Uma rebuild/restart dev server resolve.

---

### Modal não abre

**Checklist:**
1. Verifique se `mesa` não é `null`
2. Verifique console por erros de JS
3. Confirme que MesaModal está inserido no JSX pai
4. Verifique className de z-index (deve ser z-50 ou maior)

---

### Carrinho vazio depois de recarregar

**Possíveis causas:**
1. `clearCart()` foi chamado
2. `petiscaria-cart-storage` foi deletado do localStorage
3. Zustand persist middleware não está ativo

**Teste:**
```js
// Console do navegador
localStorage.getItem('petiscaria-cart-storage')
// Deve retornar JSON se houver itens
```

---

### Produtos não aparecem no cardápio

**Checklist:**
1. Backend retorna `status: true` para os produtos?
2. API endpoint `/api/produtos/cardapio` está correto no `produtosService`?
3. Produtos são filtrados por `p.disponivel`

**Debug:**
```js
// Console
const { produtos } = useProdutos();
console.log(produtos);
```

---

### Toast não aparece

**Verificações:**
1. Komponente `<Toaster />` está no `App.tsx`?
2. Toast é chamado com sintaxe correta:
   ```js
   const toast = useToast(s => s.push);
   toast('success', 'Mensagem');
   ```
3. Verificar z-index (Toaster: z-[100])

---

## 📊 Exemplo de Teste com cURL

### Abrir Mesa
```bash
curl -X POST http://localhost:8080/api/comandas/abrir/1
# Retorna:
# {
#   "id": 42,
#   "mesaId": 1,
#   "status": "ABERTA",
#   "total": 0,
#   "itens": []
# }
```

### Adicionar Item
```bash
curl -X POST http://localhost:8080/api/comandas/42/itens \
  -H "Content-Type: application/json" \
  -d '{
    "produtoId": 5,
    "quantidade": 2,
    "meiaPorcao": true,
    "observacao": "Muito quente"
  }'
```

### Fechar Comanda
```bash
curl -X PATCH http://localhost:8080/api/comandas/42/fechar
# Retorna comanda com status: "FECHADA"
```

---

## 🚀 Scripts de Teste Úteis

### Reset localStorage
```js
localStorage.removeItem('petiscaria-cart-storage');
location.reload();
```

### Listar todas as mesas
```js
const { mesas } = useMesas();
console.table(mesas);
```

### Debug Zustand
```js
const store = useCartStore.getState();
console.table(store);
console.log('Total:', store.getTotal());
```

---

## 📝 Relatório de Bugs/Issues

Ao encontrar algo errado, documente:

```markdown
**Bug:** [Descrição breve]
**Severidade:** [ ] Crítica [ ] Alta [ ] Média [ ] Baixa
**Passos para Reproduzir:**
1. ...
2. ...
3. ...
**Esperado:** ...
**Atual:** ...
**Evidência:** (screenshot/video)
```

---

**Teste sempre antes de fazer deploy! 🚀**

