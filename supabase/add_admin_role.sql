-- Rozszerz check constraint roli o 'admin'
alter table public.profiles
  drop constraint profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('center', 'player', 'admin'));

-- Admin widzi wszystkie profile, centra i zawodników
create policy "profiles: admin read all" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "centers: admin read all" on public.centers
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "players: admin read all" on public.players
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Ręcznie ustaw admina (podmień YOUR_USER_ID na UUID z auth.users)
-- insert into public.profiles (id, role) values ('YOUR_USER_ID', 'admin');
-- lub update istniejącego:
-- update public.profiles set role = 'admin' where id = 'YOUR_USER_ID';
