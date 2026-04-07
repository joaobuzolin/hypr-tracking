

# Auditoria UX -- Friccao, Affordances e Feedback

## Prioridade 1 — Alto Impacto

### 1.1 Navegacao entre niveis e completamente flat — sem indicacao de hierarquia

**Problema**: O app tem 3 niveis hierarquicos (Insertion Orders → Campanhas → Criativos), mas o breadcrumb sempre mostra os mesmos 3 links estaticos independentemente de onde o usuario esta. Nao reflete o caminho real (ex: "IO X → Campanha Y → Criativos"). O usuario perde contexto de *qual* IO ou campanha esta vendo.

**Por que importa**: Usuarios que navegam para dentro de uma IO especifica e depois para seus criativos nao conseguem voltar ao nivel intermediario correto. O breadcrumb e decorativo, nao funcional.

**Correcao**: Breadcrumb dinamico que reflita o caminho real: `Insertion Orders / [Nome da IO] / Campanhas / [Nome da Campanha] / Criativos`. Usar os dados de `currentInsertionOrder` e `currentCampaignGroup` que ja existem no state.

### 1.2 Cards clicaveis sem affordance clara

**Problema**: `InsertionOrderCard` e `CampaignGroupCard` sao inteiramente clicaveis (`role="button"`, `cursor-pointer`), mas visualmente parecem cards estaticos. O unico indicador e `hover:shadow-lg`, que nao existe no mobile. Nao ha seta, chevron, ou qualquer elemento visual que diga "clique para ver mais".

**Por que importa**: Usuarios de mobile nunca veem o hover state. Mesmo no desktop, cards com dados densos (metricas, tags, badges) nao comunicam que sao navegaveis vs. informativos.

**Correcao**: Adicionar um chevron-right (`→`) sutil no canto do card, ou um link textual "Ver detalhes" no footer. Para mobile, considerar um affordance persistente como borda-left colorida ou icone de navegacao.

### 1.3 CriativoDetails — layout proprio quebra consistencia total

**Problema**: `CriativoDetails.tsx` reimplementa header, breadcrumb, e layout inteiro fora do `AppLayout`. O usuario ve um header diferente (com botao "Voltar" solto, sem logo), breadcrumb em posicao diferente, e espacamento distinto.

**Por que importa**: Quebra de consistencia e o problema UX #1 em ferramentas internas. O usuario perde a "ancora visual" do app. O botao "Voltar" aponta para `/criativos` generico, nao para a campanha de onde veio.

**Correcao**: Migrar `CriativoDetails` para usar `AppLayout` com `backButton` prop. O botao "Voltar" deve apontar para a rota de origem (campanha especifica), nao para a listagem generica.

### 1.4 Nenhum feedback de loading ao aplicar filtros

**Problema**: Nas 3 paginas de listagem, quando o usuario aplica filtros (busca, status, IO), o conteudo simplesmente muda sem transicao. Se a lista filtrada estiver vazia, aparece um empty state identico ao de "sem dados", so diferenciado por texto.

**Por que importa**: Sem feedback transitorio (skeleton, spinner, ou animacao), o usuario nao sabe se a acao funcionou ou se ha um bug. Para filtros que fazem RPC (date range em Criativos), nao ha indicacao de loading durante a consulta.

**Correcao**: Adicionar um estado de loading especifico para filtragem (distinto do loading inicial). Para o date range filter em Criativos, mostrar skeleton/spinner enquanto a RPC `get_campaigns_with_events_in_daterange` roda.

---

## Prioridade 2 — Medio Impacto

### 2.1 Botao "Nova Campanha" dentro de InsertionOrderCard confuso

**Problema**: Cada `InsertionOrderCard` tem um botao "Nova Campanha" no footer que navega para `/insertion-orders/:id/campanhas` — a mesma acao que clicar no card inteiro. O botao usa icone `MousePointer` (nao intuitivo para "criar"). O `e.stopPropagation()` previne o click do card, mas o destino e o mesmo.

**Por que importa**: O usuario clica no botao esperando criar algo diretamente, mas e levado para uma listagem. Acao ambigua.

**Correcao**: Ou (a) transformar o botao em "Ver Campanhas" com icone de chevron/seta, tornando a intencao clara; ou (b) fazer o botao abrir diretamente o dialog de criacao de campanha (se for a intencao real).

### 2.2 "Perfil (Em breve)" no UserMenu — feature anunciada sem entrega

**Problema**: O dropdown do usuario mostra "Perfil (Em breve)" como item desabilitado. Nao oferece nenhum valor e ocupa espaco visual.

**Por que importa**: Features "coming soon" em UI de producao transmitem a sensacao de produto inacabado. Para um publico design-focused, isso e especialmente notavel.

**Correcao**: Remover o item ate que a feature exista. Manter o menu com apenas "Sair" e o email do usuario.

### 2.3 Copy-to-clipboard em CampaignCard nao funciona como esperado

**Problema**: `CampaignCard` tem funcao `copyToClipboard` definida mas nunca chamada no template. Os codigos de tags sao exibidos mas nao ha affordance de copia. O `CardContent` tem `onClick={(e) => e.preventDefault()}` que provavelmente visava prevenir navegacao ao copiar, mas como nao ha botao de copia, so interfere com a interacao do card.

**Por que importa**: Usuarios veem codigos de tags e querem copia-los diretamente da listagem, mas precisam navegar para a pagina de detalhes.

**Correcao**: Ou (a) remover a funcao `copyToClipboard` e o `e.preventDefault()` morto; ou (b) adicionar botoes de copia ao lado dos codigos de tag no card.

### 2.4 Contexto de IO/Campanha se perde na navegacao

**Problema**: Ao navegar de `InsertionOrders → Campanhas`, o contexto funciona (filtra por IO). Mas ao clicar em "Relatórios" no header, o usuario perde todo contexto — nao ha como gerar relatorio filtrado pelo contexto atual.

**Por que importa**: O fluxo natural e "estou olhando as campanhas do cliente X → quero gerar um relatorio do cliente X". A quebra de contexto obriga o usuario a recomecar.

**Correcao**: Passar parametros de contexto (insertionOrderId, campaignGroupId) como query params ao navegar para Reports, e usa-los como filtros iniciais.

### 2.5 Metric cards nao sao interativos mas parecem ser

**Problema**: `MetricsCard` tem `hover:shadow-md` e `transition-shadow`, sugerindo interatividade. Mas nao sao clicaveis — nao navegam, nao filtram, nao expandem.

**Por que importa**: Affordance falsa. O usuario tenta clicar esperando drill-down e nada acontece.

**Correcao**: Ou (a) remover o hover effect para comunicar que sao informativos; ou (b) tornar clicaveis com filtro aplicado (ex: clicar em "Ativas: 5" aplica filtro status=active).

---

## Prioridade 3 — Baixo Impacto (polish)

### 3.1 Empty states genericos demais

Os empty states em todas as paginas usam icones genericos e texto padrao. Para um publico design-focused, poderiam ser mais uteis: mostrar passos ("1. Crie uma IO, 2. Adicione campanhas, 3. Crie criativos") em vez de apenas "Nenhum X criado ainda".

### 3.2 Acoes destrutivas sem protecao visual suficiente

O botao "Excluir" no `AlertDialog` de InsertionOrders usa `bg-destructive` (correto), mas o `DropdownMenuItem` de excluir no card usa apenas `text-destructive` sem icone de alerta. A hierarquia visual da acao destrutiva nao e suficiente dentro do dropdown.

### 3.3 Paginacao sem indicacao de total de itens

`PaginationControls` mostra paginas mas nao diz "Mostrando 1-20 de 45". O badge de contagem existe na listagem acima, mas fica desconectado visualmente da paginacao.

---

## Plano de Execucao (ordenado por impacto)

| # | Item | Arquivos | Risco |
|---|---|---|---|
| 1 | Breadcrumb dinamico com caminho real | `Breadcrumb.tsx`, todas as paginas que usam | Medio |
| 2 | Affordance visual em cards clicaveis (chevron/seta) | `InsertionOrderCard`, `CampaignGroupCard` | Baixo |
| 3 | Migrar CriativoDetails para AppLayout | `CriativoDetails.tsx` | Medio |
| 4 | Loading state para filtragem com date range | `Criativos.tsx` | Baixo |
| 5 | Corrigir botao "Nova Campanha" no IOCard | `InsertionOrderCard.tsx` | Baixo |
| 6 | Remover "Perfil (Em breve)" do UserMenu | `UserMenu.tsx` | Zero |
| 7 | Limpar copyToClipboard morto no CampaignCard | `CampaignCard.tsx` | Zero |
| 8 | Remover hover de MetricsCard (affordance falsa) | `MetricsCard.tsx` | Zero |
| 9 | Paginacao com "Mostrando X-Y de Z" | `PaginationControls.tsx` | Baixo |

