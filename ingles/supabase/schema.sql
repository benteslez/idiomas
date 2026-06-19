-- ============================================================================
-- LEXIS · Esquema Supabase para el examen adaptativo de vocabulario
-- ----------------------------------------------------------------------------
-- Ejecuta este archivo en el SQL Editor de tu proyecto Supabase.
-- Modelo de auth: Opción A (anónimo, app personal) — ver README §Supabase.
-- ============================================================================

-- PERFILES (Rubén, Sergio, Invitado u otros)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  created_at timestamptz default now()
);

-- BANCO DE ÍTEMS (opcional en Supabase; la app funciona con los .js locales).
-- Útil si quieres recalibrar `b` con datos reales (ver /scripts/calibrate).
create table if not exists items (
  id text primary key,                       -- p.ej. "trans:meticulous" | "gap:mitigate"
  kind text not null,                        -- 'trans' | 'gap' | 'syn' | 'trap'
  word text not null,
  cefr text not null,
  cefr_source text not null default 'seed',  -- 'seed' | 'EVP' | 'Oxford' | ...
  b double precision not null,
  a double precision not null default 1,
  b_source text not null default 'seed',     -- 'seed' | 'empirical'
  es text,
  payload jsonb,                             -- frase, distractores, def, nota...
  needs_review boolean default false,
  active boolean default true,
  n_responses int default 0,
  n_correct int default 0,
  updated_at timestamptz default now()
);

-- SESIONES
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  mode text not null,                        -- 'practice' | 'exam'
  started_at timestamptz default now(),
  ended_at timestamptz,
  items_count int default 0,
  final_theta double precision,
  final_se double precision,
  final_cefr text
);

-- RESPUESTAS (la materia prima de la recalibración IRT)
create table if not exists responses (
  id bigint generated always as identity primary key,
  profile_id uuid references profiles(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  item_id text,                              -- id del ítem (o "kind:word")
  kind text,                                 -- tipo de ejercicio
  word text,
  cefr text,
  b double precision,                        -- dificultad del ítem al responder
  correct boolean not null,
  theta_at_time double precision,            -- θ del usuario al responder
  chosen_index int,
  response_ms int,
  created_at timestamptz default now()
);

-- PROGRESO POR PERFIL (último nivel + palabras débiles)
create table if not exists progress (
  profile_id uuid primary key references profiles(id) on delete cascade,
  last_theta double precision,
  last_cefr text,
  weak_words jsonb default '[]',
  updated_at timestamptz default now()
);

create index if not exists responses_item_idx on responses (item_id);
create index if not exists responses_profile_idx on responses (profile_id);
create index if not exists responses_word_idx on responses (word);
create index if not exists items_cefr_idx on items (cefr);
create index if not exists items_b_idx on items (b);

-- ============================================================================
-- RLS (Row Level Security)
-- ----------------------------------------------------------------------------
-- Opción A (app personal con anon key): se activa RLS y se permite a 'anon'
-- operar sobre las tablas de usuario. La separación por perfil la hace el
-- cliente (filtra por profile_id). Es un modelo de confianza RELAJADO,
-- adecuado para una app personal; NO para multi-usuario no confiable.
-- Para producción seria, usa Supabase Auth (magic link) y políticas con
-- auth.uid(); ver README §Supabase (Opción B).
-- ============================================================================
alter table profiles  enable row level security;
alter table sessions  enable row level security;
alter table responses enable row level security;
alter table progress  enable row level security;
alter table items     enable row level security;

-- items: lectura pública de los activos; sin escritura para anon
drop policy if exists items_read on items;
create policy items_read on items for select using (active = true);

-- tablas de usuario: acceso anon (modelo relajado, Opción A)
do $$
declare t text;
begin
  foreach t in array array['profiles','sessions','responses','progress'] loop
    execute format('drop policy if exists %1$s_anon_all on %1$s;', t);
    execute format('create policy %1$s_anon_all on %1$s for all to anon using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================================
-- Trigger: mantener items.n_responses / n_correct al insertar respuestas
-- (solo si el ítem existe en la tabla items)
-- ============================================================================
create or replace function bump_item_stats() returns trigger as $$
begin
  update items
     set n_responses = n_responses + 1,
         n_correct   = n_correct + (case when new.correct then 1 else 0 end),
         updated_at  = now()
   where id = new.item_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_bump_item_stats on responses;
create trigger trg_bump_item_stats after insert on responses
  for each row execute function bump_item_stats();

-- Perfiles por defecto (opcional)
insert into profiles (display_name)
select x from (values ('Rubén'), ('Sergio'), ('Invitado')) as v(x)
where not exists (select 1 from profiles);
