

# Auditoria e Limpeza de Codigo -- Relatorio de Diagnostico

## Resumo Executivo

Auditoria completa do projeto React/TypeScript (HYPR Tracking). Encontrados **18 problemas** organizados por categoria. Nenhum risco a funcionalidade existente.

---

## 1. Codigo Morto

### 1.1 Arquivos inteiros nao utilizados

| Arquivo | Motivo |
|---|---|
| `src/utils/imageOptimization.ts` | Zero imports em todo o projeto. Nenhum componente usa `generateSrcSet`, `createImageLoader` ou `getOptimalImageSize`. |
| `src/utils/performance.ts` | Zero imports em todo o projeto. `getCachedData`, `setCachedData`, `fastClick`, `debounce`, `throttle`, `deepMemo`, `RequestBatcher`, `PerformanceMonitor` -- nada e usado. |
| `src/components/LazyImage.tsx` | Zero imports fora do proprio arquivo. Nunca renderizado. |

### 1.2 Funcoes/variaveis mortas dentro de arquivos usados

| Arquivo | Item morto |
|---|---|
| `src/pages/CriativoDetails.tsx` | `classifyEventByTagType()` (linhas 30-52) -- definida mas nunca chamada. |
| `src/hooks/useCampaigns.tsx` | `fetchCampaigns` -- exportado mas nunca consumido por nenhuma pagina ou componente. O `refetch` do TanStack Query ja e chamado internamente. |
| `src/hooks/useCampaignGroups.tsx` | `fetchCampaignGroups` -- idem, nunca consumido externamente. |
| `src/hooks/useInsertionOrders.tsx` | `fetchInsertionOrders` -- idem. |
| `src/pages/Criativos.tsx` | `handleCriativoCreated` (linha 275) -- callback vazio com `useCallback` e array de deps vazio. Existe apenas como prop mas nao faz nada. |

### 1.3 Imports nao utilizados

| Arquivo | Import morto |
|---|---|
| `src/pages/Criativos.tsx` | `import React from "react"` (linha 29) -- React nao precisa ser importado com JSX transform. |
| `src/pages/Campanhas.tsx` | `import React from "react"` (linha 20) -- idem. |
| `src/pages/InsertionOrders.tsx` | `import React from "react"` (linha 21) -- idem. |
| `src/pages/Criativos.tsx` | `Label` importado de `@/components/ui/label` -- usado apenas dentro do `contextBar` que ja e condicional, porem na verdade e usado. (confirmar) |

---

## 2. Redundancias

### 2.1 DateRangePicker duplicado

`Criativos.tsx` define um componente local `DateRangePicker` (linhas 281-317) que reimplementa a logica do componente compartilhado `src/components/DateRangePicker.tsx` (ja usado em `Reports.tsx`). O local e mais simples mas cria duplicacao.

### 2.2 Padrao fetch wrapper redundante

Os 3 hooks (`useCampaigns`, `useCampaignGroups`, `useInsertionOrders`) exportam funcoes `fetchX = useCallback(() => refetch(), [refetch])` que sao wrappers 1:1 do `refetch` do TanStack Query. Nunca consumidas externamente. Podem ser removidas.

### 2.3 `useCampaigns.createTag` depende de `campaigns` e `fetchCampaigns`

O `useCallback` de `createTag` lista `[user, campaigns, fetchCampaigns]` nas deps, mas `fetchCampaigns` nunca e chamado dentro da funcao. E `campaigns` so e usado para lookup de nome (poderia ser feito de outra forma). Nao e critico mas e deps desnecessaria.

---

## 3. Problemas de Organizacao

### 3.1 `CriativoDetails.tsx` -- 814 linhas, monolito

Uma unica pagina com:
- Funcoes utilitarias (`formatDate`, `calculateCTR`, `classifyEventByTagType`)
- Logica de fetch de metricas realtime
- Logica de fetch de metricas diarias
- Geracao de pixel URLs
- Logica de export CSV
- UI completa com tags, metricas, tabelas

**Sugestao**: Extrair funcoes utilitarias e logica de fetch para hooks dedicados. Nao mexer agora (risco).

### 3.2 `Criativos.tsx` -- 614 linhas

Similar ao acima: filtros, metricas, paginacao, estado local complexo com 8+ `useState`. Funcional mas denso.

### 3.3 `Reports.tsx` -- 1071 linhas

O maior arquivo do projeto. Mesma situacao.

**Nota**: Nao recomendo refatorar esses arquivos nesta etapa. Sinalizado para consciencia.

---

## 4. Oportunidades de Performance

### 4.1 `CriativoDetails.tsx` -- polling de 30s para realtime stats

Linha 225: `setInterval(loadRealtimeStats, 30000)` faz queries ao banco a cada 30s, mesmo quando o usuario nao esta interagindo. Isso contradiz a decisao recente de "so recarregar quando o usuario pedir". Considerar remover o interval e manter apenas o botao "Recarregar".

### 4.2 `CriativoDetails.tsx` -- query direta na tabela `events`

Linhas 156-161: Faz `SELECT id FROM events WHERE tag_id IN (...) AND created_at >= ...` direto na tabela de 32M+ linhas para checar atividade recente. Isso ja e coberto pelo campo `last_hour` do `get_campaign_counters`. Redundante e potencialmente lento.

### 4.3 `main.tsx` -- staleTime global de 5 min conflita com hooks

O QueryClient global define `staleTime: 5 * 60 * 1000`, mas todos os hooks individualmente definem `staleTime: 10 * 60 * 1000`. O global e ignorado (override local ganha), porem cria confusao.

---

## 5. Acessibilidade

### 5.1 `CriativoDetails.tsx` -- nao usa `AppLayout`

Esta pagina reimplementa header/layout manualmente (linhas 368-414) em vez de usar `AppLayout` como todas as outras paginas. Resultado: estrutura de headings inconsistente, sem breadcrumbs padronizados no fluxo visual.

### 5.2 Botao de delete sem label acessivel

`CriativoDetails.tsx` linha 624: botao de lixeira tem `size="sm"` com apenas icone, sem `aria-label`. Leitores de tela nao conseguem identificar a acao.

---

## Plano de Execucao Proposto (apos aprovacao)

Dividido em niveis de risco:

**Risco zero (deletar codigo morto):**
1. Deletar `src/utils/imageOptimization.ts`
2. Deletar `src/utils/performance.ts`
3. Deletar `src/components/LazyImage.tsx`
4. Remover `classifyEventByTagType` de `CriativoDetails.tsx`
5. Remover `import React from "react"` de 3 arquivos
6. Remover wrappers `fetchX` dos 3 hooks (e suas refs nas deps de useCallback)

**Risco baixo (limpeza leve):**
7. Simplificar `handleCriativoCreated` (callback vazio)
8. Alinhar `staleTime` global do QueryClient com valor real (10 min)
9. Adicionar `aria-label="Deletar tag"` no botao de delete

**Risco medio (sinalizado, nao mexer sem aprovacao explicita):**
10. Remover polling de 30s do realtime stats
11. Remover query direta a tabela `events` em `CriativoDetails.tsx` (usar `last_hour` ja disponivel)
12. Substituir `DateRangePicker` local em Criativos pelo componente compartilhado

**Arquivos modificados:**
- `src/utils/imageOptimization.ts` (deletar)
- `src/utils/performance.ts` (deletar)
- `src/components/LazyImage.tsx` (deletar)
- `src/pages/CriativoDetails.tsx` (remover funcao morta, aria-label)
- `src/pages/Criativos.tsx` (remover import React, simplificar callback)
- `src/pages/Campanhas.tsx` (remover import React)
- `src/pages/InsertionOrders.tsx` (remover import React)
- `src/hooks/useCampaigns.tsx` (remover fetchCampaigns wrapper)
- `src/hooks/useCampaignGroups.tsx` (remover fetchCampaignGroups wrapper)
- `src/hooks/useInsertionOrders.tsx` (remover fetchInsertionOrders wrapper)
- `src/main.tsx` (alinhar staleTime global)

