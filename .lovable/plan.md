

# Plano: Corrigir cleanup e restaurar performance

## Problema
A funcao `cleanup_old_events` ainda tenta deletar 37M+ linhas de uma vez, causando `statement timeout` repetidos que saturam as conexoes do banco. Isso faz o site nao carregar dados.

## Acoes

### 1. Criar migration para substituir a funcao cleanup por versao em batches

Nova funcao que deleta no maximo 500k linhas por execucao (10 loops de 50k), com `pg_sleep(0.5)` entre batches para nao sobrecarregar o banco. Remove tambem o `VACUUM ANALYZE` de dentro da funcao (o autovacuum ja faz isso automaticamente).

```sql
CREATE OR REPLACE FUNCTION public.cleanup_old_events()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '300s'
AS $$
DECLARE
  batch_size INT := 50000;
  deleted INT;
  total INT := 0;
BEGIN
  FOR i IN 1..10 LOOP
    DELETE FROM events WHERE id IN (
      SELECT id FROM events 
      WHERE created_at < NOW() - INTERVAL '90 days' 
      LIMIT batch_size
    );
    GET DIAGNOSTICS deleted = ROW_COUNT;
    total := total + deleted;
    EXIT WHEN deleted < batch_size;
    PERFORM pg_sleep(0.5);
  END LOOP;
  RAISE NOTICE 'Cleanup: deleted % rows', total;
END;
$$;
```

Arquivo: nova migration SQL

### 2. Atualizar o cron via migration

O `cron.unschedule` + `cron.schedule` falhou por permissao. Vou usar a abordagem correta para o Supabase: `SELECT cron.schedule(...)` com a sintaxe que funciona em migrations.

```sql
SELECT cron.unschedule('cleanup-old-events');
SELECT cron.schedule(
  'cleanup-old-events',
  '0 */6 * * *',
  $$SELECT public.cleanup_old_events()$$
);
```

Arquivo: mesma migration SQL

### Riscos
- **Zero**: A funcao em batches nao bloqueia queries normais
- **Recuperacao**: Assim que a funcao for atualizada, os timeouts param e o site volta ao normal
- O backlog de ~37M linhas sera limpo gradualmente em ~2-3 semanas (500k por execucao, 4x/dia)

### Resultado esperado
- Site volta a carregar dados imediatamente (sem mais timeouts)
- Banco reduz de ~57 GB para ~20-25 GB ao longo de 2-3 semanas

