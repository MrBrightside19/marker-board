-- =============================================================================
-- Reiniciar datos de la app SIN borrar usuarios
-- =============================================================================
-- Conserva:
--   - auth.users          (cuentas de Supabase Auth)
--   - public.profiles     (rol, nombre visible)
--
-- Borra:
--   - public.tournament_matches
--   - public.matches
--   - public.tournaments
--
-- Cómo ejecutarlo: Supabase → SQL Editor → pegar y Run
-- ⚠️ Irreversible. Haz copia o usa un proyecto de prueba si dudas.
-- =============================================================================

begin;

-- 1) Calendario de torneos (referencia a matches y tournaments)
truncate table public.tournament_matches restart identity cascade;

-- 2) Partidos / marcadores en vivo
truncate table public.matches restart identity cascade;

-- 3) Torneos
truncate table public.tournaments restart identity cascade;

commit;

-- Comprobación rápida (deberían ser 0):
-- select
--   (select count(*) from public.tournament_matches) as tournament_matches,
--   (select count(*) from public.matches) as matches,
--   (select count(*) from public.tournaments) as tournaments,
--   (select count(*) from public.profiles) as profiles,
--   (select count(*) from auth.users) as auth_users;
