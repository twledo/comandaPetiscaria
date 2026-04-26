# 🍺 Petiscaria Digital - Guia de Refatoração Modal-First

## 📋 Resumo Executivo

Este documento descreve a refatoração completa da interface frontend do Petiscaria Digital para um **padrão Modal-First**, onde:

- ✅ **Mesa e Comanda são a mesma entidade**
- ✅ **Nenhuma navegação de página** - tudo via Modais sobrepostos
- ✅ **Fluxo contextual** - garçom nunca sai do contexto de atendimento
- ✅ **UX Fluida** - Animações com Framer Motion em todas as transições
- ✅ **Estoque Local** - Zustand para carrinho temporário antes de enviar

---

## 🏗️ Arquitetura Refatorada

### 1. **AtendimentoPage.tsx** (Nova)
**Localização:** `src/components/cardapio/AtendimentoPage.tsx`

**Responsabilidade:** Dashboard principal com grid de mesas ativas.

**Features:**
- Grid responsivo de mesas (1 col móvel → 4 col desktop)
- Filtro toggle entre "Ativas" / "Todas" (incluindo vazias)
- Busca por número de mesa
- Cards animados com status (ocupada/livre) e totais
- Botão "Nova Mesa" para abrir modal de novo atendimento

**Estados:**
```typescript
- busca: string (filtro por número de mesa)
- selecionada: MesaUI | null (mesa clicada abre MesaModal)
- mostrarLivres: boolean (toggle filtro)
```

**Fluxo:**
```
┌─────────────────────────────┐
│   AtendimentoPage           │
│  (Grid de Mesas)           │
└────────────┬────────────────┘
             │ Click em mesa
             ▼
┌─────────────────────────────┐
│   MesaModal (Modal Central) │
│  - View 1: Detalhes        │
│  - View 2: Cardápio        │
└─────────────────────────────┘
```

---

### 2. **MesaModal.tsx** (Núcleo do Sistema)
**Localização:** `src/components/mesas/MesaModal.tsx`

**Responsabilidade:** Cérebro do atendimento com dois estados internos.

**Features:**
- **View "Detalhes"**
  - Exibe comanda completa (se mesa ocupada)
  - Lista histórico de itens já pedidos
  - Mostra total acumulado
  - Botão "Adicionar Itens" muda para view cardápio
  
- **View "Cardápio"**
  - Busca em tempo real de produtos
  - Lista produtos com filtro por disponibilidade
  - Clique em produto abre **AddItemModal**
  - Carrinho flutuante com total preview
  - Botão "Confirmar" envia todos os itens via API

**Estados Internos:**
```typescript
- view: 'detalhes' | 'cardapio' (muda via AnimatePresence)
- busca: string (filtro produto)
- selectedProd: Produto | null (abre AddItemModal)
- comanda: Comanda | null (carregada ao abrir mesa ocupada)
- carregandoCom: boolean (loading)
```

**Fluxo Completo:**
```
Mesa Vazia:
  "Abrir Mesa" → POST /api/comandas/abrir/{mesaId}
  ↓
  → Muda para View Cardápio
  ↓
  → Garçom adiciona itens
  ↓
  → POST /api/comandas/{id}/itens (para cada item)

Mesa Ocupada:
  → Carrega comanda completa
  ↓
  → Mostra histórico de itens
  ↓
  → Garçom pode "Adicionar Itens"
  ↓
  → Novo POST /api/comandas/{id}/itens (acumula)
```

**Integração com Zustand:**
```typescript
const { setMesa, items, clearCart, comandaId } = useCartStore();

// Quando mesa é selecionada:
setMesa(mesa.id, comanda.id);

// Quando item é confirmado em AddItemModal:
addItem(produto, quantidade, meiaPorcao, observacao);

// Quando confirmar pedido:
handleEnviarPedido() → POST /api/comandas/{id}/itens
↓
clearCart() → limpa Zustand
```

---

### 3. **AddItemModal.tsx** (Customização)
**Localização:** `src/components/mesas/AddItemModal.tsx`

**Responsabilidade:** Modal sobreposto para configurar item antes de adicionar.

**Features:**
- Input de quantidade (+/- buttons)
- Toggle "Meia Porção" (se produto permitir)
- Textarea de observação opcional
- Preview do total em tempo real
- **Cálculo automático:** 60% do valor para meia porção

**Fluxo:**
```
Garçom clica + em produto
  ↓
AddItemModal abre (sobreposto ao MesaModal)
  ↓
Configura: qty, meia porção, observação
  ↓
Clica "Adicionar"
  ↓
useCartStore.addItem() → adiciona ao estado local
  ↓
Toast de sucesso
  ↓
Modal fecha
  ↓
Renderiza no carrinho flutuante inferior do MesaModal
```

**Dados Armazenados no Zustand (CartItem):**
```typescript
{
  cartId: string (UUID único local)
  produto: Produto
  quantidade: number
  meiaPorcao: boolean
  observacao: string
  precoUnitarioFinal: number (produto.preco * 0.6 ou 100%)
}
```

---

### 4. **AdminPage.tsx** (Refatorado)
**Localização:** `src/pages/AdminPage.tsx`

**Renderização:** Abas toggleáveis com Framer Motion

**Aba 1: Produtos**
- Lista todos os produtos
- Busca em tempo real
- Botão para criar novo (Future: form modal)
- Toggle de disponibilidade (ON/OFF)
- Click para editar (Future: modal form)

**Aba 2: Caixa**
- Lista comandas abertas (status = 'ABERTA')
- Filtro por número de mesa
- Exibe total em aberto de todas as comandas
- Botão verde "Receber" → PATCH /api/comandas/{id}/fechar

**Transições Entre Abas:**
```typescript
<AnimatePresence mode="wait">
  {activeTab === 'produtos' ? (
    <motion.div key="produtos" ...>...</motion.div>
  ) : (
    <motion.div key="caixa" ...>...</motion.div>
  )}
</AnimatePresence>
```

---

## 📦 Tipos de Dados

### MesaUI (Interface expandida)
```typescript
export interface MesaUI {
  id: number;                 // Número da mesa (1-20)
  numero?: number;            // Alias para id
  ocupada: boolean;           // true se tem comanda aberta
  comandaId?: number | null;  // ID da comanda se ocupada
  valorTotal?: number;        // Total acumulado
  qtdItens?: number;         // Quantidade de itens pedidos
  comanda?: Comanda;         // Dados completos da comanda (lazy load)
}
```

### CartItem (Zustand)
```typescript
export interface CartItem {
  cartId: string;              // UUID para ID local
  produto: Produto;            // Referência ao produto
  quantidade: number;          // Ex: 2
  observacao: string;          // "Muito quente", "Sem cebola"
  meiaPorcao: boolean;         // true = 60% do preço
  precoUnitarioFinal: number;  // Calculado: meiaPorcao ? preço*0.6 : preço
}
```

---

## 🔄 Fluxos de Dados

### Fluxo 1: Novo Atendimento (Mesa Vazia)
```
1. Garçom clica "Novo Atendimento" em AtendimentoPage
   ↓
2. MesaModal abre com View "Detalhes"
   └─ mesa.ocupada = false
   └─ Exibe "Deseja iniciar atendimento?"
   ↓
3. Clica "Abrir Mesa"
   ↓
4. POST /api/comandas/abrir/{mesaId}
   ↓ (retorna nova Comanda com id)
   ↓
5. useCartStore.setMesa(mesa.id, comanda.id)
   ↓
6. MesaModal muda para View "Cardápio" automaticamente
   ↓
7. Garçom adiciona itens...
```

### Fluxo 2: Adicionar Item ao Carrinho
```
1. Garçom vê produto no cardápio
   ↓
2. Clica + no card do produto
   ↓
3. AddItemModal abre (sobreposto)
   ↓
4. Configura: quantidade, meia porção, observação
   ↓
5. Clica "Adicionar"
   ↓
6. useCartStore.addItem(produto, qty, meia, obs)
   └─ Cria CartItem com UUID
   └─ Calcula preço final
   └─ Persiste em localStorage
   ↓
7. CartItem renderiza no carrinho flutuante
   ↓
8. Toast de sucesso
```

### Fluxo 3: Confirmar Pedido (Enviar para Backend)
```
1. Garçom clica "CONFIRMAR" no carrinho flutuante
   ↓
2. handleEnviarPedido() é dispara
   ↓
3. Para cada CartItem:
   POST /api/comandas/{comandaId}/itens
   {
     produtoId: number
     quantidade: number
     meiaPorcao: boolean
     observacao: string
   }
   ↓
4. Após todos os POSTs:
   ↓
5. useCartStore.clearCart()
   └─ items = []
   └─ mesaId = null
   └─ comandaId = null
   ↓
6. Recarrega comanda completa (GET /api/comandas/{id})
   ↓
7. View volta para "Detalhes"
   ↓
8. Exibe novo total e histórico atualizado
```

### Fluxo 4: Fechar Comanda (Caixa)
```
1. Admin acessa AdminPage → Aba "Caixa"
   ↓
2. Vê lista de comandas abertas com totais
   ↓
3. Clica "Receber" em uma comanda
   ↓
4. PATCH /api/comandas/{id}/fechar
   ↓ (backend muda status para FECHADA)
   ↓
5. Comanda desaparece da lista
   ↓
6. Total em aberto recalcula
```

---

## 🎨 Componentes de UI Reutilizáveis

### Modal Base
```typescript
<Modal
  open={boolean}
  onClose={() => {}}
  title="Título"
  size="sm" | "md" | "lg"  // responsive
>
  {children}
</Modal>
```

### PageHeader
```typescript
<PageHeader
  title="Atendimento"
  subtitle="12 mesas ativas"
  actions={<button onClick={...}>Novo</button>}
/>
```

### Toaster (Sistema de notificações)
```typescript
const toast = useToast(s => s.push);
toast('success', 'Pedido enviado!');
toast('error', 'Erro ao carregar');
toast('info', 'Operação concluída');
```

---

## 🎬 Animações (Framer Motion)

### Cards de Mesa (Cascata)
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: idx * 0.05 }} // Cascata
/>
```

### Transição entre Views do Modal
```typescript
<AnimatePresence mode="wait">
  {view === 'detalhes' ? (
    <motion.div key="detalhes" exit={{ opacity: 0, x: -20 }}>
      {/* Detalhes */}
    </motion.div>
  ) : (
    <motion.div key="cardapio" exit={{ opacity: 0, x: 20 }}>
      {/* Cardápio */}
    </motion.div>
  )}
</AnimatePresence>
```

### Carrinho Flutuante
```typescript
<AnimatePresence>
  {items.length > 0 && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="... sticky bottom-0"
    />
  )}
</AnimatePresence>
```

---

## 🔌 Endpoints Utilizados

### Comandas
```
POST   /api/comandas/abrir/{mesaId}          → Abre nova comanda
GET    /api/comandas/ativas                  → Lista abertas
GET    /api/comandas/{id}                    → Busca uma comanda
POST   /api/comandas/{id}/itens              → Adiciona item
DELETE /api/comandas/{id}/itens/{itemId}     → Remove item
PATCH  /api/comandas/{id}/fechar             → Fecha comanda
PUT    /api/comandas/{id}/enviar             → Enviar para cozinha
```

### Produtos
```
GET    /api/produtos/todos                   → Admin vê todos
GET    /api/produtos/cardapio                → Garçom (paginated)
POST   /api/produtos/cadastrar               → Criar
PATCH  /api/produtos/{id}/estoque            → Toggle disponibilidade
```

---

## 🚀 Como Usar

### Iniciar Novo Atendimento
```
1. Clique em "Nova Mesa" na AtendimentoPage
2. Modal abre → "Abrir Mesa"
3. Modal passa para View Cardápio automaticamente
4. Selecione produtos e configure quantidades
5. Clique "CONFIRMAR" para enviar
```

### Voltar a Uma Mesa Já Aberta
```
1. Na AtendimentoPage, clique no card da mesa
2. Modal abre → View "Detalhes"
3. Veja histórico de itens já pedidos e total
4. Clique "Adicionar Itens" para voltar ao cardápio
5. Configure novos itens e envie
```

### Gerenciar Disponibilidade (Admin)
```
1. Acesse AdminPage → Aba "Produtos"
2. Busque o produto
3. Clique no ícone de toggle ao lado
4. Produto marcado como indisponível deixa de aparecer no cardápio
```

### Fechar Comanda e Receber (Admin/Caixa)
```
1. Acesse AdminPage → Aba "Caixa"
2. Veja lista de comandas abertas
3. Clique "Receber" ao lado do total
4. Comanda é fechada e desaparece da lista
```

---

## 📊 Estrutura de Pastas

```
src/
├── components/
│   ├── cardapio/
│   │   └── AtendimentoPage.tsx      ← Nova
│   ├── mesas/
│   │   ├── MesaModal.tsx            ← Refatorado
│   │   ├── AddItemModal.tsx         ← Novo
│   │   └── MesaCard.tsx
│   ├── checkout/
│   │   └── CheckoutModal.tsx
│   ├── ui/
│   │   ├── Modal.tsx
│   │   ├── PageHeader.tsx
│   │   ├── Toaster.tsx
│   │   └── EmptyState.tsx
│   └── layout/
│       └── AppLayout.tsx
├── context/
│   └── cartStore.ts                 ← Zustand para carrinho
├── hooks/
│   ├── useMesas.ts
│   ├── useComandas.ts
│   └── useProdutos.ts
├── services/
│   ├── api.ts
│   ├── comandas.service.ts
│   └── produtos.service.ts
├── types/
│   └── index.ts
└── pages/
    ├── AdminPage.tsx                ← Refatorado com abas
    ├── MesasPage.tsx
    ├── ComandaPage.tsx
    └── CardapioPage.tsx
```

---

## ⚙️ Configuração do Build

```bash
# Terminal na pasta do frontend
cd src/main/resources/static

# Install deps
npm install

# Dev mode
npm run dev

# Build production
npm run build

# Preview build
npm run preview
```

---

## 🎯 Princípios de Design Implementados

✅ **Modal-First:** Nenhuma navegação entre páginas - tudo em modais sobrepostos
✅ **Responsivo:** Mobile-first, otimizado para tablets/celulares
✅ **Contextual:** Garçom nunca perde contexto da mesa que está atendendo
✅ **Fluido:** Animações suaves em TODAS as transições (Framer Motion)
✅ **Dark Mode:** Paleta coal/amber/jade para ambiente de trabalho
✅ **Intuitivo:** Carrinho flutuante, toasts, feedback visual imediato
✅ **Persistência:** Zustand com localStorage para não perder dados se recarregar

---

## 📝 Notas Importantes

- **Zustand persiste dados localmente** em `petiscaria-cart-storage`
- **Toasts auto-disappear** após 4 segundos
- **Modal fecha com ESC** ou clicando backdrop
- **CartItems têm UUID único** (não dependem do servidor)
- **Meia porção = 60%** do valor unitário (configurável no backend)
- **Busca é case-insensitive** e em tempo real
- **Compatível com navegadores modernos** (ES2020+)

---

## 🔮 Melhorias Futuras

- [ ] Form modal para adicionar novos produtos
- [ ] Integração com impressora das mesas
- [ ] Histórico de pedidos por garçom
- [ ] Sistema de autenticação
- [ ] Relatórios de vendas
- [ ] Integração com POS
- [ ] Notificações em tempo real (Websockets)

---

**Desenvolvido com ❤️ por Engenheiro Front-end Senior especializado em React + UX**

