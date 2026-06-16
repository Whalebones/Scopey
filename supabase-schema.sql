-- Scopey collaboration tables for client suggestions and shared image updates.
-- Run this in the Supabase SQL editor, then create a public storage bucket
-- named `scopey-uploads` or set SUPABASE_STORAGE_BUCKET to your chosen name.

create extension if not exists pgcrypto;

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

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  client_name text,
  created_at timestamp without time zone default now(),
  share_id text
);

create table if not exists public.scope_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text,
  price numeric
);

create table if not exists public.changes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text,
  price numeric,
  status text default 'pending'::text,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),
  updated_by text,
  paid boolean default false,
  paid_at timestamptz
);

create table if not exists public.processed_events (
  id text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.change_payments (
  id uuid primary key default gen_random_uuid(),
  change_id uuid references public.changes(id) on delete cascade,
  amount numeric not null,
  stripe_session_id text not null,
  created_at timestamptz default now()
);

alter table public.processed_events
  add column if not exists created_at timestamptz not null default now();

alter table public.scope_items
  add column if not exists created_at timestamptz not null default now();

alter table public.projects
  add column if not exists client_email text,
  add column if not exists currency text not null default 'GBP',
  add column if not exists status text not null default 'draft',
  add column if not exists agreement_summary text,
  add column if not exists agreement_scope text,
  add column if not exists agreement_exclusions text,
  add column if not exists agreement_timeline text,
  add column if not exists agreement_payment_terms text,
  add column if not exists agreement_revision_terms text,
  add column if not exists agreement_cancellation_terms text,
  add column if not exists agreement_snapshot jsonb,
  add column if not exists sent_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_by_name text,
  add column if not exists accepted_by_email text,
  add column if not exists final_approval_requested_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by_name text,
  add column if not exists completed_by_email text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_status_check'
  ) then
    alter table public.projects
      add constraint projects_status_check
      check (status in (
        'draft',
        'sent',
        'accepted',
        'in_progress',
        'awaiting_final_approval',
        'complete',
        'cancelled'
      ));
  end if;
end $$;

create table if not exists public.freelancer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  brand_name text not null default 'Freelancer',
  bio text,
  contact_email text,
  default_currency text not null default 'GBP',
  default_agreement_summary text,
  default_agreement_scope text,
  default_agreement_exclusions text,
  default_agreement_timeline text,
  default_agreement_payment_terms text,
  default_agreement_revision_terms text,
  default_agreement_cancellation_terms text,
  profile_image_url text,
  profile_image_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.freelancer_profiles
  add column if not exists contact_email text,
  add column if not exists default_currency text not null default 'GBP',
  add column if not exists default_agreement_summary text,
  add column if not exists default_agreement_scope text,
  add column if not exists default_agreement_exclusions text,
  add column if not exists default_agreement_timeline text,
  add column if not exists default_agreement_payment_terms text,
  add column if not exists default_agreement_revision_terms text,
  add column if not exists default_agreement_cancellation_terms text;

create table if not exists public.user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free'
    check (plan in ('free', 'pro', 'business')),
  subscription_status text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.policy_acceptances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now(),
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.policy_acceptances
  add column if not exists terms_version text,
  add column if not exists privacy_version text,
  add column if not exists accepted_at timestamptz not null default now(),
  add column if not exists user_agent text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_plans
  add column if not exists subscription_status text not null default 'free',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  details text,
  proposed_price numeric(10, 2),
  status text not null default 'suggested'
    check (status in ('suggested', 'accepted', 'declined', 'revised')),
  image_url text,
  image_name text,
  response_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_role text not null check (author_role in ('freelancer', 'client')),
  message text,
  image_url text,
  image_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_type text not null
    check (source_type in ('suggestion', 'update', 'deliverable', 'gallery', 'project', 'rights_artwork', 'rights_license')),
  source_id uuid,
  reporter_role text not null
    check (reporter_role in ('client', 'freelancer', 'visitor')),
  reporter_email text,
  reason text not null default 'policy'
    check (reason in ('copyright', 'privacy', 'abuse', 'illegal', 'policy', 'other')),
  details text not null,
  status text not null default 'open'
    check (status in ('open', 'reviewed', 'dismissed', 'resolved')),
  reviewer_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.content_reports
  add column if not exists reviewer_note text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  share_id text,
  reporter_role text not null default 'visitor'
    check (reporter_role in ('freelancer', 'client', 'visitor')),
  reporter_email text,
  category text not null default 'general'
    check (category in ('general', 'confusing', 'bug', 'client_flow', 'feature', 'pricing')),
  message text not null,
  page_url text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.project_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  payment_type text not null default 'custom'
    check (payment_type in ('deposit', 'milestone', 'final', 'custom')),
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'GBP',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled')),
  payment_method text not null default 'manual'
    check (payment_method in ('manual', 'stripe')),
  stripe_session_id text,
  invoice_number text,
  due_date date,
  created_by_role text not null default 'freelancer'
    check (created_by_role in ('freelancer', 'client', 'system')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.project_payments
  add column if not exists currency text not null default 'GBP',
  add column if not exists invoice_number text,
  add column if not exists due_date date;

alter table public.change_payments
  add column if not exists currency text not null default 'GBP';

create table if not exists public.agreement_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency text not null default 'GBP',
  agreement_summary text,
  agreement_scope text,
  agreement_exclusions text,
  agreement_timeline text,
  agreement_payment_terms text,
  agreement_revision_terms text,
  agreement_cancellation_terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_role text not null default 'system'
    check (actor_role in ('freelancer', 'client', 'system')),
  event_type text not null,
  title text not null,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.project_share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  access_code text,
  section text not null default 'all'
    check (section in ('all', 'agreement', 'scope', 'changes', 'payments', 'suggestions', 'updates', 'completion')),
  label text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.project_share_links
  add column if not exists access_code text;

create table if not exists public.project_agreement_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version_number integer not null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'superseded')),
  agreement_snapshot jsonb not null default '{}'::jsonb,
  created_by_role text not null default 'freelancer'
    check (created_by_role in ('freelancer', 'client', 'system')),
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_by_name text,
  accepted_by_email text,
  created_at timestamptz not null default now(),
  unique(project_id, version_number)
);

create table if not exists public.project_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  note text,
  file_url text,
  file_name text,
  status text not null default 'shared'
    check (status in ('shared', 'approved')),
  approved_at timestamptz,
  approved_by_name text,
  approved_by_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.rights_artworks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  image_ref text,
  source_commission_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rights_artworks
  add column if not exists description text,
  add column if not exists image_ref text,
  add column if not exists source_commission_id uuid,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.rights_licenses (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.rights_artworks(id) on delete cascade,
  client_name text not null,
  usage_type text not null
    check (usage_type in ('print', 'merchandise', 'digital', 'packaging', 'advertising', 'all_uses')),
  territory text not null
    check (territory in ('worldwide', 'uk', 'eu', 'north_america')),
  exclusive boolean not null default false,
  fee numeric(10, 2) not null default 0,
  currency text not null default 'GBP',
  start_date date not null,
  end_date date,
  notes text,
  acknowledged_conflict boolean not null default false,
  conflict_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

alter table public.rights_licenses
  add column if not exists notes text,
  add column if not exists acknowledged_conflict boolean not null default false,
  add column if not exists conflict_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter table public.projects
    drop constraint if exists projects_user_id_fkey;
  alter table public.projects
    add constraint projects_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete cascade;

  alter table public.scope_items
    drop constraint if exists scope_items_project_id_fkey;
  alter table public.scope_items
    add constraint scope_items_project_id_fkey
    foreign key (project_id)
    references public.projects(id)
    on delete cascade;

  alter table public.changes
    drop constraint if exists changes_project_id_fkey;
  alter table public.changes
    add constraint changes_project_id_fkey
    foreign key (project_id)
    references public.projects(id)
    on delete cascade;

  alter table public.change_payments
    drop constraint if exists change_payments_change_id_fkey;
  alter table public.change_payments
    add constraint change_payments_change_id_fkey
    foreign key (change_id)
    references public.changes(id)
    on delete cascade;

  alter table public.suggestions
    drop constraint if exists suggestions_project_id_fkey;
  alter table public.suggestions
    add constraint suggestions_project_id_fkey
    foreign key (project_id)
    references public.projects(id)
    on delete cascade;

  alter table public.project_updates
    drop constraint if exists project_updates_project_id_fkey;
  alter table public.project_updates
    add constraint project_updates_project_id_fkey
    foreign key (project_id)
    references public.projects(id)
    on delete cascade;

  alter table public.content_reports
    drop constraint if exists content_reports_project_id_fkey;
  alter table public.content_reports
    add constraint content_reports_project_id_fkey
    foreign key (project_id)
    references public.projects(id)
    on delete cascade;

  alter table public.project_payments
    drop constraint if exists project_payments_project_id_fkey;
  alter table public.project_payments
    add constraint project_payments_project_id_fkey
    foreign key (project_id)
    references public.projects(id)
    on delete cascade;

  alter table public.project_activity
    drop constraint if exists project_activity_project_id_fkey;
  alter table public.project_activity
    add constraint project_activity_project_id_fkey
    foreign key (project_id)
    references public.projects(id)
    on delete cascade;

  alter table public.project_share_links
    drop constraint if exists project_share_links_project_id_fkey;
  alter table public.project_share_links
    add constraint project_share_links_project_id_fkey
    foreign key (project_id)
    references public.projects(id)
    on delete cascade;

  alter table public.project_agreement_versions
    drop constraint if exists project_agreement_versions_project_id_fkey;
  alter table public.project_agreement_versions
    add constraint project_agreement_versions_project_id_fkey
    foreign key (project_id)
    references public.projects(id)
    on delete cascade;

  alter table public.project_deliverables
    drop constraint if exists project_deliverables_project_id_fkey;
  alter table public.project_deliverables
    add constraint project_deliverables_project_id_fkey
    foreign key (project_id)
    references public.projects(id)
    on delete cascade;

  alter table public.rights_artworks
    drop constraint if exists rights_artworks_source_commission_id_fkey;
  alter table public.rights_artworks
    add constraint rights_artworks_source_commission_id_fkey
    foreign key (source_commission_id)
    references public.projects(id)
    on delete set null;

  alter table public.rights_licenses
    drop constraint if exists rights_licenses_artwork_id_fkey;
  alter table public.rights_licenses
    add constraint rights_licenses_artwork_id_fkey
    foreign key (artwork_id)
    references public.rights_artworks(id)
    on delete cascade;
end $$;

create index if not exists suggestions_project_id_created_at_idx
  on public.suggestions(project_id, created_at desc);

create index if not exists project_updates_project_id_created_at_idx
  on public.project_updates(project_id, created_at desc);

create index if not exists content_reports_project_id_created_at_idx
  on public.content_reports(project_id, created_at desc);

create index if not exists content_reports_project_id_status_idx
  on public.content_reports(project_id, status);

create index if not exists beta_feedback_created_at_idx
  on public.beta_feedback(created_at desc);

create index if not exists beta_feedback_project_id_created_at_idx
  on public.beta_feedback(project_id, created_at desc);

create index if not exists beta_feedback_user_id_created_at_idx
  on public.beta_feedback(user_id, created_at desc);

create index if not exists project_payments_project_id_created_at_idx
  on public.project_payments(project_id, created_at desc);

create index if not exists agreement_templates_user_id_created_at_idx
  on public.agreement_templates(user_id, created_at desc);

create index if not exists user_plans_stripe_subscription_id_idx
  on public.user_plans(stripe_subscription_id);

create index if not exists policy_acceptances_accepted_at_idx
  on public.policy_acceptances(accepted_at desc);

create index if not exists project_activity_project_id_created_at_idx
  on public.project_activity(project_id, created_at desc);

create index if not exists project_share_links_project_id_created_at_idx
  on public.project_share_links(project_id, created_at desc);

create index if not exists project_agreement_versions_project_id_version_idx
  on public.project_agreement_versions(project_id, version_number desc);

create index if not exists project_deliverables_project_id_created_at_idx
  on public.project_deliverables(project_id, created_at desc);

create index if not exists rights_artworks_owner_id_updated_at_idx
  on public.rights_artworks(owner_id, updated_at desc);

create index if not exists rights_artworks_source_commission_id_idx
  on public.rights_artworks(source_commission_id);

create index if not exists rights_licenses_artwork_id_start_date_idx
  on public.rights_licenses(artwork_id, start_date desc);

create index if not exists projects_user_id_created_at_idx
  on public.projects(user_id, created_at desc);

create unique index if not exists projects_share_id_unique_idx
  on public.projects(share_id)
  where share_id is not null;

create index if not exists scope_items_project_id_created_at_idx
  on public.scope_items(project_id, created_at desc);

create index if not exists changes_project_id_created_at_idx
  on public.changes(project_id, created_at desc);

alter table public.projects enable row level security;
alter table public.scope_items enable row level security;
alter table public.changes enable row level security;
alter table public.change_payments enable row level security;
alter table public.processed_events enable row level security;
alter table public.freelancer_profiles enable row level security;
alter table public.user_plans enable row level security;
alter table public.policy_acceptances enable row level security;
alter table public.agreement_templates enable row level security;
alter table public.project_activity enable row level security;
alter table public.project_share_links enable row level security;
alter table public.project_agreement_versions enable row level security;
alter table public.project_deliverables enable row level security;
alter table public.content_reports enable row level security;
alter table public.beta_feedback enable row level security;
alter table public.rights_artworks enable row level security;
alter table public.rights_licenses enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can manage their own projects'
  ) then
    create policy "Users can manage their own projects"
      on public.projects
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'scope_items'
      and policyname = 'Users can manage scope items for their projects'
  ) then
    create policy "Users can manage scope items for their projects"
      on public.scope_items
      for all
      using (
        exists (
          select 1
          from public.projects
          where projects.id = scope_items.project_id
            and projects.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.projects
          where projects.id = scope_items.project_id
            and projects.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'changes'
      and policyname = 'Users can manage changes for their projects'
  ) then
    create policy "Users can manage changes for their projects"
      on public.changes
      for all
      using (
        exists (
          select 1
          from public.projects
          where projects.id = changes.project_id
            and projects.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.projects
          where projects.id = changes.project_id
            and projects.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'change_payments'
      and policyname = 'Users can read payments for their changes'
  ) then
    create policy "Users can read payments for their changes"
      on public.change_payments
      for select
      using (
        exists (
          select 1
          from public.changes
          join public.projects on projects.id = changes.project_id
          where changes.id = change_payments.change_id
            and projects.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'freelancer_profiles'
      and policyname = 'Users can read their own freelancer profile'
  ) then
    create policy "Users can read their own freelancer profile"
      on public.freelancer_profiles
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'freelancer_profiles'
      and policyname = 'Users can insert their own freelancer profile'
  ) then
    create policy "Users can insert their own freelancer profile"
      on public.freelancer_profiles
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_plans'
      and policyname = 'Users can read their own plan'
  ) then
    create policy "Users can read their own plan"
      on public.user_plans
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'policy_acceptances'
      and policyname = 'Users can read their own policy acceptance'
  ) then
    create policy "Users can read their own policy acceptance"
      on public.policy_acceptances
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'policy_acceptances'
      and policyname = 'Users can insert their own policy acceptance'
  ) then
    create policy "Users can insert their own policy acceptance"
      on public.policy_acceptances
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'policy_acceptances'
      and policyname = 'Users can update their own policy acceptance'
  ) then
    create policy "Users can update their own policy acceptance"
      on public.policy_acceptances
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'freelancer_profiles'
      and policyname = 'Users can update their own freelancer profile'
  ) then
    create policy "Users can update their own freelancer profile"
      on public.freelancer_profiles
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'agreement_templates'
      and policyname = 'Users can manage their agreement templates'
  ) then
    create policy "Users can manage their agreement templates"
      on public.agreement_templates
      for all
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

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'content_reports'
      and policyname = 'Users can manage reports for their projects'
  ) then
    create policy "Users can manage reports for their projects"
      on public.content_reports
      for all
      using (
        exists (
          select 1
          from public.projects
          where projects.id = content_reports.project_id
            and projects.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.projects
          where projects.id = content_reports.project_id
            and projects.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'rights_artworks'
      and policyname = 'Users can manage their rights artworks'
  ) then
    create policy "Users can manage their rights artworks"
      on public.rights_artworks
      for all
      using (auth.uid() = owner_id)
      with check (auth.uid() = owner_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'rights_licenses'
      and policyname = 'Users can manage licences for their rights artworks'
  ) then
    create policy "Users can manage licences for their rights artworks"
      on public.rights_licenses
      for all
      using (
        exists (
          select 1
          from public.rights_artworks
          where rights_artworks.id = rights_licenses.artwork_id
            and rights_artworks.owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.rights_artworks
          where rights_artworks.id = rights_licenses.artwork_id
            and rights_artworks.owner_id = auth.uid()
        )
      );
  end if;
end $$;
