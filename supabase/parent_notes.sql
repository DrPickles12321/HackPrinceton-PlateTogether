create table parent_notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  date date not null,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 1000),
  read_at timestamptz,
  created_at timestamptz default now(),
  unique (family_id, date)
);

create index on parent_notes (family_id);

alter table parent_notes enable row level security;
create policy "anon_all" on parent_notes
  for all to anon using (true) with check (true);

alter publication supabase_realtime add table parent_notes;
alter table parent_notes replica identity full;
