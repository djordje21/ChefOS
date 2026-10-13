-- ChefOS Phase 1 · 001 · schemas and baseline privileges
-- `private` holds helper functions used by RLS policies and triggers.
-- It is NOT exposed through the Supabase Data API.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Supabase grants broad default privileges on new objects in `public` to anon
-- and authenticated. ChefOS grants table privileges explicitly instead
-- (see the final grants migration), so remove the defaults for objects
-- created by this role.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public;
