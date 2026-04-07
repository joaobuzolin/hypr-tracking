

# Relatorio de Auditoria CSS/HTML

## 1. Cores Hardcoded (Tailwind vanilla em vez de variaveis CSS do design system)

O projeto define variaveis CSS para `--blue-500`, `--green-500`, `--purple-500`, `--orange-500` (com suporte a dark mode), mas **quase nenhum componente as usa**. Em vez disso, usam classes Tailwind vanilla (`bg-blue-50`, `text-green-600`) que **ignoram o dark mode** completamente.

| Arquivo | Classes hardcoded (exemplos) | Problema |
|---|---|---|
| `CriativoDetails.tsx` | `bg-blue-50`, `text-blue-600`, `bg-green-50`, `text-green-600`, `bg-purple-50`, `text-purple-600`, `bg-orange-50`, `text-orange-600` | 4 cards de metricas com cores vanilla. Quebra no dark mode. |
| `CriativoDetails.tsx` | `bg-blue-50 text-blue-700 border-blue-200`, `bg-green-50 text-green-700 border-green-200`, `bg-purple-50 text-purple-700 border-purple-200` | Badges de tipo de tag (duplicado 2x no mesmo arquivo) |
| `CriativoDetails.tsx` | `text-purple-600`, `text-blue-600`, `text-green-600` | Widget realtime stats - cores inline |
| `CriativoDetails.tsx` | `text-neutral-600` (4x) | Usa `text-neutral-600` em vez de `text-muted-foreground`. Inconsistente com o resto do app. |
| `CampaignGroupCard.tsx` | `bg-blue-50`, `text-blue-600`, `bg-purple-50`, `text-purple-600`, `bg-green-50`, `text-green-600` | 3 celulas de metricas com cores vanilla |
| `CampaignCard.tsx` | `bg-green-50 text-green-700 border-green-200`, `bg-yellow-50 text-yellow-700 border-yellow-200` | Badge "Ult. hora" |
| `CampaignCard.tsx` | `hover:text-blue-600` | Link hover color hardcoded |
| `Campanhas.tsx` | `bg-green-50 dark:bg-green-950`, `text-green-600 dark:text-green-400` | Unico local que tenta suportar dark mode, mas usa cores vanilla em vez das variaveis CSS |
| `InsertionOrders.tsx` | `text-green-600`, `text-blue-600` | MetricsCard iconColor |
| `Criativos.tsx` | `bg-orange-500/5`, `text-orange-500`, `bg-blue-500/5`, `text-blue-500`, `bg-purple-500/5`, `text-purple-500` | Usa variaveis do design system via Tailwind config (correto), mas inconsistente com outros arquivos |
| `Auth.tsx` | `bg-green-500/20`, `border-green-500/30`, `text-green-100` | Feedback de reset de senha |

**Total: ~90 ocorrencias de cores hardcoded espalhadas em 7 arquivos.**

---

## 2. Breakpoints Inconsistentes

O projeto usa breakpoints Tailwind (`sm`, `md`, `lg`, `xl`) mas de forma inconsistente entre paginas que fazem a mesma coisa:

| Padrao | Onde | Inconsistencia |
|---|---|---|
| Grid de metricas | `Criativos.tsx` | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6` |
| Grid de metricas | `Campanhas.tsx` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| Grid de metricas | `InsertionOrders.tsx` | `grid-cols-1 md:grid-cols-3` |
| Grid de metricas | `CriativoDetails.tsx` | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` |
| Input height | `Campanhas.tsx` | `h-9 md:h-10` (responsivo) |
| Input height | `InsertionOrders.tsx` | sem altura definida (default) |
| Spacing abaixo de cards | `Criativos.tsx` | `mb-6 md:mb-8` |
| Spacing abaixo de cards | `Campanhas.tsx` | `mb-4 md:mb-6` |
| Spacing abaixo de cards | `InsertionOrders.tsx` | `mb-6` (sem responsivo) |
| Card padding | `CampaignGroupCard.tsx` | `px-4 md:px-6 py-4 md:py-6` |
| Card padding | `InsertionOrderCard.tsx` | `px-4 md:px-6 py-4 md:py-6` (igual) |
| Card padding | `CampaignCard.tsx` | `px-3 md:px-4 py-3 md:py-4` (menor) |
| Metrica cell padding | `CampaignGroupCard.tsx` | `p-2 md:p-3` |
| Metrica cell padding | `InsertionOrderCard.tsx` | `p-1.5 md:p-2` |
| Metrica cell padding | `CampaignCard.tsx` | `p-2` (sem responsivo) |

---

## 3. Propriedades Duplicadas / Estilos Sobrescrevendo Sem Necessidade

### 3.1 Badge de tipo de tag (duplicado identico)
`CriativoDetails.tsx` linhas 505-510 e 573-578: **exato mesmo bloco** de classes condicionais para badges de tipo de tag. Deveria ser extraido para funcao ou componente.

### 3.2 Card base classes repetidas
Toda Card no projeto repete `border shadow-sm`. A propria Card ja tem `border` e `shadow-sm` no componente base (`card.tsx` linha 13: `"rounded-lg border bg-card text-card-foreground shadow-sm"`). Adicionar `border shadow-sm` de novo e redundante -- **nao causa dano visual** mas e codigo duplicado.

Arquivos afetados: `CriativoDetails.tsx` (6x), `Campanhas.tsx` (4x), `InsertionOrders.tsx` (3x), `Criativos.tsx` (2x).

### 3.3 `SelectContent` com `bg-background border shadow-md z-50`
Repetido em `Criativos.tsx` (5x), `Campanhas.tsx` (3x). Essas propriedades ja sao parte do estilo base do `SelectContent` (popover styling via Radix). `InsertionOrders.tsx` nao adiciona -- e funciona igual.

### 3.4 Header reimplementado em `CriativoDetails.tsx`
Linhas 341-385: Reimplementa o header sticky com `backdrop-blur-lg bg-background/95 backdrop-saturate-150`. O `AppLayout` faz o mesmo com `backdrop-blur-sm bg-background/95 backdrop-saturate-150`. Inconsistencia: `blur-lg` vs `blur-sm`.

---

## 4. Classes CSS Utilitarias Nao Utilizadas em `index.css`

| Classe | Usada? |
|---|---|
| `.gpu-accelerated` | Sim (1x, CampaignCard) |
| `.container-query` | Nao |
| `.text-fluid-xs/sm/base/lg/xl` | Nao |
| `.space-responsive` | Nao |
| `.touch-target` | Sim (3x, CampaignCard) |
| `.safe-top/bottom/left/right` | Nao |
| `.smooth-scroll` | Nao |
| `.focus-visible-ring` | Nao |
| `.section-surface` | Sim (7x, varios) |

**7 de 12 classes utilitarias custom nunca sao usadas.** Peso morto no CSS.

---

## 5. Resumo por Nivel de Risco

**Risco zero (limpeza CSS morto):**
1. Remover 7 classes utilitarias nao usadas de `index.css` (container-query, text-fluid-*, space-responsive, safe-*, smooth-scroll, focus-visible-ring)

**Risco baixo (padronizacao):**
2. Substituir `text-neutral-600` por `text-muted-foreground` em CriativoDetails (4 ocorrencias)
3. Remover `border shadow-sm` redundante de Cards que ja herdam do componente base (~15 ocorrencias)
4. Remover `bg-background border shadow-md z-50` redundante de SelectContent (~8 ocorrencias)
5. Extrair logica de badge de tipo de tag (click-button/pin/page-view) para funcao reutilizavel em CriativoDetails

**Risco medio (dark mode + consistencia):**
6. Substituir cores vanilla (`bg-blue-50`, `text-blue-600`) pelas variaveis do design system (`bg-blue-500/10`, `text-blue-500`) em CriativoDetails e CampaignGroupCard -- alinha com o padrao ja usado em Criativos.tsx
7. Padronizar breakpoints de grid de metricas entre as 4 paginas
8. Padronizar spacing (mb) entre secoes das 3 paginas de listagem

**Sinalizado (nao mexer sem aprovacao explicita):**
9. Migrar CriativoDetails para usar AppLayout (mudanca estrutural significativa)
10. Unificar blur do header (`blur-sm` vs `blur-lg`)

### Arquivos a modificar
- `src/index.css` (remover classes mortas)
- `src/pages/CriativoDetails.tsx` (cores, redundancias, badge helper)
- `src/components/CampaignGroupCard.tsx` (cores vanilla)
- `src/components/CampaignCard.tsx` (cores vanilla, border redundante)
- `src/components/InsertionOrderCard.tsx` (border redundante)
- `src/pages/Campanhas.tsx` (border redundante, SelectContent)
- `src/pages/InsertionOrders.tsx` (border redundante)
- `src/pages/Criativos.tsx` (border redundante, SelectContent)

