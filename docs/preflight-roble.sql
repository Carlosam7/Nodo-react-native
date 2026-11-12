-- Solo lectura: cuenta anomalías sin mostrar proyectos ni usuarios individuales.
WITH aceptados AS (
  SELECT project_id, COUNT(*) AS total
  FROM public.applications
  WHERE status = 'accepted'
  GROUP BY project_id
), duplicados AS (
  SELECT project_id, applicant_id
  FROM public.applications
  GROUP BY project_id, applicant_id
  HAVING COUNT(*) > 1
)
SELECT
  (SELECT COUNT(*) FROM duplicados) AS grupos_postulaciones_duplicadas,
  (SELECT COUNT(*) FROM public.applications a
   JOIN public.projects p ON p.id = a.project_id
   WHERE a.applicant_id = p.creator_id) AS autopostulaciones,
  (SELECT COUNT(*) FROM public.projects
   WHERE total_spots < 1 OR filled_spots IS NULL OR filled_spots < 0
      OR filled_spots > total_spots) AS proyectos_con_cupos_invalidos,
  (SELECT COUNT(*) FROM public.projects p
   LEFT JOIN aceptados a ON a.project_id = p.id
   WHERE p.filled_spots IS DISTINCT FROM COALESCE(a.total, 0)) AS proyectos_con_cupos_descuadrados,
  (SELECT COUNT(*) FROM public.applications
   WHERE status IS NULL OR status NOT IN ('pending', 'accepted', 'rejected')) AS postulaciones_con_estado_no_estandar;
