-- PROPUESTA para PostgreSQL. No aplicar en Roble hasta confirmar que admite
-- crear y ejecutar funciones. No implementa autorización de servidor.
CREATE OR REPLACE FUNCTION public.nodo_decidir_postulacion(
  p_project_id uuid,
  p_application_id uuid,
  p_status text
) RETURNS TABLE (application_status text, filled_spots integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total integer;
  v_current_status text;
  v_accepted integer;
  v_new_total integer;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Estado de postulación inválido';
  END IF;

  -- Todas las decisiones del mismo proyecto esperan el mismo bloqueo.
  SELECT p.total_spots INTO v_total
  FROM public.projects p
  WHERE p.id = p_project_id AND p.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proyecto no encontrado';
  END IF;

  SELECT a.status INTO v_current_status
  FROM public.applications a
  WHERE a.id = p_application_id AND a.project_id = p_project_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Postulación no encontrada para el proyecto';
  END IF;
  IF v_current_status IS NULL OR v_current_status NOT IN ('pending', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Estado previo de postulación inválido';
  END IF;

  SELECT COUNT(*)::integer INTO v_accepted
  FROM public.applications a
  WHERE a.project_id = p_project_id AND a.status = 'accepted';
  v_new_total := v_accepted
    + CASE WHEN p_status = 'accepted' AND v_current_status <> 'accepted' THEN 1 ELSE 0 END
    - CASE WHEN p_status = 'rejected' AND v_current_status = 'accepted' THEN 1 ELSE 0 END;

  IF v_new_total > v_total THEN
    RAISE EXCEPTION 'No hay cupos disponibles';
  END IF;

  UPDATE public.applications SET status = p_status WHERE id = p_application_id;
  UPDATE public.projects SET filled_spots = v_new_total, updated_at = now() WHERE id = p_project_id;
  RETURN QUERY SELECT p_status, v_new_total;
END;
$$;
