  -- Torneos y calendario de partidos (ejecutar despues de schema.sql)

  -- Si ya creaste torneos con default_time_game, puedes eliminarla:
  -- alter table public.tournaments drop column if exists default_time_game;

  create table if not exists public.tournaments (
    id uuid primary key default gen_random_uuid(),
    organizer_id uuid not null references public.profiles (id) on delete cascade,
    name text not null,
    start_date date not null,
    end_date date not null,
    status text not null default 'active' check (status in ('active', 'finished')),
    created_at timestamptz not null default now(),
    constraint tournaments_dates_check check (end_date >= start_date)
  );

  create table if not exists public.tournament_matches (
    id uuid primary key default gen_random_uuid(),
    tournament_id uuid not null references public.tournaments (id) on delete cascade,
    sort_order integer not null default 0,
    scheduled_at timestamptz,
    local_team text not null,
    visit_team text not null,
    time_game text not null default '20:00',
    match_id text references public.matches (id) on delete set null,
    status text not null default 'scheduled'
      check (status in ('scheduled', 'live', 'finished')),
    goal_local integer,
    goal_visit integer,
    finished_at timestamptz,
    created_at timestamptz not null default now()
  );

  alter table public.matches
    add column if not exists tournament_id uuid references public.tournaments (id) on delete set null;

  create index if not exists tournament_matches_tournament_id_idx
    on public.tournament_matches (tournament_id);

  create index if not exists tournaments_organizer_id_idx
    on public.tournaments (organizer_id);

  alter table public.tournaments enable row level security;
  alter table public.tournament_matches enable row level security;

  -- Lectura publica (espectadores ven calendario)
  create policy "tournaments read all"
  on public.tournaments for select
  to anon, authenticated
  using (true);

  create policy "tournament_matches read all"
  on public.tournament_matches for select
  to anon, authenticated
  using (true);

  -- Solo el organizador crea/edita su torneo
  create policy "tournaments insert own"
  on public.tournaments for insert
  to authenticated
  with check (auth.uid() = organizer_id);

  create policy "tournaments update own"
  on public.tournaments for update
  to authenticated
  using (auth.uid() = organizer_id)
  with check (auth.uid() = organizer_id);

  create policy "tournaments delete own"
  on public.tournaments for delete
  to authenticated
  using (auth.uid() = organizer_id);

  create policy "tournament_matches insert own tournament"
  on public.tournament_matches for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.organizer_id = auth.uid()
    )
  );

  create policy "tournament_matches update own tournament"
  on public.tournament_matches for update
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

  create policy "tournament_matches delete own tournament"
  on public.tournament_matches for delete
  to authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.organizer_id = auth.uid()
    )
  );
