-- =====================================================================
--  FisioLog · database Supabase
--  Supabase › SQL Editor › New query › incolla tutto › Run.
--  Si può rieseguire: non cancella dati già presenti.
--
--  Chi vede cosa (Row Level Security):
--  · il paziente vede solo i propri dati, gli esercizi che gli sono
--    stati assegnati e il profilo del suo fisioterapista;
--  · il fisioterapista vede la propria libreria e i dati dei pazienti
--    che si sono collegati a lui con il suo codice studio;
--  · i video stanno in un archivio privato: li apre solo il fisio che li
--    ha caricati e i suoi pazienti, con link temporanei.
-- =====================================================================

-- ---------- Profili ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('patient','physio')),
  full_name   text not null default '' check (char_length(full_name) <= 80),
  email       text,
  code        text unique,                       -- codice studio (solo fisio)
  physio_id   uuid references public.profiles(id) on delete set null,
  consent_at  timestamptz,                       -- consenso al trattamento dati
  created_at  timestamptz not null default now()
);
create index if not exists profiles_physio_idx on public.profiles(physio_id);

-- Il profilo nasce da solo alla registrazione, con i dati scelti nel modulo.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r text := coalesce(new.raw_user_meta_data->>'role', 'patient');
  c text;
begin
  if r not in ('patient','physio') then r := 'patient'; end if;
  if r = 'physio' then
    loop
      c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      exit when not exists (select 1 from public.profiles where code = c);
    end loop;
  end if;
  insert into public.profiles (id, role, full_name, email, code, consent_at)
  values (new.id, r,
          left(coalesce(new.raw_user_meta_data->>'full_name', ''), 80),
          new.email, c,
          case when (new.raw_user_meta_data->>'consent') = 'true' then now() end)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Funzioni di supporto per i permessi ----------
create or replace function public.my_physio() returns uuid
language sql stable security definer set search_path = public as $$
  select physio_id from public.profiles where id = auth.uid()
$$;
create or replace function public.is_physio() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'physio')
$$;
create or replace function public.is_my_patient(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = p and physio_id = auth.uid())
$$;

-- ---------- Libreria esercizi (del fisioterapista) ----------
create table if not exists public.exercises (
  id          uuid primary key default gen_random_uuid(),
  physio_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  area        text not null default 'Altro',
  description text not null default '' check (char_length(description) <= 4000),
  steps       text not null default '' check (char_length(steps) <= 4000),
  cautions    text not null default '' check (char_length(cautions) <= 2000),
  sets        int  check (sets between 1 and 20),
  reps        text check (char_length(reps) <= 30),
  hold_s      int  check (hold_s between 0 and 600),
  rest_s      int  check (rest_s between 0 and 600),
  video_path  text,                             -- file nell'archivio "videos"
  video_url   text check (char_length(video_url) <= 500), -- oppure link YouTube / Vimeo
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists exercises_physio_idx on public.exercises(physio_id);

create or replace function public.owns_exercise(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.exercises where id = e and physio_id = auth.uid())
$$;

-- ---------- Programma: esercizi assegnati a un paziente ----------
create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  physio_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  patient_id  uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  sets        int  check (sets between 1 and 20),
  reps        text check (char_length(reps) <= 30),
  hold_s      int  check (hold_s between 0 and 600),
  rest_s      int  check (rest_s between 0 and 600),
  days        int[] not null default '{1,2,3,4,5,6,7}',  -- 1 = lunedì … 7 = domenica
  note        text not null default '' check (char_length(note) <= 1000),
  position    int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists assignments_patient_idx on public.assignments(patient_id);
create index if not exists assignments_physio_idx on public.assignments(physio_id);

-- ---------- Diario: cosa ha fatto il paziente ----------
create table if not exists public.logs (
  id            uuid primary key,                -- generato dall'app: invio sicuro anche offline
  patient_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  exercise_id   uuid references public.exercises(id) on delete set null,
  title         text not null default '' check (char_length(title) <= 80),
  date          date not null,
  sets_done     int  not null default 0 check (sets_done between 0 and 20),
  sets_target   int,
  pain          int  check (pain between 0 and 10),
  feelings      text[] not null default '{}',
  note          text not null default '' check (char_length(note) <= 1000),
  created_at    timestamptz not null default now()
);
create index if not exists logs_patient_date_idx on public.logs(patient_id, date desc);

-- ---------- Sedute in studio ----------
create table if not exists public.visits (
  id          uuid primary key default gen_random_uuid(),
  physio_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  patient_id  uuid not null references public.profiles(id) on delete cascade,
  at          timestamptz not null,
  note        text not null default '' check (char_length(note) <= 300),
  created_at  timestamptz not null default now()
);
create index if not exists visits_patient_idx on public.visits(patient_id, at);

-- ---------- Accesso alle tabelle ----------
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;   -- il ruolo non si cambia dall'app
grant select, insert, update, delete on public.exercises, public.assignments, public.logs, public.visits to authenticated;
revoke all on public.profiles, public.exercises, public.assignments, public.logs, public.visits from anon;

alter table public.profiles    enable row level security;
alter table public.exercises   enable row level security;
alter table public.assignments enable row level security;
alter table public.logs        enable row level security;
alter table public.visits      enable row level security;

-- profili
drop policy if exists "profilo: il mio" on public.profiles;
create policy "profilo: il mio" on public.profiles for select to authenticated
  using (id = auth.uid());
drop policy if exists "profilo: i pazienti del fisio" on public.profiles;
create policy "profilo: i pazienti del fisio" on public.profiles for select to authenticated
  using (physio_id = auth.uid());
drop policy if exists "profilo: il fisio del paziente" on public.profiles;
create policy "profilo: il fisio del paziente" on public.profiles for select to authenticated
  using (id = public.my_physio());
drop policy if exists "profilo: modifico il mio nome" on public.profiles;
create policy "profilo: modifico il mio nome" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- libreria
drop policy if exists "esercizi: il fisio gestisce i suoi" on public.exercises;
create policy "esercizi: il fisio gestisce i suoi" on public.exercises for all to authenticated
  using (physio_id = auth.uid())
  with check (physio_id = auth.uid() and public.is_physio());
drop policy if exists "esercizi: il paziente vede quelli assegnati" on public.exercises;
create policy "esercizi: il paziente vede quelli assegnati" on public.exercises for select to authenticated
  using (exists (select 1 from public.assignments a where a.exercise_id = exercises.id and a.patient_id = auth.uid()));

-- programma
drop policy if exists "programma: il fisio gestisce" on public.assignments;
create policy "programma: il fisio gestisce" on public.assignments for all to authenticated
  using (physio_id = auth.uid())
  with check (physio_id = auth.uid() and public.is_my_patient(patient_id) and public.owns_exercise(exercise_id));
drop policy if exists "programma: il paziente legge il suo" on public.assignments;
create policy "programma: il paziente legge il suo" on public.assignments for select to authenticated
  using (patient_id = auth.uid());

-- diario
drop policy if exists "diario: il paziente gestisce il suo" on public.logs;
create policy "diario: il paziente gestisce il suo" on public.logs for all to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
drop policy if exists "diario: il fisio legge i suoi pazienti" on public.logs;
create policy "diario: il fisio legge i suoi pazienti" on public.logs for select to authenticated
  using (public.is_my_patient(patient_id));

-- sedute
drop policy if exists "sedute: il fisio gestisce" on public.visits;
create policy "sedute: il fisio gestisce" on public.visits for all to authenticated
  using (physio_id = auth.uid())
  with check (physio_id = auth.uid() and public.is_my_patient(patient_id));
drop policy if exists "sedute: il paziente legge le sue" on public.visits;
create policy "sedute: il paziente legge le sue" on public.visits for select to authenticated
  using (patient_id = auth.uid());

-- ---------- Azioni speciali ----------
-- Il paziente si collega al fisio con il codice studio.
create or replace function public.link_physio(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare ph public.profiles;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  select * into ph from public.profiles where code = upper(trim(p_code)) and role = 'physio';
  if not found then raise exception 'Codice studio non valido'; end if;
  update public.profiles set physio_id = ph.id where id = auth.uid() and role = 'patient';
  if not found then raise exception 'Solo un account paziente può collegarsi a un fisioterapista'; end if;
  return json_build_object('id', ph.id, 'full_name', ph.full_name);
end $$;

-- Il paziente si scollega: il fisio non vede più il suo diario.
create or replace function public.unlink_physio() returns void
language sql security definer set search_path = public as $$
  update public.profiles set physio_id = null where id = auth.uid()
$$;

-- Il fisio toglie un paziente dal suo elenco.
create or replace function public.remove_patient(p uuid) returns void
language sql security definer set search_path = public as $$
  update public.profiles set physio_id = null where id = p and physio_id = auth.uid()
$$;

-- Diritto alla cancellazione: elimina l'account e tutti i dati collegati.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.link_physio(text), public.unlink_physio(),
  public.remove_patient(uuid), public.delete_my_account() from public, anon;
grant execute on function public.link_physio(text), public.unlink_physio(),
  public.remove_patient(uuid), public.delete_my_account() to authenticated;

-- ---------- Archivio video (privato) ----------
-- Ogni fisio carica nella cartella che ha il suo id. Limite 50 MB a video
-- (il massimo del piano gratuito di Supabase).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', false, 52428800,
        array['video/mp4','video/quicktime','video/webm','video/x-m4v','video/3gpp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "video: il fisio carica" on storage.objects;
create policy "video: il fisio carica" on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text and public.is_physio());
drop policy if exists "video: il fisio modifica" on storage.objects;
create policy "video: il fisio modifica" on storage.objects for update to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "video: il fisio elimina" on storage.objects;
create policy "video: il fisio elimina" on storage.objects for delete to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "video: fisio e suoi pazienti guardano" on storage.objects;
create policy "video: fisio e suoi pazienti guardano" on storage.objects for select to authenticated
  using (bucket_id = 'videos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or (storage.foldername(name))[1] = public.my_physio()::text));
