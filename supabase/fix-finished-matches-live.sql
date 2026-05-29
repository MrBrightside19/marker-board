-- Corrige partidos ya finalizados en el torneo que siguen con is_live = true
-- (por el bug anterior al pulsar "Siguiente partido"). Ejecutar una vez si hace falta.

update public.matches m
set
  is_live = false,
  finished_at = coalesce(m.finished_at, tm.finished_at, now()),
  state = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(m.state, '{timeGame}', '"00:00"'),
        '{penaltyGame}', '"00:00"'
      ),
      '{isPaused}', 'true'
    ),
    '{penalizedLocal}', 'false'
  )
from public.tournament_matches tm
where tm.match_id = m.id
  and tm.status = 'finished';
