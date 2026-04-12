CREATE TABLE IF NOT EXISTS public.tag_metrics_backfill_state (
  job_name text PRIMARY KEY,
  current_day date NOT NULL,
  end_day date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamp with time zone,
  last_processed_at timestamp with time zone,
  completed_at timestamp with time zone,
  last_error text
);

ALTER TABLE public.tag_metrics_backfill_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'tag_metrics_backfill_state' 
      AND policyname = 'Authenticated users can view tag_metrics_backfill_state'
  ) THEN
    CREATE POLICY "Authenticated users can view tag_metrics_backfill_state"
    ON public.tag_metrics_backfill_state
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END
$$;

INSERT INTO public.tag_metrics_backfill_state (job_name, current_day, end_day, status)
VALUES ('tag_metrics_daily_90d', CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE, 'pending')
ON CONFLICT (job_name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.backfill_tag_metrics_single_day(p_day date)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '45s'
AS $$
DECLARE
  affected_rows bigint := 0;
BEGIN
  INSERT INTO public.tag_metrics_daily (tag_id, campaign_id, metric_date, page_views, cta_clicks, pin_clicks, total_events)
  SELECT 
    e.tag_id,
    t.campaign_id,
    p_day,
    COUNT(*) FILTER (WHERE e.event_type = 'page_view')::bigint,
    COUNT(*) FILTER (WHERE e.event_type = 'click')::bigint,
    COUNT(*) FILTER (WHERE e.event_type = 'pin_click')::bigint,
    COUNT(*)::bigint
  FROM public.events e
  JOIN public.tags t ON t.id = e.tag_id
  WHERE e.created_at >= p_day
    AND e.created_at < p_day + INTERVAL '1 day'
  GROUP BY e.tag_id, t.campaign_id
  ON CONFLICT (tag_id, metric_date) DO UPDATE SET
    campaign_id = EXCLUDED.campaign_id,
    page_views = EXCLUDED.page_views,
    cta_clicks = EXCLUDED.cta_clicks,
    pin_clicks = EXCLUDED.pin_clicks,
    total_events = EXCLUDED.total_events;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_tag_metrics_backfill_step()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '60s'
AS $$
DECLARE
  state_row public.tag_metrics_backfill_state%ROWTYPE;
  next_status text;
  affected_rows bigint := 0;
BEGIN
  IF NOT pg_try_advisory_lock(987654324) THEN
    RETURN 'locked';
  END IF;

  BEGIN
    SELECT *
    INTO state_row
    FROM public.tag_metrics_backfill_state
    WHERE job_name = 'tag_metrics_daily_90d'
    FOR UPDATE;

    IF state_row.status = 'completed' THEN
      PERFORM pg_advisory_unlock(987654324);
      RETURN 'completed';
    END IF;

    UPDATE public.tag_metrics_backfill_state
    SET status = 'running',
        started_at = COALESCE(started_at, now()),
        last_error = NULL
    WHERE job_name = 'tag_metrics_daily_90d';

    IF state_row.current_day > state_row.end_day THEN
      UPDATE public.tag_metrics_backfill_state
      SET status = 'completed',
          completed_at = now(),
          last_processed_at = now(),
          last_error = NULL
      WHERE job_name = 'tag_metrics_daily_90d';

      PERFORM pg_advisory_unlock(987654324);
      RETURN 'completed';
    END IF;

    affected_rows := public.backfill_tag_metrics_single_day(state_row.current_day);
    next_status := CASE WHEN state_row.current_day + 1 > state_row.end_day THEN 'completed' ELSE 'running' END;

    UPDATE public.tag_metrics_backfill_state
    SET current_day = state_row.current_day + 1,
        status = next_status,
        last_processed_at = now(),
        completed_at = CASE WHEN next_status = 'completed' THEN now() ELSE completed_at END,
        last_error = NULL
    WHERE job_name = 'tag_metrics_daily_90d';

    PERFORM pg_advisory_unlock(987654324);
    RETURN 'processed ' || state_row.current_day || ' rows=' || affected_rows;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.tag_metrics_backfill_state
    SET status = 'failed',
        last_processed_at = now(),
        last_error = SQLERRM
    WHERE job_name = 'tag_metrics_daily_90d';

    PERFORM pg_advisory_unlock(987654324);
    RAISE;
  END;
END;
$$;

DO $outer$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'tag-metrics-backfill-step'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'tag-metrics-backfill-step',
    '* * * * *',
    $inner$SELECT public.run_tag_metrics_backfill_step();$inner$
  );
END
$outer$;