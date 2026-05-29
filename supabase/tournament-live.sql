-- Live publico fijo por torneo (ejecutar despues de tournaments.sql)

alter table public.tournaments
  add column if not exists live_match_id text references public.matches (id) on delete set null;

create index if not exists tournaments_live_match_id_idx
  on public.tournaments (live_match_id)
  where live_match_id is not null;
