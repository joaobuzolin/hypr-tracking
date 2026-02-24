

# Plano: Corrigir Dados Zerados na Pagina de Criativos

## Diagnostico

O problema e claro e confirmado com dados reais:

A funcao `get_campaign_counters` (usada pela pagina de Criativos para exibir metricas) le EXCLUSIVAMENTE da view materializada `campaign_metrics_summary`. Essa view esta **incompleta e desatualizada** -- contem apenas 83 campanhas, enquanto a `campaign_metrics_daily` tem dados reais para as campanhas do Boticario.

Dados reais confirmados:

```text
campaign_metrics_summary (usada pelo sistema): 0 linhas para Boticario
campaign_metrics_daily (nao usada):             158k+ CTA clicks, 28k+ PIN clicks
events table (fonte real):                      191k+ eventos para Boticario
```

O refresh da `campaign_metrics_summary` provavelmente esta falhando porque ela escaneia a tabela `events` inteira (50M+ linhas) em uma unica query com JOINs pesados.

## Solucao

### Alterar `get_campaign_counters` para usar `campaign_metrics_daily`

Em vez de depender da `campaign_metrics_summary` (que falha ao atualizar), a funcao passara a agregar dados da `campaign_metrics_daily`, que ja esta sendo atualizada com sucesso pelo cron Job 6.

A alteracao sera feita via migration SQL:

```text
CREATE OR REPLACE FUNCTION get_campaign_counters(campaign_ids uuid[])
RETURNS TABLE(
  campaign_id uuid,
  page_views bigint,
  cta_clicks bigint,
  pin_clicks bigint,
  total_7d bigint,
  last_hour bigint
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    uid as campaign_id,
    COALESCE(agg.page_views, 0::bigint),
    COALESCE(agg.cta_clicks, 0::bigint),
    COALESCE(agg.pin_clicks, 0::bigint),
    COALESCE(agg.total_7d, 0::bigint),
    0::bigint as last_hour  -- daily granularity cant track hourly
  FROM unnest(campaign_ids) AS uid
  LEFT JOIN (
    SELECT
      cmd.campaign_id,
      SUM(cmd.page_views)::bigint as page_views,
      SUM(cmd.cta_clicks)::bigint as cta_clicks,
      SUM(cmd.pin_clicks)::bigint as pin_clicks,
      SUM(CASE WHEN cmd.metric_date >= CURRENT_DATE - INTERVAL '7 days'
          THEN cmd.page_views + cmd.cta_clicks + cmd.pin_clicks ELSE 0 END)::bigint as total_7d
    FROM campaign_metrics_daily cmd
    WHERE cmd.campaign_id = ANY(campaign_ids)
    GROUP BY cmd.campaign_id
  ) agg ON agg.campaign_id = uid
  WHERE (auth.uid() IS NOT NULL);
END;
$$;
```

### O que muda

- **Fonte de dados**: `campaign_metrics_summary` -> `campaign_metrics_daily` (que esta atualizada e funcionando)
- **last_hour**: Sera sempre 0 pois a daily nao tem granularidade horaria. O status "ativo/inativo" baseado em last_hour ficara sempre "inativo" mas isso ja acontecia antes (a summary tambem estava zerada)
- **Performance**: A query agrega da `campaign_metrics_daily` que e indexada por campaign_id -- rapida e eficiente
- **Nenhuma mudanca no frontend**: A funcao mantem a mesma assinatura, entao toda a UI continua funcionando sem alteracoes

### Impacto no derivedStatus

Como `last_hour` sera sempre 0, o status derivado das campanhas sera baseado nas datas (start_date/end_date) em vez de atividade recente. Campanhas dentro do periodo valido mostrarao "paused" em vez de "active", o que ja era o comportamento atual com a summary quebrada.

### Arquivos modificados

1. `supabase/migrations/` -- Nova migration para recriar a funcao `get_campaign_counters`

### Resultado esperado

- Dados do Boticario aparecerao corretamente (158k+ CTA clicks, 28k+ PIN clicks, etc.)
- Todas as outras campanhas tambem mostrarao dados reais da MV daily
- Sem risco de timeout pois nao toca a tabela events diretamente
- Sistema confiavel pois depende da MV que esta sendo atualizada pelo cron funcionando (Job 6)

