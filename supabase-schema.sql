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
  add column if not exists cancelled_at timestamptz;

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
  profile_image_url text,
  profile_image_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_by_role text not null default 'freelancer'
    check (created_by_role in ('freelancer', 'client', 'system')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.project_payments
  add column if not exists currency text not null default 'GBP';

alter table public.change_payments
  add column if not exists currency text not null default 'GBP';

create index if not exists suggestions_project_id_created_at_idx
  on public.suggestions(project_id, created_at desc);

create index if not exists project_updates_project_id_created_at_idx
  on public.project_updates(project_id, created_at desc);

create index if not exists project_payments_project_id_created_at_idx
  on public.project_payments(project_id, created_at desc);

alter table public.freelancer_profiles enable row level security;

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
      and tablename = 'freelancer_profiles'
      and policyname = 'Users can update their own freelancer profile'
  ) then
    create policy "Users can update their own freelancer profile"
      on public.freelancer_profiles
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
