-- Create orders table for Asbestipro tilausvahvistus
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  kaupunki text not null,
  kaupunginosa text not null,
  osoite text not null,
  postinumero text,
  latitude double precision default 0,
  longitude double precision default 0,
  palvelu text not null,
  remontti text,
  aika timestamptz not null,
  hinta numeric(10,2) not null,
  nimi text not null,
  email text not null,
  puhelin text not null,
  payment_status text default 'pending',
  stripe_session_id text
);

-- Enable RLS
alter table orders enable row level security;

-- Allow service role full access (used by API routes)
create policy "Service role can do everything" on orders
  for all
  using (true)
  with check (true);
