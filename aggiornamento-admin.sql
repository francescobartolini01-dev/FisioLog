-- =====================================================================
--  FisioLog · aggiornamento "utente admin"
--  Da eseguire UNA volta se hai già eseguito supabase.sql prima di oggi.
--  Supabase › SQL Editor › New query › incolla › Run.
-- =====================================================================

alter table public.profiles add column if not exists is_admin boolean not null default false;

-- l'admin può collegarsi anche come paziente
create or replace function public.link_physio(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare ph public.profiles;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  select * into ph from public.profiles where code = upper(trim(p_code)) and role = 'physio';
  if not found then raise exception 'Codice studio non valido'; end if;
  update public.profiles set physio_id = ph.id where id = auth.uid() and (role = 'patient' or is_admin);
  if not found then raise exception 'Solo un account paziente può collegarsi a un fisioterapista'; end if;
  return json_build_object('id', ph.id, 'full_name', ph.full_name);
end $$;

-- attiva l'admin su un account già registrato (solo da qui, non dall'app)
create or replace function public.make_admin(p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare pr public.profiles; c text;
begin
  select * into pr from public.profiles where lower(email) = lower(trim(p_email));
  if not found then raise exception 'Nessun account con email %: registrati prima nell''app', p_email; end if;
  c := pr.code;
  if c is null then
    loop
      c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      exit when not exists (select 1 from public.profiles where code = c);
    end loop;
  end if;
  update public.profiles set is_admin = true, role = 'physio', code = c, physio_id = coalesce(physio_id, id) where id = pr.id;
  return 'Admin attivo per ' || pr.email || ' · codice studio ' || c;
end $$;
revoke execute on function public.make_admin(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Dopo esserti registrato nell'app con la tua email, esegui questa riga
-- (cambia l'indirizzo) per diventare admin:
--
--   select public.make_admin('tua@email.it');
--
-- Per togliere l'admin a un account:
--   update public.profiles set is_admin = false where email = 'tua@email.it';
-- ---------------------------------------------------------------------
