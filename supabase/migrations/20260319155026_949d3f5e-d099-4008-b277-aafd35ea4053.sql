
-- Drop and recreate agent stats view to use agent_name and remove direction filter
DROP VIEW IF EXISTS public.calls_agent_stats;

CREATE VIEW public.calls_agent_stats AS
SELECT
  COALESCE(
    CASE agent_name
      WHEN '306638' THEN 'Andrés'
      ELSE agent_name
    END,
    'Desconocido'
  ) AS agent,
  count(*) AS total_calls,
  count(*) FILTER (WHERE status = 'answered') AS answered,
  count(*) FILTER (WHERE status IN ('no answer', 'busy', 'cancel')) AS missed,
  count(*) FILTER (WHERE status = 'answered' AND duration >= 60) AS valid_calls,
  round(COALESCE(sum(duration) FILTER (WHERE status = 'answered'), 0)::numeric / 60.0, 1) AS total_minutes,
  round(COALESCE(avg(duration) FILTER (WHERE status = 'answered'), 0)) AS avg_duration_seconds,
  round(
    count(*) FILTER (WHERE status = 'answered' AND duration >= 60)::numeric
    / NULLIF(count(*) FILTER (WHERE status = 'answered'), 0)::numeric * 100, 1
  ) AS valid_call_rate,
  round(
    count(*) FILTER (WHERE status = 'answered')::numeric
    / NULLIF(count(*), 0)::numeric * 100, 1
  ) AS answer_rate,
  COALESCE(sum(cost), 0) AS total_cost
FROM calls
GROUP BY agent_name
ORDER BY count(*) FILTER (WHERE status = 'answered' AND duration >= 60) DESC;
