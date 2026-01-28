

## Plano: Corrigir Dados Desatualizados no Relatório

### Problema Identificado

A **materialized view** `campaign_metrics_daily` está desatualizada:
- **View atual:** dados até 06/01/2026
- **Tabela events:** dados até 28/01/2026 (hoje) - mais de **800.000 eventos** de janeiro

Os dados de Panasonic de janeiro existem na tabela `events`:
| Data | Eventos |
|------|---------|
| 28/01/2026 | 10.294 |
| 27/01/2026 | 38.789 |
| 26/01/2026 | 43.644 |
| ... | ... |

### Solução: Refresh Manual da Materialized View

A edge function `refresh-metrics` está dando timeout porque há muitos dados. Você precisa executar o refresh manualmente no **Supabase SQL Editor**:

```sql
-- Aumenta o timeout para 5 minutos
SET statement_timeout = '300s';

-- Executa o refresh da view
SELECT refresh_campaign_metrics();
```

### Como Executar

1. Acesse o **Supabase Dashboard** → seu projeto
2. Vá em **SQL Editor** (menu lateral)
3. Cole e execute o SQL acima
4. Aguarde ~1-3 minutos para completar
5. Volte ao relatório e os dados de janeiro aparecerão

### Alternativa (se o refresh continuar falhando)

Se mesmo com 5 minutos de timeout ainda falhar, podemos criar uma **RPC híbrida** que:
1. Usa a materialized view para dados históricos (mais rápido)
2. Consulta a tabela `events` diretamente para dados recentes (últimos 7 dias)

Isso garantiria que dados recentes sempre apareçam, independente do refresh da view.

### Detalhes Técnicos

**Por que a view está desatualizada?**
- O refresh da materialized view não está configurado para rodar automaticamente via cron
- A edge function `refresh-metrics` dá timeout porque processa milhões de registros

**Solução de longo prazo:**
- Configurar um cron job no Supabase para executar o refresh diariamente às 3h da manhã
- Ou: implementar a RPC híbrida que não depende 100% da view atualizada
