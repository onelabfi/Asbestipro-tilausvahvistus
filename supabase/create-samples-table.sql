-- Create samples table for survey/sample collection per order
create table if not exists samples (
  id uuid default gen_random_uuid() primary key,
  order_id uuid not null references orders(id) on delete cascade,
  location text not null,
  photos text[] default '{}',
  notes text,
  asbestos_detected boolean,
  asbestos_type text,
  lab_notes text,
  created_at timestamptz default now()
);

-- Index for fast lookup by order
create index if not exists idx_samples_order on samples(order_id);

-- Enable RLS
alter table samples enable row level security;

-- Allow service role full access (used by API routes)
create policy "Service role can do everything" on samples
  for all
  using (true)
  with check (true);
