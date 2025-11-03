-- ============================================
-- OTIMIZAÇÃO: ÍNDICES ESTRATÉGICOS
-- ============================================

-- Índice para queries de relatórios (tag + data)
-- Acelera queries que filtram por tag_id e ordenam por data
CREATE INDEX IF NOT EXISTS idx_events_tag_created 
ON events(tag_id, created_at DESC);

-- Índice para filtros de data
-- Acelera queries que filtram apenas por created_at
CREATE INDEX IF NOT EXISTS idx_events_created_at 
ON events(created_at DESC);

-- Índice para tipo de evento
-- Acelera queries que filtram por event_type
CREATE INDEX IF NOT EXISTS idx_events_type 
ON events(event_type);

-- Índice composto para queries de agregação por tag e tipo
CREATE INDEX IF NOT EXISTS idx_events_tag_type_created
ON events(tag_id, event_type, created_at DESC);

-- ============================================
-- OTIMIZAÇÃO: MATERIALIZED VIEWS
-- ============================================

-- Índices para campaign_metrics_daily
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_daily_date 
ON campaign_metrics_daily(metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_daily_campaign 
ON campaign_metrics_daily(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_daily_campaign_date 
ON campaign_metrics_daily(campaign_id, metric_date DESC);

-- Índices para campaign_metrics_summary
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_summary_campaign 
ON campaign_metrics_summary(campaign_id);

-- ============================================
-- POLÍTICA DE RETENÇÃO: 90 DIAS
-- ============================================

-- Função para limpar eventos com mais de 90 dias
CREATE OR REPLACE FUNCTION public.cleanup_old_events()
RETURNS void AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deletar eventos com mais de 90 dias
  DELETE FROM events 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da operação
  RAISE NOTICE 'Cleanup completed at %. Deleted % events older than 90 days.', NOW(), deleted_count;
  
  -- Executar VACUUM para liberar espaço (apenas se deletou algo)
  IF deleted_count > 0 THEN
    EXECUTE 'VACUUM ANALYZE events';
    RAISE NOTICE 'VACUUM ANALYZE executed on events table';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- AGENDAMENTO AUTOMÁTICO (CRON)
-- ============================================

-- Habilitar extensão pg_cron se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remover agendamento anterior se existir
SELECT cron.unschedule('cleanup-old-events') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-events'
);

-- Agendar limpeza automática para rodar todo dia às 3h da manhã (horário UTC)
-- Isso vai manter apenas os últimos 90 dias de eventos
SELECT cron.schedule(
  'cleanup-old-events',           -- Nome do job
  '0 3 * * *',                    -- Cron expression: 3h da manhã, todo dia
  'SELECT public.cleanup_old_events();'  -- Comando a executar
);

-- ============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON FUNCTION public.cleanup_old_events() IS 
'Deleta eventos com mais de 90 dias automaticamente. Executa VACUUM ANALYZE após a limpeza para liberar espaço em disco. Agendado para rodar diariamente às 3h da manhã via pg_cron.';

COMMENT ON INDEX idx_events_tag_created IS 
'Índice para acelerar queries de relatórios que filtram por tag_id e ordenam por created_at';

COMMENT ON INDEX idx_events_created_at IS 
'Índice para acelerar queries que filtram apenas por data de criação';

COMMENT ON INDEX idx_events_type IS 
'Índice para acelerar queries que filtram por tipo de evento (page_view, click, pin_click)';

COMMENT ON INDEX idx_events_tag_type_created IS 
'Índice composto para acelerar agregações por tag, tipo de evento e data';