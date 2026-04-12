

# Plano: Otimizacao Completa do Banco + Edge Function

## Diagnostico Final

O banco esta com **57 GB** e sobrecarregado por 4 causas raiz:

| Causa | Impacto | Tamanho |
|-------|---------|---------|
| **Trigger `refresh_metrics_on_event`** tenta refresh da materialized view em 0.1% dos inserts (~270 refreshes/dia de uma view de 70M linhas) | CRITICO - satura conexoes | - |
| **Cron `refresh-metrics-summary`** roda a cada 30min, full scan da tabela events | CRITICO - timeout constante | - |
| **`idx_events_type_created_at`** quase nao usado (40 scans) | 4.9 GB desperdicado | 4.9 GB |
| **Metadata bloated** - `original_url` redundante + `user_agent` verbatim | ~28 GB em dados inuteis | 28 GB |
| **37M+ linhas antigas** - cleanup nunca executou com sucesso | ~25 GB de lixo | 25 GB |
| **Trigger duplicado** `prevent_duplicate_page_views` - existe 2x na tabela | Overhead desnecessario | - |

## Acoes

### 1. Migration: Limpar infraestrutura morta e perigosa

```sql
-- A) Remover trigger que tenta refresh na materialized view a cada insert
DROP TRIGGER IF EXISTS refresh_metrics_on_event ON events;
DROP FUNCTION IF EXISTS public.trigger_refresh_campaign_metrics();

-- B) Desativar cron que faz full scan a cada 30 min
SELECT cron.unschedule('refresh-metrics-summary');

-- C) Dropar materialized view nao usada pelo frontend
DROP MATERIALIZED VIEW IF EXISTS campaign_metrics_summary;
DROP FUNCTION IF EXISTS public.refresh_campaign_metrics_summary();
DROP FUNCTION IF EXISTS public.refresh_campaign_metrics();

-- D) Dropar indice quase nao usado (4.9 GB, 40 scans)
DROP INDEX IF EXISTS idx_events_type_created_at;

-- E) Remover trigger duplicado (existe prevent_duplicate_page_views_trigger E trg_prevent_duplicate_page_views)
DROP TRIGGER IF EXISTS prevent_duplicate_page_views_trigger ON events;

-- F) Aumentar timeout do refresh daily (falhou com 60s)
CREATE OR REPLACE FUNCTION public.refresh_campaign_metrics_daily_incremental()
... SET statement_timeout TO '120s' ...
(mesmo corpo atual, so muda o timeout)
```

### 2. Atualizar edge function `track-event` para guardar menos dados

Mudancas no metadata:
- **Remover** `original_url` (redundante - tag_id ja identifica a tag)
- **Guardar apenas hostname** do referer (em vez da URL completa)
- **Filtrar placeholders** DV360 nao resolvidos (`{dclid}`, `{click_id}`)
- **Nao guardar** `user_agent` completo - guardar apenas classificacao (`bot`, `mobile`, `desktop`)

Reducao estimada: de ~260 bytes/evento para ~40 bytes/evento (85% menor)

### 3. Funcoes que referenciam a view dropada

As seguintes funcoes usam `campaign_metrics_summary` e precisam ser atualizadas ou removidas:
- `get_report_from_materialized_view` - usa `campaign_metrics_daily` (NAO a view), nome confuso mas funciona. **Manter sem alteracao.**

A funcao `trigger_refresh_campaign_metrics` referencia a view mas sera dropada no passo 1.

## O que NAO vamos mexer (seguranca)

- `events_pkey` - e a primary key, obrigatoria
- `idx_events_tag_type_date` (7.1 GB, 21M scans) - ESSENCIAL
- `idx_events_page_view_tag_date` (4.5 GB, 142M scans) - ESSENCIAL
- `idx_events_click_tag_date` e `idx_events_pin_click_tag_date` - usados pelo `get_campaign_counters`
- `trg_prevent_duplicate_page_views` - manter (remover apenas o duplicado)
- `trg_events_normalize` - manter
- `cleanup_old_events` e seu cron - ja foram corrigidos na migration anterior
- `refresh-metrics-daily` cron - funciona bem, so aumentar timeout

## Resultado esperado

- **Imediato**: Site volta a funcionar rapido (sem mais scans de 70M linhas a cada 30min)
- **Curto prazo**: -4.9 GB (indice removido)
- **Medio prazo (2-3 semanas)**: -25 GB (cleanup das linhas antigas + autovacuum)
- **Longo prazo**: Novos eventos 85% menores, banco cresce ~5x mais devagar

## Arquivos alterados

1. `supabase/migrations/[timestamp]_optimize_events_infra.sql` - Migration com todas as mudancas de schema
2. `supabase/functions/track-event/index.ts` - Metadata otimizado

