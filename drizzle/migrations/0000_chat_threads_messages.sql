create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null,
  title text not null default 'Nouvelle conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  model text,
  created_at timestamptz not null default now()
);
create index chat_threads_owner_idx on public.chat_threads(owner_id, updated_at desc);
create index chat_messages_thread_idx on public.chat_messages(thread_id, created_at);

grant select, insert, update, delete on public.chat_threads to authenticated;
grant select, insert on public.chat_messages to authenticated;
grant all on public.chat_threads to service_role;
grant all on public.chat_messages to service_role;

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

create policy "conversations du proprietaire" on public.chat_threads for select to authenticated
  using (owner_id = auth.uid() and org_id = public.current_org_id());
create policy "creation conversation" on public.chat_threads for insert to authenticated
  with check (owner_id = auth.uid() and org_id = public.current_org_id());
create policy "maj conversation" on public.chat_threads for update to authenticated
  using (owner_id = auth.uid() and org_id = public.current_org_id())
  with check (owner_id = auth.uid() and org_id = public.current_org_id());
create policy "suppression conversation" on public.chat_threads for delete to authenticated
  using (owner_id = auth.uid() and org_id = public.current_org_id());

create policy "messages du proprietaire" on public.chat_messages for select to authenticated
  using (owner_id = auth.uid() and org_id = public.current_org_id());
create policy "ajout message" on public.chat_messages for insert to authenticated
  with check (owner_id = auth.uid() and org_id = public.current_org_id()
    and exists (select 1 from public.chat_threads t where t.id = thread_id and t.owner_id = auth.uid()));

create trigger chat_threads_touch before update on public.chat_threads
  for each row execute function public.update_updated_at_column();