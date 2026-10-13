-- ChefOS Phase 1 · 003 · profiles, workspaces, roles, memberships, outlets, invitations
--
-- Isolation pattern: every workspace-owned table has workspace_id NOT NULL and
-- UNIQUE (workspace_id, id); every reference to another workspace-owned row is a
-- composite foreign key that includes workspace_id, so the database itself
-- rejects cross-workspace references.

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 200),
  ui_language text not null default 'en' check (ui_language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  created_at  timestamptz not null default now()
);

create table public.workspaces (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(btrim(name)) between 1 and 120),
  kind          text not null default 'operational' check (kind in ('operational', 'demo')),
  base_currency text not null check (base_currency ~ '^[A-Z]{3}$'),
  locale        text not null default 'en' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  timezone      text not null default 'UTC',
  plan_id       uuid not null references public.plans (id),
  status        text not null default 'active' check (status in ('active', 'suspended')),
  created_by    uuid not null references auth.users (id),
  created_at    timestamptz not null default now()
);

create table public.roles (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  key          text check (key ~ '^[a-z_]+$'),
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  level        text not null check (level in ('workspace', 'outlet')),
  is_system    boolean not null default false,
  sort_order   int not null default 100,
  unique (workspace_id, id),
  unique (workspace_id, level, id),
  unique (workspace_id, key),
  unique (workspace_id, name)
);

create table public.role_permissions (
  workspace_id    uuid not null,
  role_id         uuid not null,
  permission_code text not null references public.sys_permissions (code),
  primary key (role_id, permission_code),
  foreign key (workspace_id, role_id) references public.roles (workspace_id, id) on delete cascade
);

create table public.memberships (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role_id      uuid not null,
  role_level   text not null default 'workspace' check (role_level = 'workspace'),
  all_outlets  boolean not null default true,
  status       text not null default 'active' check (status in ('active', 'suspended')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id),
  foreign key (workspace_id, role_level, role_id) references public.roles (workspace_id, level, id)
);
create index memberships_user_idx on public.memberships (user_id);

create table public.outlets (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 120),
  type         text not null default 'restaurant'
               check (type in ('restaurant', 'bar', 'breakfast', 'banqueting', 'room_service', 'cafe', 'production_kitchen', 'other')),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (workspace_id, id)
);
create unique index outlets_name_unique on public.outlets (workspace_id, lower(btrim(name)));

create table public.outlet_memberships (
  workspace_id uuid not null,
  outlet_id    uuid not null,
  user_id      uuid not null,
  role_id      uuid not null,
  role_level   text not null default 'outlet' check (role_level = 'outlet'),
  created_at   timestamptz not null default now(),
  primary key (outlet_id, user_id),
  foreign key (workspace_id, outlet_id) references public.outlets (workspace_id, id) on delete cascade,
  foreign key (workspace_id, user_id) references public.memberships (workspace_id, user_id) on delete cascade,
  foreign key (workspace_id, role_level, role_id) references public.roles (workspace_id, level, id)
);
create index outlet_memberships_user_idx on public.outlet_memberships (workspace_id, user_id);

create table public.invitations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  email         text not null check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role_id       uuid not null,
  role_level    text not null default 'workspace' check (role_level = 'workspace'),
  all_outlets   boolean not null default true,
  outlet_grants jsonb not null default '[]'::jsonb check (jsonb_typeof(outlet_grants) = 'array'),
  token_hash    bytea not null unique,
  invited_by    uuid not null references auth.users (id),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  accepted_at   timestamptz,
  accepted_by   uuid references auth.users (id),
  revoked_at    timestamptz,
  unique (workspace_id, id),
  foreign key (workspace_id, role_level, role_id) references public.roles (workspace_id, level, id)
);
create unique index invitations_one_open_per_email
  on public.invitations (workspace_id, email) where accepted_at is null and revoked_at is null;

-- Role permissions must match the role level: outlet roles can hold only
-- outlet-level permissions; workspace roles may hold both.
create function private.check_role_permission_level() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_role_level text;
  v_perm_level text;
begin
  select level into v_role_level from public.roles where id = new.role_id;
  select level into v_perm_level from public.sys_permissions where code = new.permission_code;
  if v_role_level = 'outlet' and v_perm_level <> 'outlet' then
    raise exception 'Outlet roles cannot hold workspace-level permission %', new.permission_code
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger role_permissions_level
  before insert or update on public.role_permissions
  for each row execute function private.check_role_permission_level();

-- Sign-up creates a profile and nothing else: no workspace, no membership, no role.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 200));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
