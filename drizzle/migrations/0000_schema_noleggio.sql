
create type public.app_role as enum ('admin','dipendente');
create type public.equipment_stato as enum ('disponibile','in_manutenzione','fuori_servizio');
create type public.order_stato as enum ('bozza','confermato','in_corso','completato','annullato');
create type public.employee_ruolo as enum ('magazziniere','tecnico_audio','tecnico_luci','autista');
create type public.task_tipo as enum ('preparazione','carico','consegna','montaggio','smontaggio','rientro_controllo');
create type public.task_stato as enum ('da_fare','in_corso','completato');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id,'admin');
  else
    insert into public.user_roles(user_id, role) values (new.id,'dipendente');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_role after insert on auth.users for each row execute function public.handle_new_user_role();

create table public.equipment_categories (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  icona text,
  colore text,
  zona text not null
);
create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.equipment_categories(id),
  nome text not null,
  marca text, modello text, numero_seriale text,
  stato equipment_stato not null default 'disponibile',
  zona_magazzino text,
  pos_x real not null default 0, pos_y real not null default 0, pos_z real not null default 0,
  prezzo_giornaliero numeric(10,2) not null default 0,
  note text, foto_url text,
  created_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  cliente_nome text not null, cliente_telefono text, cliente_email text,
  luogo_evento text,
  data_inizio date not null, data_fine date not null,
  stato order_stato not null default 'bozza',
  note text,
  created_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  unique(order_id, equipment_id)
);
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  nome text not null, cognome text not null,
  ruolo employee_ruolo not null,
  telefono text,
  attivo boolean not null default true
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  tipo task_tipo not null,
  data_ora timestamptz not null,
  stato task_stato not null default 'da_fare',
  note text
);

grant select, insert, update, delete on public.equipment_categories, public.equipment, public.orders, public.order_items, public.employees, public.tasks to authenticated;
grant all on public.equipment_categories, public.equipment, public.orders, public.order_items, public.employees, public.tasks to service_role;

alter table public.equipment_categories enable row level security;
alter table public.equipment enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.employees enable row level security;
alter table public.tasks enable row level security;

create policy "read cats" on public.equipment_categories for select to authenticated using (true);
create policy "admin cats" on public.equipment_categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "read eq" on public.equipment for select to authenticated using (true);
create policy "admin eq" on public.equipment for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "read orders" on public.orders for select to authenticated using (true);
create policy "admin orders" on public.orders for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "read items" on public.order_items for select to authenticated using (true);
create policy "admin items" on public.order_items for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "read employees" on public.employees for select to authenticated using (public.has_role(auth.uid(),'admin') or user_id = auth.uid());
create policy "admin employees" on public.employees for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "read tasks" on public.tasks for select to authenticated using (
  public.has_role(auth.uid(),'admin') or employee_id in (select id from public.employees where user_id = auth.uid()));
create policy "admin tasks" on public.tasks for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "employee update own tasks" on public.tasks for update to authenticated
  using (employee_id in (select id from public.employees where user_id = auth.uid()))
  with check (employee_id in (select id from public.employees where user_id = auth.uid()));

create or replace function public.check_order_item_conflict()
returns trigger language plpgsql security definer set search_path = public as $$
declare o record; c record; e record;
begin
  select * into o from public.orders where id = new.order_id;
  select * into e from public.equipment where id = new.equipment_id;
  if e.stato <> 'disponibile' then
    raise exception 'L''attrezzatura "%" non è disponibile (stato: %)', e.nome, e.stato;
  end if;
  select ord.* into c from public.order_items oi join public.orders ord on ord.id = oi.order_id
   where oi.equipment_id = new.equipment_id and ord.id <> new.order_id
     and ord.stato in ('confermato','in_corso')
     and ord.data_inizio <= o.data_fine and ord.data_fine >= o.data_inizio
   limit 1;
  if found then
    raise exception 'Conflitto: "%" è già noleggiato nell''ordine di % (% → %)', e.nome, c.cliente_nome, c.data_inizio, c.data_fine;
  end if;
  return new;
end $$;
create trigger order_item_conflict before insert or update on public.order_items for each row execute function public.check_order_item_conflict();

insert into public.equipment_categories(nome, icona, colore, zona) values
('Casse','speaker','#3b82f6','Zona Audio'),
('Subwoofer','speaker','#2563eb','Zona Audio'),
('Mixer','sliders','#06b6d4','Zona Audio'),
('Console DJ','disc','#a855f7','Zona DJ'),
('Luci Moving Head','lightbulb','#ec4899','Zona Luci'),
('Par LED','lightbulb','#f472b6','Zona Luci'),
('Laser','zap','#22d3ee','Zona Effetti'),
('Macchine del fumo','cloud','#94a3b8','Zona Effetti'),
('Strobo','zap','#facc15','Zona Effetti'),
('Cavi e accessori','cable','#64748b','Zona Accessori');

with spec(cat, n, marca, modello, prezzo) as (values
 ('Casse',10,'RCF','ART 745-A MK5',60),
 ('Subwoofer',6,'JBL','SRX828SP',80),
 ('Mixer',4,'Allen & Heath','SQ-6',120),
 ('Console DJ',6,'Pioneer DJ','CDJ-3000 + DJM-900NXS2',150),
 ('Luci Moving Head',10,'Martin','MAC Aura XB',70),
 ('Par LED',10,'Chauvet','COLORado 1 Solo',20),
 ('Laser',3,'Chauvet','Scorpion Storm RGBY',50),
 ('Macchine del fumo',4,'Chauvet','Hurricane Haze 4D',35),
 ('Strobo',4,'Martin','Atomic 3000 LED',40),
 ('Cavi e accessori',3,'Neutrik','Kit cavi XLR/powerCON',15)
)
insert into public.equipment(category_id, nome, marca, modello, numero_seriale, stato, zona_magazzino, prezzo_giornaliero)
select c.id, s.cat || ' ' || s.marca || ' #' || g, s.marca, s.modello,
  upper(left(replace(s.marca,' ',''),3)) || '-' || lpad((abs(hashtext(s.cat||g)) % 99999)::text,5,'0'),
  case when g = 3 and s.cat in ('Casse','Luci Moving Head') then 'in_manutenzione'::equipment_stato
       when g = 2 and s.cat = 'Par LED' then 'fuori_servizio'::equipment_stato
       else 'disponibile'::equipment_stato end,
  c.zona, s.prezzo
from spec s join public.equipment_categories c on c.nome = s.cat
cross join lateral generate_series(1, s.n) g;

with ranked as (
  select e.id, e.zona_magazzino, (row_number() over (partition by e.zona_magazzino order by c.nome, e.nome) - 1)::int as rn
  from public.equipment e join public.equipment_categories c on c.id = e.category_id
), zx(zona, x) as (values ('Zona Audio',-16),('Zona DJ',-8),('Zona Luci',0),('Zona Effetti',8),('Zona Accessori',16))
update public.equipment e set
  pos_x = zx.x + ((r.rn % 3) - 1) * 2.0,
  pos_y = ((r.rn / 3) % 3) * 1.6,
  pos_z = -6 + (r.rn / 9) * 3.0
from ranked r join zx on zx.zona = r.zona_magazzino where e.id = r.id;

insert into public.employees(nome, cognome, ruolo, telefono) values
('Marco','Rossi','magazziniere','+39 333 1112233'),
('Giulia','Bianchi','tecnico_audio','+39 340 2223344'),
('Luca','Ferrari','tecnico_luci','+39 347 3334455'),
('Sara','Esposito','tecnico_audio','+39 349 4445566'),
('Andrea','Romano','autista','+39 338 5556677');

insert into public.orders(cliente_nome, cliente_telefono, cliente_email, luogo_evento, data_inizio, data_fine, stato) values
('Matrimonio Conti','+39 331 000111','conti@example.it','Villa Erba, Cernobbio', current_date+1, current_date+2,'confermato'),
('Club Magazzini Generali','+39 02 555111','booking@magazzini.it','Milano', current_date+3, current_date+4,'confermato'),
('Festa aziendale TechCorp','+39 02 777222','eventi@techcorp.it','Fiera Milano City', current_date+5, current_date+6,'confermato'),
('Compleanno Greco','+39 345 222333','greco@example.it','Bergamo', current_date+7, current_date+7,'bozza'),
('Summer Beach Party','+39 339 888444','info@beachparty.it','Rimini', current_date+9, current_date+11,'confermato'),
('Concerto Piazza','+39 031 444555','comune@como.it','Piazza Duomo, Como', current_date+12, current_date+13,'confermato'),
('Laurea Moretti','+39 346 111999','moretti@example.it','Pavia', current_date+15, current_date+15,'bozza'),
('Festival Elettronica','+39 02 999000','fest@elettro.it','Parco Sempione, Milano', current_date+18, current_date+20,'confermato');

insert into public.order_items(order_id, equipment_id)
select o.id, e.id from (select id, row_number() over (order by data_inizio) rn from public.orders) o
join (select id, row_number() over (order by zona_magazzino, nome) rn from public.equipment where stato='disponibile') e
  on (e.rn % 8) = (o.rn % 8) and e.rn <= 48;

insert into public.tasks(order_id, employee_id, tipo, data_ora, stato)
select o.id, (select id from public.employees order by nome limit 1 offset (o.rn % 5)), t.tipo::task_tipo,
  (o.data_inizio::timestamp + t.off), 'da_fare'
from (select id, data_inizio, row_number() over (order by data_inizio) rn from public.orders) o
cross join (values ('preparazione', interval '-15 hours'), ('consegna', interval '10 hours'), ('montaggio', interval '12 hours')) t(tipo, off);
update public.tasks set employee_id = null where tipo = 'montaggio' and data_ora > current_date + 10;
