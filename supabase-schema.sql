-- Scopey collaboration tables for client suggestions and shared image updates.
-- Run this in the Supabase SQL editor, then create a public storage bucket
-- named `scopey-uploads` or set SUPABASE_STORAGE_BUCKET to your chosen name.

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

alter table public.freelancer_profiles enable row level security;
alter table public.user_plans enable row level security;
alter table public.policy_acceptances enable row level security;
alter table public.agreement_templates enable row level security;
alter table public.project_activity enable row level security;
alter table public.project_share_links enable row level security;
alter table public.project_agreement_versions enable row level security;
alter table public.project_deliverables enable row level security;
alter table public.rights_artworks enable row level security;
alter table public.rights_licenses enable row level security;

do $$
begin
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
