# 🏗️ Arquitetura Modal-First - Diagrama Visual

## 📐 Hierarquia de Componentes

```
App.tsx
├── BrowserRouter
├── Routes
│   ├── AppLayout
│   │   ├── Header/Sidebar
│   │   └── Outlet
│   │       ├── MesasPage
│   │       ├── CardapioPage
│   │       ├── ComandaPage
│   │       └── AdminPage            ← Sistema de Abas
│   │           ├── Tab: Produtos
│   │           └── Tab: Caixa
│   └── AtendimentoPage              ← Grid de Mesas
│       └── MesaModal (Portal)       ← MODAL CENTRAL
│           ├── View: Detalhes
│           ├── View: Cardápio
│           └── AddItemModal (Portal)← Sub-modal
│
└── Toaster                           ← Notificações globais
    └── Toast instances
```

---

## 🔄 Fluxo de Estado (Zustand + React)

```
┌─────────────────────────────────────────────┐
│          useCartStore (Zustand)             │
├─────────────────────────────────────────────┤
│                                             │
│  mesaId: number | null                      │
│  comandaId: number | null                   │
│  items: CartItem[]                          │
│                                             │
│  Actions:                                   │
│  • setMesa(mesaId, comandaId)               │
│  • addItem(produto, qty, meia, obs)         │
│  • removeItem(cartId)                       │
│  • updateQuantity(cartId, delta)            │
│  • clearCart()                              │
│                                             │
│  Getters:                                   │
│  • getTotal()                               │
│  • getItemCount()                           │
│                                             │
│  Storage: localStorage                      │
│  Key: 'petiscaria-cart-storage'             │
│                                             │
└─────────────────────────────────────────────┘
     ▲                                     ▼
     │                                     │
MesaModal (Read/Write)              AddItemModal (Write)
AtendimentoPage (Read)              CartDrawer (Write)
```

---

## 🎯 Ciclo de Vida do Atendimento

```
START
  │
  ▼
┌──────────────────────────────────┐
│   AtendimentoPage                │
│   Grid de Mesas (1-20)           │
│                                  │
│   Cards das mesas:               │
│   • Ocupada (amber) / Livre       │
│   • Valor total                  │
│   • Click → abre MesaModal       │
└──────────────────────────────────┘
  │
  ├─ Mesa Vazia?
  │  │
  │  ▼
  │  ┌──────────────────────────────────┐
  │  │  MesaModal → View: Detalhes      │
  │  │  "Deseja abrir esta mesa?"       │
  │  │  [Botão: Abrir Mesa]             │
  │  └──────────────────────────────────┘
  │  │ Click "Abrir Mesa"
  │  │ POST /api/comandas/abrir/{mesaId}
  │  ▼
  │  ┌──────────────────────────────────┐
  │  │  MesaModal → View: Cardápio      │
  │  │  Busca + Lista de Produtos       │
  │  │  [+ Adicionar Itens]             │
  │  └──────────────────────────────────┘
  │
  ├─ Mesa Ocupada?
  │  │
  │  ▼
  │  ┌──────────────────────────────────┐
  │  │  MesaModal → View: Detalhes      │
  │  │  Histórico de Itens              │
  │  │  Total Acumulado                 │
  │  │  [Botão: Adicionar Itens]        │
  │  └──────────────────────────────────┘
  │
  └─ Garçom seleciona produto
     │
     ▼
     ┌──────────────────────────────────┐
     │  Clica + no card do produto      │
     │                                  │
     ▼                                  │
     ┌──────────────────────────────────┐
     │  AddItemModal (sobreposto)       │
     │  • Quantidade (+/-)              │
     │  • Meia Porção (toggle)          │
     │  • Observação (textarea)         │
     │  • Preview de total              │
     │  [Botão: Adicionar]              │
     └──────────────────────────────────┘
     │ Click "Adicionar"
     │ useCartStore.addItem(...)
     │ localStorage persiste
     ▼
     CartItem + Toast
     │
     │ (Repete para cada produto)
     │
     ▼
     ┌──────────────────────────────────┐
     │  Carrinho Flutuante              │
     │  "3 itens | R$ 45,00"            │
     │  [CONFIRMAR]                     │
     └──────────────────────────────────┘
     │ Click "CONFIRMAR"
     │ Loop: POST /api/comandas/{id}/itens
     │ useCartStore.clearCart()
     ▼
     Toast "12 item(ns) adicionado(s)!"
     View volta para "Detalhes"
     Histórico atualizado
     │
     ├─ Adicionar mais? → volta ao Cardápio
     │
     └─ Admin fecha comanda?
        │
        ▼
        AdminPage → Aba "Caixa"
        PATCH /api/comandas/{id}/fechar
        │
        ▼
        Mesa volta para "Livre" em AtendimentoPage
        │
        ▼
        END
```

---

## 🎬 Transições Animadas

### 1. Cards de Mesa (Cascata)
```
Timeline:
0ms    50ms    100ms    150ms    200ms   250ms
│      │       │        │        │       │
▼      ▼       ▼        ▼        ▼       ▼
Mesa1  Mesa2   Mesa3    Mesa4    Mesa5   Mesa6
(fade-in + slide-down em sequência)
```

### 2. MesaModal (View Switch)
```
View: Detalhes               View: Cardápio
(visible)                    (hidden)
│                            │
└─ x: -20, opacity: 0◄──┘
   transition: 200ms
             ┌──► x: 0, opacity: 1 (saída)
             │
             │ (AnimatePresence mode="wait")
             │
             │ x: 20, opacity: 0 (entrada)
             └──► x: 0, opacity: 1 (visível)
```

### 3. Carrinho Flutuante
```
Items = 0                Items > 0
(hidden)                 (visible)
│                        │
└─ y: 20, opacity: 0◄────┘
   transition: spring
             ┌──► y: 0, opacity: 1 (sticky bottom)
```

### 4. AddItemModal (Backdrop Blur)
```
Abrir:               Fechar:
opacity: 0───►       opacity: 1───►
  1. Backdrop blur        1. Fade out
  2. Modal scale-up       2. Scale down
  (spring animation)      (spring animation)
```

---

## 📡 Fluxo de Dados (Data Flow)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  BACKEND (Spring Boot)                                  │
│  POST   /api/comandas/abrir/{mesaId}                    │
│  GET    /api/comandas/ativas                            │
│  GET    /api/comandas/{id}                              │
│  POST   /api/comandas/{id}/itens                        │
│  PATCH  /api/comandas/{id}/fechar                       │
│  GET    /api/produtos/cardapio                          │
│  PATCH  /api/produtos/{id}/estoque                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
         ▲  ▲  ▲  ▲  ▲                    ▲
         │  │  │  │  │                    │
         │  │  │  │  │                    └─ axios
    API │  │  │  │  │ responses
         │  │  │  │  └─────────────────────────────┐
         │  │  │  │                                 │
         │  │  │  └─ MesaModal                      ▼
         │  │  │     │ POST abrir                 TypeScript
         │  │  │     │ POST adicionar item        types/index.ts
         │  │  │     └─ PATCH fechar               │
         │  │  │                                   ├─ Comanda
         │  │  └─ AdminPage                        ├─ Produto
         │  │     │ PATCH toggle estoque           ├─ CartItem
         │  │     └─ GET produtos/todos            └─ MesaUI
         │  │
         │  └─ useProdutos() hook
         │     │ GET /api/produtos
         │     └─ Atualiza estado React
         │
         └─ useComandas() hook
            │ GET /api/comandas/ativas
            │ Poll a cada 30s
            └─ Atualiza estado React


LOCAL STATE (Zustand):

┌─────────────────────────────────────┐
│  useCartStore                       │
│  (localStorage: petiscaria-cart)    │
├─────────────────────────────────────┤
│  mesaId: 1                          │
│  comandaId: 42                      │
│  items: [                           │
│    {                                │
│      cartId: "uuid-xyz",            │
│      produto: { id: 5, ... },       │
│      quantidade: 2,                 │
│      meiaPorcao: true,              │
│      observacao: "Quente",          │
│      precoUnitarioFinal: 15.00      │
│    }                                │
│  ]                                  │
└─────────────────────────────────────┘
         ▲                       ▼
         │                       │
    Escrita            Leitura no
    de:                 render:
    • AddItemModal   • AddItemModal
    • CartDrawer     • MesaModal
    • ProductCard    • CartDrawer
```

---

## 🎨 Estrutura CSS (Tailwind)

```
┌─────────────────────────────────────────┐
│  Theme (tailwind.config.js)             │
├─────────────────────────────────────────┤
│                                         │
│  Colors:                                │
│  • coal-950 (bg base)                   │
│  • coal-900 (cards)                     │
│  • amber-500 (accent primary)           │
│  • jade-500 (accent secondary/success)  │
│  • ember-500 (accent warning)           │
│  • rose-500 (accent error)              │
│                                         │
│  Fonts:                                 │
│  • font-display: "Playfair Display"     │
│  • font-body: "DM Sans"                 │
│  • font-mono: "JetBrains Mono"          │
│                                         │
│  Shadows:                               │
│  • shadow-card: 0 4px 24px rgba(...)    │
│  • shadow-glow-amber: 0 0 30px rgba()   │
│                                         │
│  Custom Animation:                      │
│  • animate-pulse-slow (3s)              │
│  • animate-shimmer (1.5s)               │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Components (index.css @layer)          │
├─────────────────────────────────────────┤
│  .card             (card-hover also)    │
│  .btn-primary      (+ shadow-glow)      │
│  .btn-secondary                         │
│  .btn-danger       (rose color)         │
│  .btn-ghost                             │
│  .btn-icon                              │
│  .input            (focus: border-amb)  │
│  .badge            (badge-amber, etc)   │
│  .section-title                         │
│  .divider                               │
│  .skeleton         (shimmer effect)    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📊 Comparação: Antes vs Depois

### Antes (Sem Refatoração)

```
Navegação "tradicional":
┌─────────────────┐
│  MesasPage      │
│  (grid static)  │
└────────┬────────┘
         │ Click mesa
         ▼
    CardapioPage (nova página)
    └─ Descontextualização!
    
Cadastro de produtos:
┌──────────────────┐
│  AdminPage       │
│  (tudo misturado)|
└──────────────────┘
```

### Depois (Modal-First)

```
Contextualização total:
┌──────────────────────┐
│  AtendimentoPage     │
│  (grid)              │
│  └─ MesaModal        │
│     ├─ Detalhes      │
│     ├─ Cardápio      │
│     └─ AddItemModal  │
│        (sobreposto)  │
└──────────────────────┘

Admin com abas:
┌──────────────────────┐
│  AdminPage           │
│  ├─ Aba: Produtos    │
│  └─ Aba: Caixa       │
│     (transições      │
│      animadas)       │
└──────────────────────┘

✅ Melhor UX
✅ Menos contexto switching
✅ Mais fluido
✅ Garçom no "fluxo"
```

---

## 🔐 Validação de Dados

```typescript
// Input Validation (Frontend - antes de enviar)

Produto:
  ✓ nome: string (required)
  ✓ preco: number > 0
  ✓ categoria: enum
  ✓ permiteMeia: boolean
  ✓ disponivel: boolean

CartItem:
  ✓ quantidade: number > 0
  ✓ meiaPorcao: boolean
  ✓ precoUnitarioFinal = produto.preco * (meiaPorcao ? 0.6 : 1.0)
  ✓ observacao: string | empty (max 200 chars)

AdicionarItemRequest:
  ✓ produtoId: required (params)
  ✓ quantidade: required (body)
  ✓ meiaPorcao: required (body)
  ✓ observacao: optional (body)

// Output Validation (Backend - resposta)

Comanda:
  ✓ id: number
  ✓ mesaId: number (1-20)
  ✓ status: enum
  ✓ total: number >= 0
  ✓ itens: ItemPedido[]

ItemPedido:
  ✓ id: number
  ✓ nomeProduto: string
  ✓ quantidade: number
  ✓ precoUnitario: number
  ✓ statusPreparo: enum
  ✓ meiaPorcao: boolean
  ✓ observacao: optional string
```

---

## 🚀 Performance Optimization

```
┌────────────────────────────────────────────┐
│  Rendering Optimization                    │
├────────────────────────────────────────────┤
│                                            │
│  Code Splitting (Lazy routes):             │
│  • AdminPage → route lazy                  │
│  • CardapioPage → route lazy               │
│  • ComandaPage → route lazy                │
│                                            │
│  Memoization:                              │
│  • ProductCard (memo)                      │
│  • AddItemModal (heavy calc)               │
│                                            │
│  Virtualization:                           │
│  • Listas longas (futura: react-window)    │
│                                            │
│  Network:                                  │
│  • Zustand persist (offline-ready)         │
│  • useProdutos: polling 30s                │
│  • useComandas: polling 30s                │
│                                            │
│  Bundle:                                   │
│  • React: ~45KB gzip                       │
│  • Zustand: ~3KB gzip                      │
│  • Framer Motion: ~48KB gzip               │
│  • Lucide React: ~20KB gzip                │
│  • Tailwind CSS: ~6KB gzip                 │
│  ────────────────────────────────          │
│  • Total: ~120KB gzip                      │
│                                            │
└────────────────────────────────────────────┘
```

---

## 🔄 Integração com Backend

```
Frontend                    Backend (Java Spring Boot)
┌─────────────┐             ┌──────────────────────┐
│ React App   │◄────────────│ REST API             │
│             │─────────────│                      │
│ :5173       │ JSON        │ :8080/api            │
└─────────────┘             └──────────────────────┘
     │                               │
     │ POST /api/comandas/abrir      │
     │────────────────────────────►  │
     │                          ▼    │
     │                    ComandaController
     │                    └─ POST /abrir
     │                       ├─ criar Comanda
     │                       ├─ salvar DB
     │                       └─ return JSON
     │◄────────────────────────────  │
     │ {id, mesaId, status, ...}     │
     │                               │
     │ POST /api/comandas/{id}/itens │
     │────────────────────────────►  │
     │                          ▼    │
     │                    ItemPedidoController
     │                    └─ POST /itens
     │                       ├─ validar
     │                       ├─ calc preço
     │                       ├─ salvar DB
     │                       └─ return comanda
     │◄────────────────────────────  │
     │ {id, mesaId, total, itens}    │
     │                               │
     . . . (mais requisições) . . .  │
     │                               │
```

---

## 📦 Deploy Checklist

```
┌─────────────────────────────────────────┐
│  Pre-Deploy                             │
├─────────────────────────────────────────┤
│  ✓ npm run build (sem erros)            │
│  ✓ npm run build size <= 400KB          │
│  ✓ Testes manuais em staging            │
│  ✓ CORS habilitado no backend           │
│  ✓ Backend serving OK                   │
│  ✓ Database migrated                    │
│  ✓ Environment vars configuradas        │
│  ✓ Git branch: main/production          │
│  ✓ Code review completo                 │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Deploy                                 │
├─────────────────────────────────────────┤
│  1. $ npm run build                     │
│  2. Copiar dist/* para servidor         │
│  3. Restart nginx/apache                │
│  4. Test: curl http://prod:5173         │
│  5. Smoke test via browser              │
│  6. Monitor logs                        │
│                                         │
└─────────────────────────────────────────┘
```

---

**Diagrama criado com ❤️ para visualizar a arquitetura Modal-First**

