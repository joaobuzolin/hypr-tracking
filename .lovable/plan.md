

# Plano: Sistema Robusto de Dados para Relatorios

## Diagnostico Raiz

A investigacao revelou **3 problemas criticos interligados** que causam os erros recorrentes:

### 1. Cron Job quebrado consumindo o banco (CRITICO)
O **Job 3** (antigo) esta rodando a cada **5 minutos** e **falhando sempre** com "statement timeout". Ele tenta atualizar DUAS materialized views em uma unica transacao, que nao cabe no timeout de 2 minutos do pg_cron. Isso consome conexoes do pool e gera contenção massiva no banco.

### 2. Jobs novos nunca executaram
Os jobs 5 e 6 (criados na sessao anterior para substituir o job 3) **nunca rodaram** -- provavelmente a migration falhou silenciosamente ou os IDs conflitaram com jobs existentes.

### 3. Fallback perigoso para tabela de 50M+ linhas
Quando a materialized view retorna vazio (por contenção do banco), o codigo faz fallback para `get_report_from_events` que escaneia a tabela `events` completa, causando timeout de 15s e o erro que voce ve na tela.

## Solucao Proposta

### Parte 1: Limpar infraestrutura de cron (Banco de Dados)

- **Remover Job 3** (cron quebrado rodando a cada 5 min)
- **Remover Job 4** (HTTP-based, redundante)
- **Recriar Jobs 5 e 6** com nomes unicos garantidos:
  - Job: `refresh-summary-v2` -- a cada 30 minutos, executa apenas `refresh_campaign_metrics_summary()`
  - Job: `refresh-daily-v2` -- a cada hora, executa apenas `refresh_campaign_metrics_daily()`

### Parte 2: Eliminar fallback perigoso (Frontend)

Modificar `src/hooks/useReportEvents.tsx`:

- **Remover completamente** o fallback para `get_report_from_events` (a funcao que escaneia 50M+ linhas)
- Se a materialized view retornar vazio, mostrar mensagem amigavel: "Dados sendo processados, tente novamente em alguns minutos"
- Remover a logica de deteccao de "MV stale" que forçava o fallback
- Adicionar **retry automatico** (1 tentativa apos 2s) antes de mostrar erro

### Parte 3: Resiliencia no frontend (useReportEvents.tsx)

- Migrar de `useState` + `useEffect` para `useQuery` do TanStack (mesmo padrao do resto do app)
- Beneficios:
  - Cache automatico (evita re-fetch desnecessario)
  - Retry automatico com backoff
  - Estado de loading/error consistente
  - `staleTime` de 5 minutos (dados nao mudam a cada segundo)
  - Deduplicacao de requests identicos

### Parte 4: Otimizacao do carregamento geral

- Adicionar `refetchOnWindowFocus: false` nos queries de Reports para evitar re-fetches desnecessarios
- Manter o limite de 30 campanhas por consulta

## Detalhes Tecnicos

### Migration SQL

```text
-- 1. Remover todos os cron jobs antigos
SELECT cron.unschedule(3);
SELECT cron.unschedule(4);
SELECT cron.unschedule(5);
SELECT cron.unschedule(6);

-- 2. Recriar com statement_timeout adequado
SELECT cron.schedule(
  'refresh-summary-v2',
  '*/30 * * * *',
  $$SET statement_timeout = '120s'; SELECT public.refresh_campaign_metrics_summary();$$
);

SELECT cron.schedule(
  'refresh-daily-v2',
  '0 * * * *',
  $$SET statement_timeout = '180s'; SELECT public.refresh_campaign_metrics_daily();$$
);
```

### Refatoracao de useReportEvents.tsx

```text
Antes (problematico):
  MV query → se vazio → fallback para events (50M rows) → timeout → erro

Depois (robusto):
  MV query → se vazio → mensagem "dados sendo processados"
  useQuery com retry automatico e cache de 5 min
```

### Arquivos modificados

1. `supabase/migrations/` -- Nova migration para limpar e recriar cron jobs
2. `src/hooks/useReportEvents.tsx` -- Refatorar para useQuery, remover fallback perigoso
3. `src/pages/Reports.tsx` -- Adaptar ao novo formato do hook (minimas mudancas)

## Resultado Esperado

- Os dados carregarao em menos de 2 segundos (leitura direta da materialized view)
- Sem mais timeouts: nenhuma query toca a tabela de 50M+ eventos
- MVs atualizadas a cada 30min/1h de forma confiavel
- Cache no frontend evita re-fetches desnecessarios
- Sistema auto-recuperavel com retry automatico

