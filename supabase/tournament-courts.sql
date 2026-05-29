-- Canchas por torneo (ejecutar despues de tournament-live.sql)

alter table public.tournament_matches
  add column if not exists court text not null default '1';

alter table public.matches
  add column if not exists court text;

create index if not exists tournament_matches_court_idx
  on public.tournament_matches (tournament_id, court);

-- Live publico por cancha (una URL fija por torneo + cancha)
create table if not exists public.tournament_court_streams (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  court text not null,
  live_match_id text references public.matches (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (tournament_id, court)
);

alter table public.tournament_court_streams enable row level security;

create policy "tournament_court_streams read all"
on public.tournament_court_streams for select
to anon, authenticated
using (true);

create policy "tournament_court_streams insert own tournament"
on public.tournament_court_streams for insert
to authenticated
with check (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_id and t.organizer_id = auth.uid()
  )
);

create policy "tournament_court_streams update own tournament"
on public.tournament_court_streams for update
to authenticated
using (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_id and t.organizer_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_id and t.organizer_id = auth.uid()
  )
);

-- Lectura/escritura del stream por anon (mesa de control con clave anon, mismo patrón que matches)
drop policy if exists "tournament_court_streams upsert anon" on public.tournament_court_streams;
create policy "tournament_court_streams upsert anon"
on public.tournament_court_streams for insert
to anon, authenticated
with check (true);

drop policy if exists "tournament_court_streams update anon" on public.tournament_court_streams;
create policy "tournament_court_streams update anon"
on public.tournament_court_streams for update
to anon, authenticated
using (true)
with check (true);

-- Migrar live_match_id antiguo a cancha "1"
insert into public.tournament_court_streams (tournament_id, court, live_match_id)
select id, '1', live_match_id
from public.tournaments
where live_match_id is not null
on conflict (tournament_id, court) do update
  set live_match_id = excluded.live_match_id,
      updated_at = now();
