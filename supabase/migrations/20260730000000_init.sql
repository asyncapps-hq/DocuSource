-- DocuSource schema v0.1 — pgvector + FTS + RLS
create extension if not exists "pgcrypto";
create extension if not exists "vector";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ai_enabled boolean not null default false,
  retention_days int not null default 90,
  created_at timestamptz not null default now()
);

create table public.memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer')),
  primary key (workspace_id, user_id)
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  mime text not null,
  storage_path text,
  status text not null default 'pending' check (status in ('pending','processing','ready','failed')),
  checksum text not null,
  content text,
  parse_warnings jsonb not null default '[]'::jsonb,
  version int not null default 1,
  supersedes_id uuid references public.documents(id),
  created_at timestamptz not null default now()
);

create table public.document_collections (
  document_id uuid not null references public.documents(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  primary key (document_id, collection_id)
);

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ordinal int not null,
  content text not null,
  start_offset int not null,
  end_offset int not null,
  heading_path text not null default '',
  embedding vector(384),
  content_tsv tsvector generated always as (to_tsvector('english', content)) stored,
  token_estimate int,
  table_dense boolean not null default false
);

create index chunks_embedding_idx on public.chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index chunks_tsv_idx on public.chunks using gin (content_tsv);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  retrieval jsonb,
  model text,
  provider text,
  created_at timestamptz not null default now()
);

create table public.query_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  latency_ms int,
  hit_count int not null default 0,
  refused boolean not null default false,
  ai_used boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token_hash text not null unique,
  label text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

create or replace function public.match_chunks(
  query_embedding vector(384),
  match_count int default 8,
  filter_workspace uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  start_offset int,
  end_offset int,
  heading_path text,
  score float
) language sql stable as $$
  select c.id, c.document_id, c.content, c.start_offset, c.end_offset, c.heading_path,
         1 - (c.embedding <=> query_embedding) as score
  from public.chunks c
  where c.embedding is not null
    and (filter_workspace is null or c.workspace_id = filter_workspace)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.hybrid_match_chunks(
  query_embedding vector(384),
  query_text text,
  match_count int default 8,
  filter_workspace uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  start_offset int,
  end_offset int,
  heading_path text,
  score float
) language sql stable as $$
  with dense as (
    select c.id, 1 - (c.embedding <=> query_embedding) as dense_score,
           row_number() over (order by c.embedding <=> query_embedding) as rnk
    from public.chunks c
    where c.embedding is not null
      and (filter_workspace is null or c.workspace_id = filter_workspace)
    order by c.embedding <=> query_embedding
    limit match_count * 2
  ),
  sparse as (
    select c.id, ts_rank(c.content_tsv, websearch_to_tsquery('english', query_text)) as sparse_score,
           row_number() over (order by ts_rank(c.content_tsv, websearch_to_tsquery('english', query_text)) desc) as rnk
    from public.chunks c
    where c.content_tsv @@ websearch_to_tsquery('english', query_text)
      and (filter_workspace is null or c.workspace_id = filter_workspace)
    order by sparse_score desc
    limit match_count * 2
  ),
  fused as (
    select coalesce(d.id, s.id) as id,
           coalesce(1.0 / (60 + d.rnk), 0) + coalesce(1.0 / (60 + s.rnk), 0) as score
    from dense d
    full outer join sparse s on d.id = s.id
  )
  select c.id, c.document_id, c.content, c.start_offset, c.end_offset, c.heading_path, f.score::float
  from fused f
  join public.chunks c on c.id = f.id
  order by f.score desc
  limit match_count;
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.collections enable row level security;
alter table public.documents enable row level security;
alter table public.document_collections enable row level security;
alter table public.chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.query_events enable row level security;
alter table public.share_links enable row level security;
alter table public.api_tokens enable row level security;

create policy profiles_self on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy ws_member on public.workspaces for select using (public.is_workspace_member(id));
create policy mem_member on public.memberships for select using (public.is_workspace_member(workspace_id));
create policy col_member on public.collections for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy docs_member on public.documents for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy chunks_member on public.chunks for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy conv_member on public.conversations for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy msg_via_conv on public.messages for all using (
  exists (select 1 from public.conversations c where c.id = conversation_id and public.is_workspace_member(c.workspace_id))
) with check (
  exists (select 1 from public.conversations c where c.id = conversation_id and public.is_workspace_member(c.workspace_id))
);
create policy qe_member on public.query_events for select using (public.is_workspace_member(workspace_id));
create policy share_member on public.share_links for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy tok_member on public.api_tokens for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
