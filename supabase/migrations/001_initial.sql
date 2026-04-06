-- trips
create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled Trip',
  min_stars integer not null default 3 check (min_stars between 1 and 5),
  status text not null default 'draft' check (status in ('draft','searching','complete','error')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- travelers
create table travelers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  address text,
  home_airport text not null
);
create index idx_travelers_trip on travelers(trip_id);

-- candidate_cities
create table candidate_cities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  city_name text not null,
  city_state text not null,
  airports text[] not null
);
create index idx_candidate_cities_trip on candidate_cities(trip_id);

-- date_ranges
create table date_ranges (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  check_in date not null,
  check_out date not null,
  label text,
  source text not null default 'manual' check (source in ('manual','freehand'))
);
create index idx_date_ranges_trip on date_ranges(trip_id);

-- search_results
create table search_results (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  city_name text not null,
  date_range_id uuid references date_ranges(id) on delete cascade,
  check_in date not null,
  check_out date not null,
  hotel_cost_per_night numeric(10,2),
  hotel_name text,
  hotel_total numeric(10,2),
  total_flight_cost numeric(10,2),
  total_cost numeric(10,2)
);
create index idx_search_results_trip on search_results(trip_id);
create index idx_search_results_cost on search_results(trip_id, total_cost);

-- flight_quotes
create table flight_quotes (
  id uuid primary key default gen_random_uuid(),
  search_result_id uuid not null references search_results(id) on delete cascade,
  traveler_id uuid not null references travelers(id) on delete cascade,
  departure_airport text not null,
  arrival_airport text not null,
  outbound_date date not null,
  return_date date not null,
  price numeric(10,2),
  airline text
);
create index idx_flight_quotes_result on flight_quotes(search_result_id);

-- search_progress
create table search_progress (
  trip_id uuid primary key references trips(id) on delete cascade,
  total_tasks integer default 0,
  completed_tasks integer default 0,
  current_task text,
  updated_at timestamptz default now()
);

-- RLS policies (permissive for v1 - no auth)
alter table trips enable row level security;
alter table travelers enable row level security;
alter table candidate_cities enable row level security;
alter table date_ranges enable row level security;
alter table search_results enable row level security;
alter table flight_quotes enable row level security;
alter table search_progress enable row level security;

create policy "Allow all on trips" on trips for all using (true) with check (true);
create policy "Allow all on travelers" on travelers for all using (true) with check (true);
create policy "Allow all on candidate_cities" on candidate_cities for all using (true) with check (true);
create policy "Allow all on date_ranges" on date_ranges for all using (true) with check (true);
create policy "Allow all on search_results" on search_results for all using (true) with check (true);
create policy "Allow all on flight_quotes" on flight_quotes for all using (true) with check (true);
create policy "Allow all on search_progress" on search_progress for all using (true) with check (true);
