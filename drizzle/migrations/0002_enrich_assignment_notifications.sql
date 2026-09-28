CREATE OR REPLACE FUNCTION public.notify_assignment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  emp record;
  o record;
  material_count integer;
BEGIN
  SELECT * INTO emp FROM employees WHERE id = new.employee_id;
  SELECT * INTO o FROM orders WHERE id = new.order_id;
  SELECT count(*) INTO material_count FROM order_items WHERE order_id = new.order_id;

  IF emp.user_id IS NOT NULL THEN
    INSERT INTO notifications(user_id, titolo, messaggio, link)
    VALUES (
      emp.user_id,
      'Nuovo lavoro assegnato',
      coalesce(o.luogo_evento, 'Luogo da definire') || ' · ' ||
      to_char(o.data_inizio, 'DD/MM/YYYY') || ' · ' ||
      material_count || CASE WHEN material_count = 1 THEN ' articolo' ELSE ' articoli' END || ' · compenso € ' || new.compenso,
      '/miei-lavori'
    );
  END IF;
  RETURN new;
END
$function$;