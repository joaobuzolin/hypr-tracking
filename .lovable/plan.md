

# Plano: Reducao Drastica do Banco de 52 GB para ~3-5 GB

## A Descoberta Chave

A tabela `campaign_metrics_daily` ja tem **todos os dados historicos agregados** -- 34 milhoes de eventos resumidos em apenas **2,056 linhas (440 KB)**. Toda funcao do frontend (contadores, relatorios, graficos) usa essa tabela, NAO a `events`.

A tabela `events` (52 GB) e um **log descartavel**. Ela so e consultada para:
1. Contagem da "ultima hora" (`get_campaign_counters` -> last_hour)
2. Breakdown por tag nos relatorios (quando usuario clica em detalhes)
3. Trigger de deduplicacao (janela de 5 segundos)

**Nenhuma dessas funcoes precisa de mais de 7 dias de dados brutos.**

## O Problema Real

Voce guarda 90 dias de dados brutos (~270k eventos/dia = ~24M linhas por 90 dias) quando so precisa de 7 dias (~1.9M linhas). Os dados historicos ja estao salvos na `campaign_metrics_daily`.

## Acao Proposta

### 1. Reduzir retencao de 90 dias para 7 dias

A funcao `cleanup_old_events` passa a deletar eventos com mais de 7 dias em vez de 90.

```sql
-- Antes: WHERE created_at < NOW() - INTERVAL '90 days'
-- Depois: WHERE created_at < NOW() - INTERVAL '7 days'
```

Isso e seguro porque:
- `campaign_metrics_daily` ja tem os totais diarios de TODAS as campanhas desde janeiro/2026
- O refresh incremental processa os ultimos 3 dias, entao 7 dias da margem de sobra
- Nenhuma query do frontend consulta `events` para dados com mais de 1 hora

### 2. Aumentar batch do cleanup para processar mais rapido

De 50k/batch com 10 iteracoes (500k max) para 100k/batch com 20 iteracoes (2M max), para limpar o backlog mais rapido.

### 3. Resultado esperado

| Metrica | Atual | Depois (2-3 semanas) |
|---------|-------|---------------------|
| Linhas em `events` | ~70M | ~1.9M |
| Tamanho `events` (dados) | ~37 GB | ~1.5 GB |
| Tamanho indices | ~14.7 GB | ~1.5 GB |
| **Total banco** | **52 GB** | **~3-5 GB** |

### 4. Para o futuro: crescimento controlado

Com retencao de 7 dias e ~270k eventos/dia, a tabela `events` se estabiliza em ~1.9M linhas permanentemente. O banco nunca mais passa de 5 GB.

## Seguranca

- **Dados historicos NAO se perdem** -- ja estao em `campaign_metrics_daily` (440 KB, desde janeiro)
- O refresh diario continua alimentando `campaign_metrics_daily` com os ultimos 3 dias
- Todas as funcoes do frontend (`get_campaign_counters`, `get_report_aggregated`, etc.) continuam funcionando identicamente
- A unica funcionalidade que muda: breakdown por tag em relatorios so mostra ultimos 7 dias (em vez de 90) -- mas isso ja e raro e lento hoje

## Arquivos alterados

1. `supabase/migrations/[timestamp]_reduce_retention_7_days.sql` -- Atualiza `cleanup_old_events` para 7 dias com batches maiores

