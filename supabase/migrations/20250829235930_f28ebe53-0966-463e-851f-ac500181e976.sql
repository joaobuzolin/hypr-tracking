-- Criar índices para melhorar performance em consultas frequentes
-- Índice para busca por tag_id e data (consultas de métricas)
CREATE INDEX IF NOT EXISTS idx_events_tag_id_created_at 
ON events (tag_id, created_at DESC);

-- Índice para busca por campaign via tags
CREATE INDEX IF NOT EXISTS idx_tags_campaign_id 
ON tags (campaign_id);

-- Índice para eventos por tipo 
CREATE INDEX IF NOT EXISTS idx_events_type_created_at 
ON events (event_type, created_at DESC);

-- Índice composto para consultas de relatórios
CREATE INDEX IF NOT EXISTS idx_events_tag_type_date 
ON events (tag_id, event_type, created_at);

-- Índice para campanhas por usuário
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id_created_at 
ON campaigns (user_id, created_at DESC);

-- Índice para profiles (lookup rápido)
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles (email);

-- Criar view materializada para métricas agregadas (performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS campaign_metrics_daily AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  DATE(e.created_at) as metric_date,
  COUNT(CASE WHEN e.event_type = 'page_view' THEN 1 END) as page_views,
  COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) as cta_clicks,
  COUNT(CASE WHEN e.event_type = 'pin_click' THEN 1 END) as pin_clicks,
  COUNT(*) as total_events
FROM campaigns c
JOIN tags t ON t.campaign_id = c.id
JOIN events e ON e.tag_id = t.id
WHERE e.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.id, c.name, DATE(e.created_at);

-- Índice para a view materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_metrics_daily_unique 
ON campaign_metrics_daily (campaign_id, metric_date);

-- Configurações de performance para tabelas grandes
ALTER TABLE events SET (
  fillfactor = 95,
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- Estatísticas para o query planner
ANALYZE events;
ANALYZE tags;
ANALYZE campaigns;
ANALYZE profiles;