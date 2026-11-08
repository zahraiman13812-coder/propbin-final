-- Run once in Supabase > SQL Editor.
-- IDs are strings because existing application users have string IDs.
create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  name text not null default '',
  email text not null default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  role text not null check (role in ('user', 'admin')),
  text text not null check (char_length(trim(text)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_by_user boolean not null default false,
  read_by_admin boolean not null default false
);

create index if not exists idx_support_threads_updated on public.support_threads(updated_at desc);
create index if not exists idx_support_messages_thread_created on public.support_messages(thread_id, created_at);

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;
-- No client policies: server-only access via SUPABASE_SECRET_KEY.
revoke all on public.support_threads from anon, authenticated;
revoke all on public.support_messages from anon, authenticated;
