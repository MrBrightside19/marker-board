-- Ejecutar en Supabase SQL Editor (proyecto marker-board)
-- Extiende el esquema base de matches con usuarios y roles.

-- Perfiles (organizador | espectador)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('organizer', 'spectator')),
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles read all"
on public.profiles for select
to anon, authenticated
using (true);

create policy "profiles insert own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles update own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Partidos (si ya existe la tabla, solo agrega columnas)
create table if not exists public.matches (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.matches
  add column if not exists title text,
  add column if not exists organizer_id uuid references public.profiles (id),
  add column if not exists is_live boolean not null default true;

alter table public.matches enable row level security;

-- Lectura publica (home + live sin login)
drop policy if exists "public read matches" on public.matches;
create policy "public read matches"
on public.matches for select
to anon, authenticated
using (true);

-- Escritura: autenticados y anon (compatibilidad mesa de control anonima)
drop policy if exists "public write matches" on public.matches;
drop policy if exists "public update matches" on public.matches;

create policy "authenticated insert matches"
on public.matches for insert
to authenticated, anon
with check (true);

create policy "authenticated update matches"
on public.matches for update
to authenticated, anon
using (true)
with check (true);

-- Trigger opcional: perfil al registrarse (si el cliente no inserta)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'spectator'),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Habilitar Email auth en: Authentication > Providers > Email
