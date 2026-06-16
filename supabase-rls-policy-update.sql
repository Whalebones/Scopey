-- Scopey RLS policy update for newer project collaboration tables.
-- Run this once in the Supabase SQL editor if your existing database was
-- created before these policies were added to supabase-schema.sql.
--
-- Intent:
-- - Signed-in freelancers can manage rows connected to their own projects.
-- - Client/public access still goes through Scopey's backend share-link routes.
-- - processed_events and beta_feedback intentionally have no browser policies;
--   they are service-role/backend tables.

create or replace function public.scopey_schema_health()
returns table (
  table_name text,
  table_exists boolean,
  rls_enabled boolean,
  policy_count integer
)
language sql
security definer
set search_path = public, pg_catalog
as $$
  with required(table_name) as (
    values
      ('projects'),
      ('scope_items'),
      ('changes'),
      ('change_payments'),
      ('processed_events'),
      ('freelancer_profiles'),
      ('user_plans'),
      ('policy_acceptances'),
      ('agreement_templates'),
      ('suggestions'),
      ('project_updates'),
      ('content_reports'),
      ('beta_feedback'),
      ('project_payments'),
      ('project_activity'),
      ('project_share_links'),
      ('project_agreement_versions'),
      ('project_deliverables'),
      ('rights_artworks'),
      ('rights_licenses')
  ),
  relation_state as (
    select
      required.table_name,
      pg_class.oid,
      coalesce(pg_class.relrowsecurity, false) as rls_enabled
    from required
    left join pg_class
      on pg_class.oid = to_regclass('public.' || quote_ident(required.table_name))
  )
  select
    relation_state.table_name,
    relation_state.oid is not null as table_exists,
    relation_state.rls_enabled,
    coalesce(count(pg_policies.policyname)::integer, 0) as policy_count
  from relation_state
  left join pg_policies
    on pg_policies.schemaname = 'public'
    and pg_policies.tablename = relation_state.table_name
  group by relation_state.table_name, relation_state.oid, relation_state.rls_enabled
  order by relation_state.table_name;
$$;

revoke all on function public.scopey_schema_health() from public;
revoke all on function public.scopey_schema_health() from anon;
revoke all on function public.scopey_schema_health() from authenticated;
grant execute on function public.scopey_schema_health() to service_role;

alter table public.suggestions enable row level security;
alter table public.project_updates enable row level security;
alter table public.project_activity enable row level security;
alter table public.project_share_links enable row level security;
alter table public.project_agreement_versions enable row level security;
alter table public.project_deliverables enable row level security;
alter table public.project_payments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'suggestions'
      and policyname = 'Users can manage suggestions for their projects'
  ) then
    create policy "Users can manage suggestions for their projects"
      on public.suggestions
      for all
      using (
        exists (
          select 1
          from public.projects
          where projects.id = suggestions.project_id
            and projects.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.projects
          where projects.id = suggestions.project_id
            and projects.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_updates'
      and policyname = 'Users can manage updates for their projects'
  ) then
    create policy "Users can manage updates for their projects"
      on public.project_updates
      for all
      using (
        exists (
          select 1
          from public.projects
          where projects.id = project_updates.project_id
            and projects.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.projects
          where projects.id = project_updates.project_id
            and projects.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_activity'
      and policyname = 'Users can manage activity for their projects'
  ) then
    create policy "Users can manage activity for their projects"
      on public.project_activity
      for all
      using (
        exists (
          select 1
          from public.projects
          where projects.id = project_activity.project_id
            and projects.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.projects
          where projects.id = project_activity.project_id
            and projects.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_share_links'
      and policyname = 'Users can manage share links for their projects'
  ) then
    create policy "Users can manage share links for their projects"
      on public.project_share_links
      for all
      using (
        exists (
          select 1
          from public.projects
          where projects.id = project_share_links.project_id
            and projects.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.projects
          where projects.id = project_share_links.project_id
            and projects.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_agreement_versions'
      and policyname = 'Users can manage agreement versions for their projects'
  ) then
    create policy "Users can manage agreement versions for their projects"
      on public.project_agreement_versions
      for all
      using (
        exists (
          select 1
          from public.projects
          where projects.id = project_agreement_versions.project_id
            and projects.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.projects
          where projects.id = project_agreement_versions.project_id
            and projects.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_deliverables'
      and policyname = 'Users can manage deliverables for their projects'
  ) then
    create policy "Users can manage deliverables for their projects"
      on public.project_deliverables
      for all
      using (
        exists (
          select 1
          from public.projects
          where projects.id = project_deliverables.project_id
            and projects.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.projects
          where projects.id = project_deliverables.project_id
            and projects.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_payments'
      and policyname = 'Users can manage payments for their projects'
  ) then
    create policy "Users can manage payments for their projects"
      on public.project_payments
      for all
      using (
        exists (
          select 1
          from public.projects
          where projects.id = project_payments.project_id
            and projects.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.projects
          where projects.id = project_payments.project_id
            and projects.user_id = auth.uid()
        )
      );
  end if;
end $$;

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'suggestions',
    'project_updates',
    'project_activity',
    'project_share_links',
    'project_agreement_versions',
    'project_deliverables',
    'project_payments'
  )
order by tablename, policyname;
