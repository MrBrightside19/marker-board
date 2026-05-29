-- Deporte y visibilidad de torneos (ejecutar en proyectos existentes)

alter table public.tournaments
  add column if not exists sport text not null default 'hockey',
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'private'));

create index if not exists tournaments_sport_visibility_idx
  on public.tournaments (sport, visibility, status);
