create extension if not exists pgcrypto;

drop table if exists meal_logs cascade;
drop table if exists meal_slots cascade;
drop table if exists food_items cascade;
drop table if exists users cascade;

create table users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('parent','clinician')),
  family_id uuid not null,
  created_at timestamptz default now()
);

create table food_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  name text not null,
  category text not null check (category in ('familiar','working_on','challenge')),
  created_at timestamptz default now()
);

create table meal_slots (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  day text not null check (day in ('mon','tue','wed','thu','fri','sat','sun')),
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  assigned_food_id uuid references food_items(id) on delete set null,
  created_at timestamptz default now(),
  unique (family_id, day, meal_type)
);

create table meal_logs (
  id uuid primary key default gen_random_uuid(),
  meal_slot_id uuid not null references meal_slots(id) on delete cascade,
  status text not null check (status in ('okay','difficult','refused')),
  note text,
  logged_at timestamptz default now()
);

create index on food_items (family_id);
create index on meal_slots (family_id);
create index on meal_logs (meal_slot_id);

alter table users enable row level security;
alter table food_items enable row level security;
alter table meal_slots enable row level security;
alter table meal_logs enable row level security;

create policy "anon_all" on users for all to anon using (true) with check (true);
create policy "anon_all" on food_items for all to anon using (true) with check (true);
create policy "anon_all" on meal_slots for all to anon using (true) with check (true);
create policy "anon_all" on meal_logs for all to anon using (true) with check (true);

alter publication supabase_realtime add table meal_slots;
alter publication supabase_realtime add table meal_logs;

do $$
declare
  demo_family_id uuid := '11111111-1111-1111-1111-111111111111';
begin
  insert into food_items (family_id, name, category) values
    (demo_family_id, 'Toast with butter', 'familiar'),
    (demo_family_id, 'Plain pasta', 'familiar'),
    (demo_family_id, 'Apple slices', 'familiar'),
    (demo_family_id, 'Cheese quesadilla', 'working_on'),
    (demo_family_id, 'Yogurt with granola', 'working_on'),
    (demo_family_id, 'Grilled chicken', 'working_on'),
    (demo_family_id, 'Pizza slice', 'challenge'),
    (demo_family_id, 'Ice cream', 'challenge'),
    (demo_family_id, 'Peanut butter sandwich', 'challenge');

  insert into meal_slots (family_id, day, meal_type)
  select
    demo_family_id,
    d.day,
    m.meal_type
  from
    unnest(array['mon','tue','wed','thu','fri','sat','sun']) as d(day),
    unnest(array['breakfast','lunch','dinner','snack']) as m(meal_type);
end $$;

select '11111111-1111-1111-1111-111111111111' as demo_family_id;
