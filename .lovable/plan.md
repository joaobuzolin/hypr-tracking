

## Plano: Corrigir Timeout na Query de Relatórios

### Problema Identificado

O erro **"canceling statement due to statement timeout"** ocorre porque a RPC `get_report_from_events` está demorando mais que o limite padrão do Supabase (8 segundos).

**Causa raiz:** A query atual faz JOIN entre `events` e `tags` e usa `HAVING SUM(1) > 0`, forçando varredura completa antes de aplicar filtros.

### Solução: Otimizar a RPC com Subconsulta

Vou reescrever a função para:
1. Primeiro buscar os `tag_ids` das campanhas selecionadas (query rápida na tabela tags)
2. Depois filtrar `events` diretamente pelos `tag_ids` (usa o índice `idx_events_tag_id`)
3. Remover o `HAVING` desnecessário

---

## Mudanças

### 1. Atualizar a RPC `get_report_from_events`

**Arquivo:** Nova migration SQL

```sql
CREATE OR REPLACE FUNCTION public.get_report_from_events(
  p_campaign_ids uuid[] DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_group_by text DEFAULT 'day'
)
RETURNS TABLE(
  period_start timestamp with time zone,
  campaign_id uuid,
  page_views bigint,
  cta_clicks bigint,
  pin_clicks bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  start_date_filter date;
  end_date_filter date;
BEGIN
  start_date_filter := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  end_date_filter := COALESCE(p_end_date, CURRENT_DATE);
  
  RETURN QUERY
  WITH campaign_tags AS (
    -- Pre-filter tag IDs for selected campaigns (fast index lookup)
    SELECT id, campaign_id 
    FROM tags 
    WHERE (p_campaign_ids IS NULL OR campaign_id = ANY(p_campaign_ids))
  )
  SELECT 
    CASE p_group_by
      WHEN 'week' THEN date_trunc('week', e.created_at)
      WHEN 'month' THEN date_trunc('month', e.created_at)
      ELSE date_trunc('day', e.created_at)
    END as period_start,
    ct.campaign_id,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view')::bigint as page_views,
    COUNT(*) FILTER (WHERE e.event_type = 'click')::bigint as cta_clicks,
    COUNT(*) FILTER (WHERE e.event_type = 'pin_click')::bigint as pin_clicks
  FROM events e
  JOIN campaign_tags ct ON e.tag_id = ct.id
  WHERE e.created_at >= start_date_filter
    AND e.created_at < (end_date_filter + INTERVAL '1 day')
    AND (auth.uid() IS NOT NULL)
  GROUP BY 
    CASE p_group_by
      WHEN 'week' THEN date_trunc('week', e.created_at)
      WHEN 'month' THEN date_trunc('month', e.created_at)
      ELSE date_trunc('day', e.created_at)
    END,
    ct.campaign_id
  ORDER BY period_start DESC, ct.campaign_id;
END;
$$;
```

### 2. Corrigir Filtro de Insertion Orders

Além disso, há um bug no filtro `effectiveCampaignIds` que não considera campanhas vinculadas via `campaign_group`.

**Arquivo:** `src/pages/Reports.tsx`

**Mudança:** Atualizar a lógica para incluir campanhas via `campaign_group`:

```typescript
// Linhas 194-233: Corrigir filtro
const effectiveCampaignIds = useMemo(() => {
  let filteredCampaigns = [...campaigns];
  
  // Filter by selected insertion orders if any
  if (reportConfig.selectedInsertionOrders.length > 0) {
    filteredCampaigns = filteredCampaigns.filter(campaign => {
      // Check direct insertion_order_id
      if (campaign.insertion_order_id && 
          reportConfig.selectedInsertionOrders.includes(campaign.insertion_order_id)) {
        return true;
      }
      // Check via campaign_group
      const campaignGroup = campaignGroups.find(cg => cg.id === campaign.campaign_group_id);
      if (campaignGroup?.insertion_order_id && 
          reportConfig.selectedInsertionOrders.includes(campaignGroup.insertion_order_id)) {
        return true;
      }
      return false;
    });
  }
  // ... resto do código
}, [campaigns, reportConfig, campaignGroups]);
```

---

## Detalhes Técnicos

### Arquivos Modificados:
1. **Nova migration SQL** - Otimiza a RPC `get_report_from_events`
2. **`src/pages/Reports.tsx`** - Corrige filtro de Insertion Orders

### Por que funciona:
- **CTE `campaign_tags`**: Pré-filtra as tags antes do JOIN, reduzindo a quantidade de dados
- **`COUNT(*) FILTER`**: Mais eficiente que `SUM(CASE WHEN...)`
- **Remoção do `HAVING`**: Elimina agregação desnecessária
- **Índice `idx_tags_campaign_id`**: Query rápida na tabela tags

### Resultado Esperado:
- Query executa em menos de 2 segundos (vs timeout atual)
- Dados de Panasonic carregam corretamente
- Filtro por Insertion Order funciona via campaign_group

