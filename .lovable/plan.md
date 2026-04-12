

# Plano: Cleanup do Banco de Dados

## Diagnostico Confirmado

- **37.3 milhoes de eventos** com mais de 90 dias precisam ser deletados
- O cron job `cleanup-old-events` esta **falhando diariamente** com `statement timeout` — ele tenta deletar tudo de uma vez e o timeout de 2 min nao e suficiente
- **32 GB em indices**, dos quais ~12 GB sao redundantes
- Total estimado a liberar: **~40-45 GB**

## Plano de Execucao

### 1. Substituir a funcao cleanup por uma versao em batches

A funcao atual faz `DELETE FROM events WHERE created_at < NOW() - INTERVAL '90 days'` de uma vez. Vamos substituir por uma versao que deleta em batches de 50.000 linhas por execucao, com loop interno e `statement_timeout` de 300s.

```sql
-- Nova funcao: deleta ate 500k linhas por execucao (10 batches de 50k)
-- Cada execucao do cron (diaria) vai gradualmente limpar o backlog
-- Em ~75 dias, os 37M de linhas extras serao removidos
```

Arquivo: migration SQL (nova funcao `cleanup_old_events`)

### 2. Dropar 5 indices redundantes

Indices a remover (libera ~12 GB imediatamente):

| Indice | Tamanho | Motivo |
|---|---|---|
| `idx_events_tag_id_created_at` | 5.0 GB | Coberto por `idx_events_tag_type_date` |
| `idx_events_tag_created_at` | 5.0 GB | Coberto por `idx_events_tag_type_date` |
| `idx_events_created_at` | 1.5 GB | Coberto por compostos |
| `idx_events_event_type` | 667 MB | Baixa seletividade, inutil |
| `idx_events_tag_id` | 510 MB | Coberto por compostos |

Arquivo: migration SQL (DROP INDEX CONCURRENTLY)

### 3. Aumentar frequencia do cron temporariamente

Mudar o cron de 1x/dia para **4x/dia** ate o backlog ser limpo (~2-3 semanas), depois voltar para 1x/dia.

Arquivo: SQL via insert tool (UPDATE cron.job)

### Riscos

- **Baixo**: DROP INDEX CONCURRENTLY nao bloqueia reads/writes
- **Baixo**: Batches de 50k nao impactam performance do app
- **Zero**: Nenhuma query do app usa os indices redundantes diretamente (todas usam `idx_events_tag_type_date` ou os indices parciais)
- **Nota**: O backlog de 37M linhas vai levar ~2-3 semanas para ser totalmente limpo com 4 execucoes/dia. O espaco em disco so sera efetivamente liberado pelo autovacuum (nao precisamos de VACUUM FULL)

### Resultado Esperado

- Curto prazo (imediato): -12 GB (indices removidos)
- Medio prazo (2-3 semanas): -25-30 GB adicionais (eventos antigos deletados + autovacuum)
- Final: banco de ~20-25 GB em vez de 72 GB

