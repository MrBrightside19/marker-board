# Marcador Hockey (Vue + Vite)

## Desarrollo local

```bash
corepack yarn install
corepack yarn dev
```

## Sincronizacion remota (costo minimo)

La app usa Supabase solo con lectura/escritura REST (sin WebSocket Realtime para espectadores).
El live publico hace 1 lectura al entrar, cuenta regresiva local y actualiza por poll (intervalo configurable).

### 1) Configurar variables de entorno

Copiar `.env.example` a `.env` y completar:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_POLL_INTERVAL_MS=5000
```

`VITE_POLL_INTERVAL_MS` controla cada cuantos milisegundos el live y el marcador (en otro dispositivo) consultan el servidor. Minimo `1000`; por defecto `5000`.

### 2) Crear tabla en Supabase

Ejecuta en SQL Editor:

```sql
create table if not exists public.matches (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.matches enable row level security;

create policy "public read matches"
on public.matches
for select
to anon
using (true);

create policy "public write matches"
on public.matches
for insert
to anon
with check (true);

create policy "public update matches"
on public.matches
for update
to anon
using (true)
with check (true);
```

No necesitas habilitar Replication/Realtime en Supabase para el live publico.

## Rutas

- Marcador (TV): `/` — crea o reutiliza un `matchId` y lo guarda en el navegador
- Controles: `/controls` — usa el mismo `matchId` (misma sesion de partido)
- Live publico: `/live/:matchId` — URL para compartir (visible en marcador y controles)

Al abrir marcador o controles sin `matchId` en la URL, se genera uno automaticamente (ej. `partido-m5abc123`). Ese id enlaza las tres vistas.
