ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS descrizione_evento text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS persone_richieste integer NOT NULL DEFAULT 1;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email text;

CREATE TABLE public.vans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  targa text,
  attivo boolean NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vans TO authenticated;
GRANT ALL ON public.vans TO service_role;
ALTER TABLE public.vans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read vans" ON public.vans FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin vans" ON public.vans FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.vans (nome, targa) VALUES
 ('Furgone 1 – Ducato','FG 101 AA'),('Furgone 2 – Ducato','FG 202 BB'),
 ('Furgone 3 – Transit','FG 303 CC'),('Furgone 4 – Sprinter','FG 404 DD');

CREATE TYPE public.assignment_stato AS ENUM ('in_attesa','accettato','rifiutato');

CREATE TABLE public.order_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  van_id uuid REFERENCES public.vans(id),
  compenso numeric NOT NULL DEFAULT 0,
  stato public.assignment_stato NOT NULL DEFAULT 'in_attesa',
  motivo_rifiuto text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (order_id, employee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_assignments TO authenticated;
GRANT ALL ON public.order_assignments TO service_role;
ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin assignments" ON public.order_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "read own assignments" ON public.order_assignments FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titolo text NOT NULL,
  messaggio text,
  link text,
  letta boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- notify employee on new assignment
CREATE OR REPLACE FUNCTION public.notify_assignment_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare emp record; o record;
begin
  select * into emp from employees where id = new.employee_id;
  select * into o from orders where id = new.order_id;
  if emp.user_id is not null then
    insert into notifications(user_id, titolo, messaggio, link)
    values (emp.user_id, 'Nuovo lavoro assegnato',
      coalesce(o.luogo_evento,'Evento') || ' · ' || to_char(o.data_inizio,'DD/MM/YYYY') || ' · compenso € ' || new.compenso,
      '/miei-lavori');
  end if;
  return new;
end $$;
CREATE TRIGGER on_assignment_created AFTER INSERT ON public.order_assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_created();

-- employee responds
CREATE OR REPLACE FUNCTION public.respond_assignment(_id uuid, _accetta boolean, _motivo text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare a record; emp record; o record; adm record;
begin
  select * into a from order_assignments where id = _id;
  if not found then raise exception 'Assegnazione non trovata'; end if;
  select * into emp from employees where id = a.employee_id;
  if emp.user_id is distinct from auth.uid() then raise exception 'Non autorizzato'; end if;
  if a.stato <> 'in_attesa' then raise exception 'Hai già risposto a questa assegnazione'; end if;
  update order_assignments set stato = case when _accetta then 'accettato'::assignment_stato else 'rifiutato'::assignment_stato end,
    motivo_rifiuto = case when _accetta then null else _motivo end, responded_at = now() where id = _id;
  select * into o from orders where id = a.order_id;
  for adm in select user_id from user_roles where role = 'admin' loop
    insert into notifications(user_id, titolo, messaggio, link)
    values (adm.user_id,
      emp.nome || ' ' || emp.cognome || case when _accetta then ' ha accettato' else ' ha rifiutato' end,
      o.cliente_nome || ' · ' || coalesce(o.luogo_evento,'') || ' · ' || to_char(o.data_inizio,'DD/MM/YYYY')
        || case when not _accetta and _motivo is not null and _motivo <> '' then ' — ' || _motivo else '' end,
      '/ordini');
  end loop;
end $$;
REVOKE EXECUTE ON FUNCTION public.respond_assignment(uuid, boolean, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.respond_assignment(uuid, boolean, text) TO authenticated;