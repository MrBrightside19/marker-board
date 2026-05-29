-- Resultados y estado de torneos (ejecutar despues de tournaments.sql)

alter table public.tournaments
  add column if not exists status text not null default 'active';

alter table public.tournaments
  drop constraint if exists tournaments_status_check;

alter table public.tournaments
  add constraint tournaments_status_check
  check (status in ('active', 'finished'));

alter table public.tournament_matches
  add column if not exists goal_local integer,
  add column if not exists goal_visit integer,
  add column if not exists finished_at timestamptz;

-- Partidos sueltos: marca de finalizacion opcional
alter table public.matches
  add column if not exists finished_at timestamptz,
  add column if not exists goal_local integer,
  add column if not exists goal_visit integer;

create index if not exists tournament_matches_finished_idx
  on public.tournament_matches (tournament_id, finished_at desc)
  where status = 'finished';

create index if not exists tournaments_status_idx
  on public.tournaments (status);
