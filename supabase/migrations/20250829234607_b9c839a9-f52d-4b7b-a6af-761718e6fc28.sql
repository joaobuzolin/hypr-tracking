
-- 1) Função que normaliza o event_type a partir do tipo da tag
CREATE OR REPLACE FUNCTION public.normalize_event_type(tag_id uuid, provided_type text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  t text;
BEGIN
  SELECT type INTO t FROM public.tags WHERE id = tag_id;

  -- Se não achar a tag, mantém o valor informado (evita falhas em importações parciais)
  IF t IS NULL THEN
    RETURN provided_type;
  END IF;

  IF t = 'page-view' THEN
    RETURN 'page_view';
  ELSIF t = 'pin' THEN
    RETURN 'pin_click';
  ELSIF t = 'click-button' THEN
    RETURN 'click';
  ELSE
    RETURN provided_type;
  END IF;
END;
$$;

-- 2) Trigger que aplica a normalização em todo INSERT/UPDATE de events
CREATE OR REPLACE FUNCTION public.events_before_write_normalize()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.event_type := public.normalize_event_type(NEW.tag_id, NEW.event_type);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_normalize ON public.events;
CREATE TRIGGER trg_events_normalize
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.events_before_write_normalize();

-- 3) Corrigir dados antigos para os nomes canônicos
UPDATE public.events e
SET event_type = CASE
  WHEN t.type = 'page-view' THEN 'page_view'
  WHEN t.type = 'pin' THEN 'pin_click'
  WHEN t.type = 'click-button' THEN 'click'
  ELSE e.event_type
END
FROM public.tags t
WHERE e.tag_id = t.id
  AND e.event_type NOT IN ('page_view','pin_click','click');

-- 4) Constraints para garantir apenas valores suportados
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_type_allowed;
ALTER TABLE public.tags
  ADD CONSTRAINT tags_type_allowed
  CHECK (type IN ('page-view','pin','click-button'));

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_allowed;
ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_allowed
  CHECK (event_type IN ('page_view','pin_click','click'));

-- 5) View opcional para facilitar leitura uniforme em relatórios e log
CREATE OR REPLACE VIEW public.events_with_tags AS
SELECT
  e.id,
  e.created_at,
  e.event_type,
  e.tag_id,
  t.title AS tag_title,
  t.type  AS tag_type,
  t.campaign_id,
  CASE e.event_type
    WHEN 'page_view' THEN 'Ad View'
    WHEN 'pin_click' THEN 'Como Chegar'
    WHEN 'click'     THEN 'Click CTA'
  END AS event_label
FROM public.events e
JOIN public.tags t ON t.id = e.tag_id;
