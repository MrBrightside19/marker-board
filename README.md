# Marcador Hockey (Vue + Vite)

## Desarrollo local

```bash
corepack yarn install
corepack yarn dev
```

## Deploy (GitHub Pages)

El workflow `.github/workflows/deploy.yml` publica en cada push a `develop` o `master`.

Si el job **deploy** falla con *Branch "develop" is not allowed to deploy to github-pages*, hay que autorizar la rama en el repositorio:

1. **Settings** → **Environments** → **github-pages**
2. En **Deployment branches** (o *Deployment protection rules*), cambia de solo `master` a:
   - **All branches**, o
   - **Selected branches** y añade `develop` (y `master` si lo usas)
3. Si hay **Required reviewers** o reglas de espera, desactívalas para este entorno o el deploy quedará pendiente de aprobación.

En **Settings** → **Pages**, la fuente debe ser **GitHub Actions** (no la rama `gh-pages`).

### Variables en GitHub Actions (build de producción)

Vite solo lee variables que empiezan por `VITE_` **en el momento del build**. El `.env` local no se sube al repo; hay que definirlas en GitHub:

1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. Pestaña **Variables** → **New repository variable**:
   - `VITE_SUPABASE_URL` → `https://TU_PROYECTO.supabase.co`
   - `VITE_POLL_INTERVAL_MS` → `5000` (opcional)
3. Pestaña **Secrets** → **New repository secret**:
   - `VITE_SUPABASE_ANON_KEY` → tu clave anon/public de Supabase

El workflow las inyecta en el paso **Build** (ver `deploy.yml`). Tras guardarlas, haz un push o relanza el workflow.

> La clave anon de Supabase va en el JS del navegador; aun así conviene guardarla como **secret** y no commitear el `.env`.

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
