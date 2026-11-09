begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.school_role as enum ('visitor', 'editor', 'supervisor', 'admin');
create type public.publication_status as enum ('draft', 'review', 'published');
create type public.inbox_status as enum ('new', 'read', 'resolved');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  role public.school_role not null default 'visitor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'school-media' check (bucket = 'school-media'),
  path text unique not null check (char_length(path) between 1 and 500),
  title text not null check (char_length(title) between 1 and 160),
  alt_text text not null default '' check (char_length(alt_text) <= 250),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm','application/pdf')),
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  uploaded_by uuid default auth.uid() references public.profiles(id) on delete set null,
  removal_pending boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.content (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('about','news','announcement','initiative','event','schedule','achievement','resource','parent','survey','calendar','gallery','partnership','stat','contact')),
  slug text unique not null check (char_length(slug) between 1 and 140 and slug ~ '^[a-z0-9ء-ي٠-٩]+(-[a-z0-9ء-ي٠-٩]+)*$'),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  summary text not null default '' check (char_length(summary) <= 600),
  body text not null default '' check (char_length(body) <= 40000),
  status public.publication_status not null default 'draft',
  school_year text not null check (school_year ~ '^[0-9]{4}[-/][0-9]{4}$'),
  image_url text check (image_url ~ '^(https://[^[:space:]]+|/images/[a-zA-Z0-9._-]+)$' and char_length(image_url) <= 2000),
  image_path text references public.media(path),
  file_path text references public.media(path),
  metadata jsonb not null default '{}' check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 16000),
  start_at timestamptz,
  end_at timestamptz,
  featured boolean not null default false,
  is_demo boolean not null default false,
  sort_order integer not null default 0,
  author_id uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (end_at is null or (start_at is not null and end_at >= start_at))
);

create index content_public_idx on public.content(kind, school_year, sort_order, published_at desc) where status = 'published';
create index content_events_idx on public.content(start_at) where status = 'published' and start_at is not null;
create index content_author_idx on public.content(author_id);
create index content_image_path_idx on public.content(image_path) where image_path is not null;
create index content_file_path_idx on public.content(file_path) where file_path is not null;

create table public.site_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,59}$'),
  value jsonb not null check (octet_length(value::text) <= 8000),
  updated_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact','suggestion','survey')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status public.inbox_status not null default 'new',
  created_at timestamptz not null default now()
);
create index submissions_created_idx on public.submissions(created_at desc);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log(created_at desc);

create table private.form_attempts (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  fingerprint text not null,
  client_token uuid,
  created_at timestamptz not null default now(),
  unique (fingerprint, client_token)
);
create index form_attempts_ip_idx on private.form_attempts(fingerprint, created_at desc);
create index form_attempts_created_idx on private.form_attempts(created_at desc);

create table private.survey_receipts (
  survey_id uuid not null references public.content(id) on delete cascade,
  voter_token uuid not null,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  primary key (survey_id, voter_token)
);

create function public.school_user_role()
returns public.school_role
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid()),
    'visitor'::public.school_role
  );
$$;
revoke all on function public.school_user_role() from public;
grant execute on function public.school_user_role() to authenticated, anon;

create function private.make_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 100))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger school_auth_profile after insert on auth.users
for each row execute function private.make_profile();

insert into public.profiles (id, display_name)
select id, left(coalesce(raw_user_meta_data ->> 'display_name', ''), 100)
from auth.users on conflict (id) do nothing;

create function private.protect_profile()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if auth.uid() = old.id and (tg_op = 'DELETE' or new.role is distinct from old.role) then
    raise exception 'cannot_change_own_role' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger school_profile_protection before update or delete on public.profiles
for each row execute function private.protect_profile();

create function private.protect_content()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  option_value jsonb;
  linked_file public.media%rowtype;
begin
  if tg_op = 'INSERT' and auth.uid() is not null then
    new.author_id := auth.uid();
  elsif tg_op = 'UPDATE' then
    if auth.uid() is not null then new.author_id := old.author_id; end if;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();

  if new.status = 'published' then
    if tg_op = 'INSERT' then
      new.published_at := coalesce(new.published_at, now());
    elsif old.status is distinct from new.status then
      new.published_at := now();
    else
      new.published_at := old.published_at;
    end if;
  else
    new.published_at := null;
  end if;

  for linked_file in
    select * from public.media
    where path in (new.image_path, new.file_path)
    order by path
    for share
  loop
    if linked_file.removal_pending then
      raise exception 'media_pending_removal' using errcode = '22023';
    end if;
    if linked_file.path = new.image_path and linked_file.mime_type not like 'image/%' then
      raise exception 'invalid_image_attachment' using errcode = '22023';
    end if;
    if (select public.school_user_role()) = 'editor' and linked_file.uploaded_by is distinct from auth.uid()
      and not (tg_op = 'UPDATE' and (
        linked_file.path is not distinct from old.image_path or linked_file.path is not distinct from old.file_path
      )) then
      raise exception 'attachment_not_owned' using errcode = '42501';
    end if;
  end loop;

  if new.metadata ? 'video_url'
      and coalesce(new.metadata ->> 'video_url', '') !~ '^https://[^[:space:]]+$' then
    raise exception 'invalid_video_url' using errcode = '22023';
  end if;
  if new.kind = 'survey' and (new.status = 'published' or new.metadata ? 'options') then
    if jsonb_typeof(new.metadata -> 'options') is distinct from 'array' then
      raise exception 'invalid_survey_options' using errcode = '22023';
    end if;
    if jsonb_array_length(new.metadata -> 'options') not between 2 and 12 then
      raise exception 'invalid_survey_options' using errcode = '22023';
    end if;
    for option_value in select jsonb_array_elements(new.metadata -> 'options') loop
      if jsonb_typeof(option_value) <> 'string' or char_length(btrim(option_value #>> '{}')) not between 1 and 160 then
        raise exception 'invalid_survey_option' using errcode = '22023';
      end if;
    end loop;
    if (select count(distinct value) from jsonb_array_elements(new.metadata -> 'options')) <>
        jsonb_array_length(new.metadata -> 'options') then
      raise exception 'duplicate_survey_options' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
create trigger school_content_protection before insert or update on public.content
for each row execute function private.protect_content();

create function private.protect_setting()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  setting_text text := new.value #>> '{}';
begin
  if tg_op = 'UPDATE' and new.key is distinct from old.key then
    raise exception 'cannot_rename_setting' using errcode = '22023';
  end if;
  if new.key = 'demo_mode' then
    if jsonb_typeof(new.value) <> 'boolean' then
      raise exception 'invalid_boolean_setting' using errcode = '22023';
    end if;
  elsif jsonb_typeof(new.value) <> 'string' then
    raise exception 'invalid_text_setting' using errcode = '22023';
  elsif new.key in ('map_url', 'hero_image_url') and setting_text <> ''
      and setting_text !~ '^https://[^[:space:]]+$'
      and not (new.key = 'hero_image_url' and setting_text ~ '^/images/[a-zA-Z0-9._-]+$') then
    raise exception 'invalid_setting_url' using errcode = '22023';
  elsif new.key = 'current_school_year' and setting_text !~ '^[0-9]{4}[-/][0-9]{4}$' then
    raise exception 'invalid_school_year' using errcode = '22023';
  elsif new.key = 'hero_image_path' and setting_text <> '' then
    perform 1 from public.media m where m.path = setting_text and m.mime_type like 'image/%'
      and not m.removal_pending for share;
    if not found then
      raise exception 'unknown_hero_image' using errcode = '22023';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger school_setting_protection before insert or update on public.site_settings
for each row execute function private.protect_setting();

create function private.audit_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  old_row jsonb;
  new_row jsonb;
  identifier text;
  context jsonb := '{}';
begin
  if tg_op <> 'INSERT' then old_row := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_row := to_jsonb(new); end if;
  identifier := coalesce(new_row ->> 'id', old_row ->> 'id', new_row ->> 'key', old_row ->> 'key');
  if tg_table_name in ('content','profiles','submissions') then
    context := jsonb_strip_nulls(jsonb_build_object(
      'previous_status', old_row ->> 'status', 'status', new_row ->> 'status',
      'previous_role', old_row ->> 'role', 'role', new_row ->> 'role',
      'kind', coalesce(new_row ->> 'kind', old_row ->> 'kind')
    ));
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name, identifier, context);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger school_audit_content after insert or update or delete on public.content
for each row execute function private.audit_change();
create trigger school_audit_profiles after insert or update or delete on public.profiles
for each row execute function private.audit_change();
create trigger school_audit_media after insert or update or delete on public.media
for each row execute function private.audit_change();
create trigger school_audit_settings after insert or update or delete on public.site_settings
for each row execute function private.audit_change();
create trigger school_audit_inbox after update or delete on public.submissions
for each row execute function private.audit_change();

alter table public.profiles enable row level security;
alter table public.content enable row level security;
alter table public.media enable row level security;
alter table public.site_settings enable row level security;
alter table public.submissions enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.profiles, public.content, public.media, public.site_settings, public.submissions, public.audit_log from anon, authenticated;
grant select on public.content, public.site_settings to anon, authenticated;
grant select on public.profiles, public.media, public.submissions, public.audit_log to authenticated;
grant insert (kind, slug, title, summary, body, status, school_year, image_url, image_path, file_path, metadata, start_at, end_at, featured, is_demo, sort_order)
  on public.content to authenticated;
grant update (kind, slug, title, summary, body, status, school_year, image_url, image_path, file_path, metadata, start_at, end_at, featured, is_demo, sort_order)
  on public.content to authenticated;
grant delete on public.content to authenticated;
grant update (role, display_name) on public.profiles to authenticated;
grant insert (bucket, path, title, alt_text, mime_type, size_bytes) on public.media to authenticated;
grant update (title, alt_text) on public.media to authenticated;
grant delete on public.media to authenticated;
grant insert (key, value) on public.site_settings to authenticated;
grant update (key, value) on public.site_settings to authenticated;
grant delete on public.site_settings to authenticated;
grant update (status) on public.submissions to authenticated;
grant delete on public.submissions to authenticated;

create policy profile_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.school_user_role()) = 'admin');
create policy profile_admin_update on public.profiles for update to authenticated
using ((select public.school_user_role()) = 'admin')
with check ((select public.school_user_role()) = 'admin');

create policy content_public_read on public.content for select to anon, authenticated
using (status = 'published');
create policy content_staff_read on public.content for select to authenticated
using ((select public.school_user_role()) in ('supervisor','admin')
    or ((select public.school_user_role()) = 'editor' and author_id = (select auth.uid())));
create policy content_staff_insert on public.content for insert to authenticated
with check ((select public.school_user_role()) in ('supervisor','admin')
    or ((select public.school_user_role()) = 'editor' and author_id = (select auth.uid()) and status in ('draft','review')));
create policy content_staff_update on public.content for update to authenticated
using ((select public.school_user_role()) in ('supervisor','admin')
    or ((select public.school_user_role()) = 'editor' and author_id = (select auth.uid()) and status in ('draft','review')))
with check ((select public.school_user_role()) in ('supervisor','admin')
    or ((select public.school_user_role()) = 'editor' and author_id = (select auth.uid()) and status in ('draft','review')));
create policy content_staff_delete on public.content for delete to authenticated
using ((select public.school_user_role()) in ('supervisor','admin')
    or ((select public.school_user_role()) = 'editor' and author_id = (select auth.uid()) and status = 'draft'));

create policy settings_read on public.site_settings for select to anon, authenticated using (true);
create policy settings_admin_insert on public.site_settings for insert to authenticated
with check ((select public.school_user_role()) = 'admin');
create policy settings_admin_update on public.site_settings for update to authenticated
using ((select public.school_user_role()) = 'admin')
with check ((select public.school_user_role()) = 'admin');
create policy settings_admin_delete on public.site_settings for delete to authenticated
using ((select public.school_user_role()) = 'admin');

create policy inbox_management_read on public.submissions for select to authenticated
using ((select public.school_user_role()) in ('supervisor','admin'));
create policy inbox_management_update on public.submissions for update to authenticated
using ((select public.school_user_role()) in ('supervisor','admin'))
with check ((select public.school_user_role()) in ('supervisor','admin'));
create policy inbox_management_delete on public.submissions for delete to authenticated
using ((select public.school_user_role()) in ('supervisor','admin'));
create policy audit_management_read on public.audit_log for select to authenticated
using ((select public.school_user_role()) in ('supervisor','admin'));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('school-media', 'school-media', false, 26214400,
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm','application/pdf'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create function public.school_file_is_public(file_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.content c
    where c.status = 'published' and (c.image_path = file_name or c.file_path = file_name)
  ) or exists (
    select 1 from public.site_settings s
    where s.key = 'hero_image_path' and s.value #>> '{}' = file_name
  );
$$;
revoke all on function public.school_file_is_public(text) from public;
grant execute on function public.school_file_is_public(text) to anon, authenticated;

create function public.school_file_is_unused(file_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (
    public.school_user_role() in ('admin','supervisor') or (
      public.school_user_role() = 'editor' and split_part(file_name, '/', 1) = auth.uid()::text
    )
  ) and not exists (
    select 1 from public.content c where c.image_path = file_name or c.file_path = file_name
  ) and not exists (
    select 1 from public.site_settings s
    where s.key = 'hero_image_path' and s.value #>> '{}' = file_name
  );
$$;
revoke all on function public.school_file_is_unused(text) from public;
grant execute on function public.school_file_is_unused(text) to authenticated;

create function public.school_mark_media_for_removal(p_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  asset public.media%rowtype;
  caller_role public.school_role := public.school_user_role();
begin
  select * into asset from public.media where id = p_id for update;
  if not found or caller_role not in ('admin','supervisor','editor')
    or (caller_role = 'editor' and asset.uploaded_by is distinct from auth.uid()) then
    raise exception 'media_not_accessible' using errcode = '42501';
  end if;
  if not public.school_file_is_unused(asset.path) then
    raise exception 'media_in_use' using errcode = '23503';
  end if;
  if not asset.removal_pending then
    update public.media set removal_pending = true where id = p_id;
  end if;
  return asset.path;
end;
$$;
revoke all on function public.school_mark_media_for_removal(uuid) from public;
grant execute on function public.school_mark_media_for_removal(uuid) to authenticated;

create function public.school_media_storage_allowed(file_name text, removing boolean)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (
    public.school_user_role() in ('admin','supervisor') or (
      public.school_user_role() = 'editor' and split_part(file_name, '/', 1) = auth.uid()::text
    )
  ) and not exists (
    select 1 from public.media m where m.path = file_name and (not removing or not m.removal_pending)
  );
$$;
revoke all on function public.school_media_storage_allowed(text, boolean) from public;
grant execute on function public.school_media_storage_allowed(text, boolean) to authenticated;

create policy school_object_public_select on storage.objects for select to anon, authenticated
using (bucket_id = 'school-media' and public.school_file_is_public(name));
create policy school_object_staff_select on storage.objects for select to authenticated
using (bucket_id = 'school-media' and ((select public.school_user_role()) in ('admin','supervisor')
  or ((select public.school_user_role()) = 'editor' and owner_id = (select auth.uid())::text)));
create policy school_object_staff_insert on storage.objects for insert to authenticated
with check (bucket_id = 'school-media' and (select public.school_user_role()) in ('admin','supervisor','editor')
  and owner_id = (select auth.uid())::text and split_part(name, '/', 1) = (select auth.uid())::text
  and public.school_media_storage_allowed(name, false));
create policy school_object_staff_delete on storage.objects for delete to authenticated
using (bucket_id = 'school-media' and public.school_file_is_unused(name) and public.school_media_storage_allowed(name, true) and (
  (select public.school_user_role()) in ('admin','supervisor') or
  ((select public.school_user_role()) = 'editor' and owner_id = (select auth.uid())::text)
));

create policy media_staff_select on public.media for select to authenticated
using ((select public.school_user_role()) in ('admin','supervisor') or
  ((select public.school_user_role()) = 'editor' and uploaded_by = (select auth.uid())));
create policy media_staff_insert on public.media for insert to authenticated
with check ((select public.school_user_role()) in ('admin','supervisor','editor') and uploaded_by = (select auth.uid()) and exists (
  select 1 from storage.objects o where o.bucket_id = media.bucket and o.name = media.path and o.owner_id = (select auth.uid())::text
));
create policy media_staff_update on public.media for update to authenticated
using ((select public.school_user_role()) in ('admin','supervisor') or
  ((select public.school_user_role()) = 'editor' and uploaded_by = (select auth.uid())))
with check ((select public.school_user_role()) in ('admin','supervisor') or
  ((select public.school_user_role()) = 'editor' and uploaded_by = (select auth.uid())));
create policy media_staff_delete on public.media for delete to authenticated
using (removal_pending and public.school_file_is_unused(path) and ((select public.school_user_role()) in ('admin','supervisor') or
  ((select public.school_user_role()) = 'editor' and uploaded_by = (select auth.uid()))));

create function public.submit_school_form(p_kind text, p_payload jsonb, p_fingerprint text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  response_id uuid;
  survey_id_value uuid;
  survey_record public.content%rowtype;
  client_token_value uuid;
  name_value text;
  email_value text;
  message_value text;
  selected_option text;
  checked_payload jsonb;
begin
  if p_kind is null or p_kind not in ('contact','suggestion','survey')
      or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
      or jsonb_typeof(p_payload) is distinct from 'object'
      or octet_length(p_payload::text) > 12000 then
    raise exception 'invalid_submission' using errcode = '22023';
  end if;

  if (p_payload ? 'name' and jsonb_typeof(p_payload -> 'name') <> 'string')
    or (p_payload ? 'email' and jsonb_typeof(p_payload -> 'email') <> 'string')
    or (p_payload ? 'message' and jsonb_typeof(p_payload -> 'message') <> 'string') then
    raise exception 'invalid_submission' using errcode = '22023';
  end if;
  name_value := btrim(coalesce(p_payload ->> 'name', ''));
  email_value := btrim(coalesce(p_payload ->> 'email', ''));
  message_value := btrim(coalesce(p_payload ->> 'message', ''));
  if char_length(name_value) > 120 or char_length(email_value) > 254 or char_length(message_value) > 2500
    or (email_value <> '' and email_value !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then
    raise exception 'invalid_submission' using errcode = '22023';
  end if;

  checked_payload := jsonb_strip_nulls(jsonb_build_object(
    'name', nullif(name_value, ''), 'email', nullif(email_value, ''), 'message', nullif(message_value, '')
  ));
  if p_kind = 'survey' then
    survey_id_value := (p_payload ->> 'survey_id')::uuid;
    selected_option := p_payload ->> 'option';
    select * into survey_record from public.content
    where id = survey_id_value and kind = 'survey' and status = 'published'
      and (start_at is null or start_at <= now()) and (end_at is null or end_at >= now())
    for share;
    if not found or jsonb_typeof(p_payload -> 'option') is distinct from 'string'
      or not coalesce((survey_record.metadata -> 'options') ? selected_option, false) then
      raise exception 'invalid_survey' using errcode = '22023';
    end if;
    checked_payload := checked_payload || jsonb_build_object(
      'survey_id', survey_id_value, 'survey_title', survey_record.title, 'option', selected_option
    );
  elsif name_value = '' or char_length(message_value) < 5 or (p_kind = 'contact' and email_value = '') then
    raise exception 'invalid_submission' using errcode = '22023';
  end if;

  client_token_value := nullif(p_payload ->> 'client_token', '')::uuid;
  perform pg_advisory_xact_lock(718219436829);
  if p_kind = 'survey' then
    if client_token_value is null then
      raise exception 'invalid_submission' using errcode = '22023';
    end if;
    if exists (select 1 from private.survey_receipts r
      where r.survey_id = survey_id_value and r.voter_token = client_token_value) then
      raise exception 'duplicate_survey' using errcode = '23505';
    end if;
  elsif client_token_value is not null then
    select a.submission_id into response_id from private.form_attempts a
    where a.client_token = client_token_value and a.fingerprint = p_fingerprint;
    if found then return response_id; end if;
  end if;
  if (select count(*) from private.form_attempts a where a.fingerprint = p_fingerprint and a.created_at > now() - interval '15 minutes') >= 5
    or (select count(*) from private.form_attempts a where a.created_at > now() - interval '1 hour') >= 100 then
    raise exception 'rate_limited';
  end if;
  delete from private.form_attempts where created_at < now() - interval '1 day';
  insert into public.submissions (kind, payload) values (p_kind, checked_payload) returning id into response_id;
  insert into private.form_attempts (submission_id, fingerprint, client_token)
  values (response_id, p_fingerprint, case when p_kind <> 'survey' then client_token_value end);
  if p_kind = 'survey' then
    insert into private.survey_receipts (survey_id, voter_token, submission_id)
    values (survey_id_value, client_token_value, response_id);
  end if;
  return response_id;
exception when invalid_text_representation then
  raise exception 'invalid_submission' using errcode = '22023';
end;
$$;
revoke all on function public.submit_school_form(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_school_form(text, jsonb, text) to service_role;

commit;
