-- ============ ENUMS ============
create type public.app_role as enum ('admin_rh','rh','manager','auditeur','collaborateur');
create type public.integration_status as enum ('non_connecte','autorisation_requise','en_attente_autorisation','connecte_verifie','erreur');
create type public.proposal_status as enum ('en_attente','confirme','rejete');
create type public.rule_status as enum ('a_verifier','verifie','obsolete');

-- ============ ORGANIZATIONS / PROFILES / ROLES ============
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default 'MG',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.organizations to authenticated;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  full_name text not null default '',
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'collaborateur')
  on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create policy "org visible aux membres" on public.organizations for select to authenticated
using (id = public.current_org_id());
create policy "profil lisible par soi ou rh" on public.profiles for select to authenticated
using (id = auth.uid() or (org_id = public.current_org_id() and (public.has_role(auth.uid(),'admin_rh') or public.has_role(auth.uid(),'rh'))));
create policy "profil modifiable par soi" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());
create policy "roles lisibles par soi ou admin" on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(),'admin_rh'));

-- ============ EMPLOYEES ============
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  matricule text not null,
  full_name text not null,
  position text,
  department text,
  site text,
  manager_id uuid references public.employees(id) on delete set null,
  contract_type text,
  hired_on date,
  contract_end_on date,
  status text not null default 'actif',
  is_demo boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, matricule)
);
grant select, insert, update, delete on public.employees to authenticated;
grant all on public.employees to service_role;
alter table public.employees enable row level security;
create index employees_org_idx on public.employees(org_id);
create trigger employees_touch before update on public.employees for each row execute function public.update_updated_at_column();

create policy "employes lisibles dans l organisation" on public.employees for select to authenticated
using (org_id = public.current_org_id());
create policy "employes gerables par rh" on public.employees for all to authenticated
using (org_id = public.current_org_id() and (public.has_role(auth.uid(),'admin_rh') or public.has_role(auth.uid(),'rh')))
with check (org_id = public.current_org_id() and (public.has_role(auth.uid(),'admin_rh') or public.has_role(auth.uid(),'rh')));

-- données sensibles isolées
create table public.employee_sensitive (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references public.employees(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  category text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.employee_sensitive to authenticated;
grant all on public.employee_sensitive to service_role;
alter table public.employee_sensitive enable row level security;
create policy "sensible reserve admin rh" on public.employee_sensitive for all to authenticated
using (org_id = public.current_org_id() and public.has_role(auth.uid(),'admin_rh'))
with check (org_id = public.current_org_id() and public.has_role(auth.uid(),'admin_rh'));

-- ============ DOCUMENTS ============
create table public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  kind text not null,
  label text not null,
  storage_path text,
  sensitivity text not null default 'interne',
  expires_on date,
  is_missing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.employee_documents to authenticated;
grant all on public.employee_documents to service_role;
alter table public.employee_documents enable row level security;
create policy "documents lisibles rh" on public.employee_documents for select to authenticated
using (org_id = public.current_org_id() and (public.has_role(auth.uid(),'admin_rh') or public.has_role(auth.uid(),'rh')));
create policy "documents gerables rh" on public.employee_documents for all to authenticated
using (org_id = public.current_org_id() and (public.has_role(auth.uid(),'admin_rh') or public.has_role(auth.uid(),'rh')))
with check (org_id = public.current_org_id() and (public.has_role(auth.uid(),'admin_rh') or public.has_role(auth.uid(),'rh')));

create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  kind text not null,
  title text not null,
  body text not null,
  status text not null default 'brouillon',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.generated_documents to authenticated;
grant all on public.generated_documents to service_role;
alter table public.generated_documents enable row level security;
create policy "brouillons lisibles dans l organisation" on public.generated_documents for select to authenticated
using (org_id = public.current_org_id());
create policy "brouillons gerables par auteur rh" on public.generated_documents for all to authenticated
using (org_id = public.current_org_id() and created_by = auth.uid())
with check (org_id = public.current_org_id() and created_by = auth.uid());

-- ============ CONGES ============
create table public.leave_absences (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  type text not null,
  start_on date not null,
  end_on date not null,
  status text not null default 'en_attente',
  legal_rule_id uuid,
  comment text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_on >= start_on)
);
grant select, insert, update, delete on public.leave_absences to authenticated;
grant all on public.leave_absences to service_role;
alter table public.leave_absences enable row level security;
create policy "conges lisibles dans l organisation" on public.leave_absences for select to authenticated
using (org_id = public.current_org_id());
create policy "conges gerables rh" on public.leave_absences for all to authenticated
using (org_id = public.current_org_id() and (public.has_role(auth.uid(),'admin_rh') or public.has_role(auth.uid(),'rh')))
with check (org_id = public.current_org_id() and (public.has_role(auth.uid(),'admin_rh') or public.has_role(auth.uid(),'rh')));

-- ============ VEILLE JURIDIQUE ============
create table public.legal_sources (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  reference text,
  url text,
  is_official boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.legal_sources to authenticated;
grant all on public.legal_sources to service_role;
alter table public.legal_sources enable row level security;
create policy "sources lisibles" on public.legal_sources for select to authenticated using (true);

create table public.legal_rules (
  id uuid primary key default gen_random_uuid(),
  applies_to text not null,
  title text not null,
  statement text not null,
  source_id uuid references public.legal_sources(id) on delete set null,
  article text,
  status public.rule_status not null default 'a_verifier',
  confidence numeric(3,2) not null default 0.25,
  effective_on date,
  last_checked_on date,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (confidence >= 0 and confidence <= 1)
);
grant select, insert, update on public.legal_rules to authenticated;
grant all on public.legal_rules to service_role;
alter table public.legal_rules enable row level security;
create policy "regles lisibles" on public.legal_rules for select to authenticated using (true);
create policy "regles modifiables admin" on public.legal_rules for update to authenticated
using (public.has_role(auth.uid(),'admin_rh')) with check (public.has_role(auth.uid(),'admin_rh'));

create table public.legal_rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.legal_rules(id) on delete cascade,
  version integer not null,
  statement text not null,
  status public.rule_status not null default 'a_verifier',
  comment text,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);
grant select, insert on public.legal_rule_versions to authenticated;
grant all on public.legal_rule_versions to service_role;
alter table public.legal_rule_versions enable row level security;
create policy "versions lisibles" on public.legal_rule_versions for select to authenticated using (true);
create policy "versions ajoutables admin" on public.legal_rule_versions for insert to authenticated
with check (public.has_role(auth.uid(),'admin_rh'));

-- ============ TACHES / PROPOSITIONS ============
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  due_on date,
  assignee_id uuid references auth.users(id) on delete set null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;
create policy "taches de l organisation" on public.tasks for all to authenticated
using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

create table public.action_proposals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null,
  title text not null,
  analysis text not null,
  preview text not null,
  target text not null,
  legal_rule_ids uuid[] not null default '{}',
  requires_external_call boolean not null default false,
  effect jsonb,
  status public.proposal_status not null default 'en_attente',
  created_by uuid not null references auth.users(id),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.action_proposals to authenticated;
grant all on public.action_proposals to service_role;
alter table public.action_proposals enable row level security;
create policy "propositions de l organisation" on public.action_proposals for select to authenticated
using (org_id = public.current_org_id());
create policy "propositions creables" on public.action_proposals for insert to authenticated
with check (org_id = public.current_org_id() and created_by = auth.uid());
create policy "propositions decidables rh" on public.action_proposals for update to authenticated
using (org_id = public.current_org_id() and (public.has_role(auth.uid(),'admin_rh') or public.has_role(auth.uid(),'rh')))
with check (org_id = public.current_org_id());

-- ============ AUDIT (immuable) ============
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_label text,
  action text not null,
  resource text not null,
  sensitive boolean not null default false,
  success boolean not null default true,
  detail text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create index audit_logs_org_idx on public.audit_logs(org_id, created_at desc);
create policy "audit lisible admin et auditeur" on public.audit_logs for select to authenticated
using (org_id = public.current_org_id() and (public.has_role(auth.uid(),'admin_rh') or public.has_role(auth.uid(),'auditeur')));
create policy "audit ajoutable par les membres" on public.audit_logs for insert to authenticated
with check (org_id = public.current_org_id() and actor_id = auth.uid());

-- ============ PARAMETRES ============
create table public.settings (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  retention_days integer not null default 365,
  mask_sensitive_by_default boolean not null default true,
  demo_mode boolean not null default true,
  locale text not null default 'fr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "parametres lisibles" on public.settings for select to authenticated
using (org_id = public.current_org_id());
create policy "parametres modifiables admin" on public.settings for all to authenticated
using (org_id = public.current_org_id() and public.has_role(auth.uid(),'admin_rh'))
with check (org_id = public.current_org_id() and public.has_role(auth.uid(),'admin_rh'));

-- ============ INTEGRATIONS ============
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  status public.integration_status not null default 'non_connecte',
  account_label text,
  last_check_at timestamptz,
  last_check_ok boolean,
  last_check_detail text,
  authorized_by uuid references auth.users(id) on delete set null,
  authorized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, provider)
);
grant select on public.integrations to authenticated;
grant all on public.integrations to service_role;
alter table public.integrations enable row level security;
create policy "integrations lisibles" on public.integrations for select to authenticated
using (org_id = public.current_org_id());

create table public.integration_scopes (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  scope text not null,
  purpose text not null,
  is_write boolean not null default false,
  created_at timestamptz not null default now(),
  unique (provider, scope)
);
grant select on public.integration_scopes to authenticated;
grant all on public.integration_scopes to service_role;
alter table public.integration_scopes enable row level security;
create policy "scopes lisibles" on public.integration_scopes for select to authenticated using (true);

create table public.integration_health_checks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  ok boolean not null,
  http_status integer,
  detail text,
  checked_by uuid references auth.users(id) on delete set null,
  checked_at timestamptz not null default now()
);
grant select on public.integration_health_checks to authenticated;
grant all on public.integration_health_checks to service_role;
alter table public.integration_health_checks enable row level security;
create policy "tests de sante lisibles" on public.integration_health_checks for select to authenticated
using (org_id = public.current_org_id());

-- Jetons OAuth : serveur uniquement (aucun acces navigateur)
create table public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  account_label text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, provider)
);
grant all on public.integration_credentials to service_role;
alter table public.integration_credentials enable row level security;

create table public.oauth_states (
  state text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_verifier text,
  redirect_uri text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes'
);
grant all on public.oauth_states to service_role;
alter table public.oauth_states enable row level security;