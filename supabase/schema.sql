-- Run this in Supabase SQL Editor

-- Profiles (extends auth.users, one per user)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text not null check (role in ('center', 'player')),
  created_at timestamptz default now()
);

-- Squash centers
create table public.centers (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade unique not null,
  name text not null,
  address text,
  city text,
  phone text,
  description text,
  logo_url text,
  created_at timestamptz default now()
);

-- Players
create table public.players (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade unique not null,
  first_name text not null,
  last_name text not null,
  skill_level text default 'beginner' check (skill_level in ('beginner', 'intermediate', 'advanced')),
  avatar_url text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.centers enable row level security;
alter table public.players enable row level security;

-- Profiles: each user sees and edits only their own
create policy "profiles: own read" on public.profiles for select using (auth.uid() = id);
create policy "profiles: own insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);

-- Centers: public read, own write
create policy "centers: public read" on public.centers for select using (true);
create policy "centers: own insert" on public.centers for insert
  with check (profile_id = auth.uid());
create policy "centers: own update" on public.centers for update
  using (profile_id = auth.uid());

-- Players: public read, own write
create policy "players: public read" on public.players for select using (true);
create policy "players: own insert" on public.players for insert
  with check (profile_id = auth.uid());
create policy "players: own update" on public.players for update
  using (profile_id = auth.uid());

-- Trigger: auto-create profile after signup (optional, handled in app)
