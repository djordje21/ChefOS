-- ChefOS Phase 1 · 002 · global system reference data (no business data)

create table public.sys_permissions (
  code        text primary key check (code ~ '^[a-z]+(\.[a-z]+)+$'),
  level       text not null check (level in ('workspace', 'outlet')),
  description text not null
);

insert into public.sys_permissions (code, level, description) values
  ('workspace.settings',     'workspace', 'Edit workspace settings'),
  ('member.manage',          'workspace', 'Invite, change and remove members'),
  ('outlet.manage',          'workspace', 'Create, rename and deactivate outlets'),
  ('audit.view',             'workspace', 'View the audit log'),
  ('ingredient.view',        'workspace', 'View ingredients'),
  ('ingredient.edit',        'workspace', 'Create and edit ingredients'),
  ('supplier.view',          'workspace', 'View suppliers'),
  ('supplier.edit',          'workspace', 'Create and edit suppliers'),
  ('supplier.approve',       'workspace', 'Approve suppliers'),
  ('price.view',             'workspace', 'View purchase prices'),
  ('price.edit',             'workspace', 'Enter purchase prices and offers'),
  ('price.approve',          'workspace', 'Approve purchase price changes'),
  ('recipe.library.edit',    'workspace', 'Edit shared library recipes'),
  ('recipe.library.approve', 'workspace', 'Approve shared library recipes'),
  ('import.run',             'workspace', 'Run data imports'),
  ('export.run',             'workspace', 'Export data'),
  ('report.workspace',       'workspace', 'View workspace-wide reports'),
  ('outlet.view',            'outlet',    'View an outlet and its data'),
  ('recipe.edit',            'outlet',    'Edit outlet recipes'),
  ('recipe.approve',         'outlet',    'Approve outlet recipes'),
  ('menu.edit',              'outlet',    'Edit outlet menus and dishes'),
  ('menu.price.edit',        'outlet',    'Edit outlet selling prices'),
  ('menu.approve',           'outlet',    'Approve outlet menus'),
  ('report.outlet',          'outlet',    'View outlet reports');

-- Subscription-ready entitlements. No billing: a workspace simply points at a plan.
create table public.plans (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^[a-z0-9_]+$'),
  name       text not null,
  limits     jsonb not null,
  features   jsonb not null default '{}'::jsonb,
  is_default boolean not null default false
);
create unique index plans_single_default on public.plans (is_default) where is_default;

insert into public.plans (code, name, limits, is_default) values
  ('free', 'Free', '{"max_owned_workspaces": 3, "max_members": 25, "max_outlets": 10}'::jsonb, true);
