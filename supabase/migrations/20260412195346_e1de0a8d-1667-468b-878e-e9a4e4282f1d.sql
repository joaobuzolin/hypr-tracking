
-- Atualizar cleanup_old_events: retencao de 90 dias -> 7 dias, batch maior
CREATE OR REPLACE FUNCTION public.cleanup_old_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '300s'
AS $$
DECLARE
  batch_size INT := 100000;
  deleted INT;
  total INT := 0;
BEGIN
  FOR i IN 1..20 LOOP
    DELETE FROM events WHERE id IN (
      SELECT id FROM events 
      WHERE created_at < NOW() - INTERVAL '7 days' 
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
