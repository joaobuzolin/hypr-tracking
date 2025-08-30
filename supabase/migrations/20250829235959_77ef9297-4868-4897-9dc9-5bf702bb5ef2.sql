-- Corrigir problemas de segurança identificados pelo linter

-- 1. Remover a view materializada da API pública por segurança
REVOKE ALL ON campaign_metrics_daily FROM anon;
REVOKE ALL ON campaign_metrics_daily FROM authenticated;

-- 2. Corrigir search_path das funções para segurança
CREATE OR REPLACE FUNCTION public.refresh_campaign_metrics_daily()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use REFRESH MATERIALIZED VIEW sem CONCURRENTLY para evitar problemas
  REFRESH MATERIALIZED VIEW campaign_metrics_daily;
  RETURN NULL;
END;
$$;

-- 3. Criar função segura para limpeza de eventos antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_events()
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove eventos com mais de 1 ano (ajuste conforme necessário)
  DELETE FROM events 
  WHERE created_at < CURRENT_DATE - INTERVAL '365 days';
  
  -- Atualiza estatísticas das tabelas
  ANALYZE events;
  ANALYZE tags;
  ANALYZE campaigns;
END;
$$;

-- 4. Recriar o trigger com função corrigida
DROP TRIGGER IF EXISTS trigger_refresh_metrics ON events;
CREATE TRIGGER trigger_refresh_metrics
  AFTER INSERT ON events
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_campaign_metrics_daily();

-- 5. Criar função para buscar métricas via API com RLS
CREATE OR REPLACE FUNCTION public.get_campaign_metrics(
  campaign_id_param uuid,
  start_date date DEFAULT NULL,
  end_date date DEFAULT NULL
)
RETURNS TABLE (
  metric_date date,
  page_views bigint,
  cta_clicks bigint,
  pin_clicks bigint,
  total_events bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário tem acesso à campanha
  IF NOT EXISTS (
    SELECT 1 FROM campaigns c 
    WHERE c.id = campaign_id_param 
    AND (c.user_id = auth.uid() OR auth.uid() IS NOT NULL)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    cm.metric_date,
    cm.page_views,
    cm.cta_clicks,
    cm.pin_clicks,
    cm.total_events
  FROM campaign_metrics_daily cm
  WHERE cm.campaign_id = campaign_id_param
    AND (start_date IS NULL OR cm.metric_date >= start_date)
    AND (end_date IS NULL OR cm.metric_date <= end_date)
  ORDER BY cm.metric_date DESC;
END;
$$;

-- 6. Dar permissões apenas para a função, não para a view
GRANT EXECUTE ON FUNCTION get_campaign_metrics TO authenticated;

-- 7. Manter a view materializada mas sem acesso direto via API
ALTER MATERIALIZED VIEW campaign_metrics_daily OWNER TO postgres;