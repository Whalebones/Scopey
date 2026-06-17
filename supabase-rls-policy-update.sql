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
      ('freelancer_payment_accounts'),
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

create table if not exists public.freelancer_payment_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_provider text not null default 'manual'
    check (preferred_provider in ('manual', 'stripe', 'paypal')),
  stripe_account_id text,
  stripe_onboarding_complete boolean not null default false,
  stripe_charges_enabled boolean not null default false,
  stripe_payouts_enabled boolean not null default false,
  stripe_details_submitted boolean not null default false,
  stripe_requirements jsonb not null default '{}'::jsonb,
  paypal_email text,
  paypal_url text,
  paypal_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.freelancer_payment_accounts
  add column if not exists preferred_provider text not null default 'manual',
  add column if not exists stripe_account_id text,
  add column if not exists stripe_onboarding_complete boolean not null default false,
  add column if not exists stripe_charges_enabled boolean not null default false,
  add column if not exists stripe_payouts_enabled boolean not null default false,
  add column if not exists stripe_details_submitted boolean not null default false,
  add column if not exists stripe_requirements jsonb not null default '{}'::jsonb,
  add column if not exists paypal_email text,
  add column if not exists paypal_url text,
  add column if not exists paypal_enabled boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter table public.project_payments
    drop constraint if exists project_payments_payment_method_check;
  alter table public.project_payments
    add constraint project_payments_payment_method_check
    check (payment_method in ('manual', 'stripe', 'paypal'));
end $$;

create index if not exists freelancer_payment_accounts_stripe_account_id_idx
  on public.freelancer_payment_accounts(stripe_account_id);

alter table public.freelancer_payment_accounts enable row level security;
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
      and tablename = 'freelancer_payment_accounts'
      and policyname = 'Users can read their own payment account'
  ) then
    create policy "Users can read their own payment account"
      on public.freelancer_payment_accounts
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'freelancer_payment_accounts'
      and policyname = 'Users can insert their own payment account'
  ) then
    create policy "Users can insert their own payment account"
      on public.freelancer_payment_accounts
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'freelancer_payment_accounts'
      and policyname = 'Users can update their own payment account'
  ) then
    create policy "Users can update their own payment account"
      on public.freelancer_payment_accounts
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

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
    'freelancer_payment_accounts',
    'project_updates',
    'project_activity',
    'project_share_links',
    'project_agreement_versions',
    'project_deliverables',
    'project_payments'
  )
order by tablename, policyname;
