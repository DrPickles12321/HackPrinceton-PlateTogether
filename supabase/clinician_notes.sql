create table clinician_notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  slot_id uuid references meal_slots(id) on delete set null,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 1000),
  created_at timestamptz default now(),
  is_read boolean not null default false
);

create index on clinician_notes (family_id);
create index on clinician_notes (slot_id);

alter table clinician_notes enable row level security;
create policy "anon_all" on clinician_notes
  for all to anon using (true) with check (true);

alter publication supabase_realtime add table clinician_notes;
alter table clinician_notes replica identity full;
