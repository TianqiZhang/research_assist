begin;

create table if not exists users (
  id uuid primary key,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assistants (
  id uuid primary key,
  user_id uuid not null references users(id),
  name text not null,
  description text not null,
  arxiv_categories text[] not null default array['cs.AI', 'cs.CL', 'cs.LG']::text[],
  schedule_cron text,
  timezone text not null default 'UTC',
  paper_count integer not null default 5 check (paper_count between 1 and 20),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assistants_user_id_idx on assistants(user_id);
create index if not exists assistants_active_schedule_idx on assistants(is_active, schedule_cron);

create table if not exists assistant_profiles (
  id uuid primary key,
  assistant_id uuid not null references assistants(id),
  version integer not null check (version > 0),
  prompt_version text not null,
  profile_json jsonb not null,
  raw_model_output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (assistant_id, version)
);

create index if not exists assistant_profiles_assistant_version_idx
  on assistant_profiles(assistant_id, version desc);

create table if not exists arxiv_papers (
  arxiv_id text primary key,
  title text not null,
  abstract text not null,
  authors text[] not null default array[]::text[],
  categories text[] not null default array[]::text[],
  primary_category text,
  published_at timestamptz not null,
  updated_at timestamptz,
  pdf_url text,
  abs_url text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  cached_at timestamptz not null default now()
);

create index if not exists arxiv_papers_published_at_idx on arxiv_papers(published_at desc);
create index if not exists arxiv_papers_categories_idx on arxiv_papers using gin(categories);

create table if not exists assistant_runs (
  id uuid primary key,
  assistant_id uuid not null references assistants(id),
  profile_id uuid references assistant_profiles(id),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  trigger_type text not null check (trigger_type in ('manual', 'scheduled', 'internal')),
  requested_by_user_id uuid references users(id),
  workflow_version text not null,
  started_at timestamptz,
  finished_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assistant_runs_assistant_created_idx
  on assistant_runs(assistant_id, created_at desc);
create index if not exists assistant_runs_status_idx on assistant_runs(status);

create table if not exists run_events (
  id uuid primary key,
  run_id uuid not null references assistant_runs(id),
  step text not null,
  level text not null default 'info' check (level in ('info', 'warn', 'error')),
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists run_events_run_created_idx on run_events(run_id, created_at);

create table if not exists run_candidates (
  id uuid primary key,
  run_id uuid not null references assistant_runs(id),
  arxiv_id text not null references arxiv_papers(arxiv_id),
  candidate_rank integer not null check (candidate_rank > 0),
  cheap_score numeric(6, 4) not null check (cheap_score >= 0),
  candidate_reason text not null,
  source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (run_id, arxiv_id),
  unique (run_id, candidate_rank)
);

create index if not exists run_candidates_run_rank_idx on run_candidates(run_id, candidate_rank);

create table if not exists run_scores (
  id uuid primary key,
  run_id uuid not null,
  arxiv_id text not null,
  prompt_version text not null,
  topic_relevance integer not null check (topic_relevance between 0 and 10),
  technical_quality integer not null check (technical_quality between 0 and 10),
  practical_value integer not null check (practical_value between 0 and 10),
  novelty integer not null check (novelty between 0 and 10),
  final_score numeric(4, 2) not null check (final_score between 0 and 10),
  should_include boolean not null,
  reason text not null,
  raw_model_output jsonb not null,
  model text,
  created_at timestamptz not null default now(),
  unique (run_id, arxiv_id),
  foreign key (run_id, arxiv_id) references run_candidates(run_id, arxiv_id)
);

create index if not exists run_scores_run_score_idx on run_scores(run_id, final_score desc);

create table if not exists digests (
  id uuid primary key,
  run_id uuid not null unique references assistant_runs(id),
  assistant_id uuid not null references assistants(id),
  markdown text not null,
  html text not null,
  selected_papers jsonb not null default '[]'::jsonb,
  candidate_count integer not null default 0 check (candidate_count >= 0),
  quality_check jsonb,
  digest_prompt_version text,
  quality_prompt_version text,
  raw_digest_output jsonb,
  raw_quality_output jsonb,
  email_status text not null default 'not_sent' check (email_status in ('not_sent', 'sent', 'failed', 'skipped')),
  email_provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists digests_assistant_created_idx on digests(assistant_id, created_at desc);

commit;
