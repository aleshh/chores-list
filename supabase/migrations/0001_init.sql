-- Chores app initial schema
create table if not exists children (
  id text primary key,
  name text not null
);

insert into children (id, name)
  values ('astrid','Astrid') on conflict (id) do nothing;
insert into children (id, name)
  values ('emilia','Emilia') on conflict (id) do nothing;

create table if not exists chores (
  id uuid primary key default gen_random_uuid(),
  child_id text not null references children(id) on delete cascade,
  title text not null,
  type text not null check (type in ('daily','weekly')),
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists chores_child_active_idx on chores(child_id, active);

create table if not exists checkoffs (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references chores(id) on delete cascade,
  done_at timestamptz not null default now()
);

create index if not exists checkoffs_chore_done_idx on checkoffs(chore_id, done_at);

create table if not exists settings (
  id int primary key default 1,
  trophy_threshold numeric not null default 0.95,
  apple_threshold numeric not null default 0.85
);

insert into settings (id) values (1) on conflict (id) do nothing;

