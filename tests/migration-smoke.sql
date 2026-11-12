\set ON_ERROR_STOP on
CREATE TABLE public.projects (id uuid PRIMARY KEY);
CREATE TABLE public.applications (project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE);
\i /tmp/migration.sql
\i /tmp/migration.sql
INSERT INTO public.projects (id) VALUES ('00000000-0000-4000-8000-000000000001');
INSERT INTO public.applications (project_id) VALUES ('00000000-0000-4000-8000-000000000001');
INSERT INTO public.project_messages (id, project_id, author_id, author_name, body)
VALUES ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'Prueba', 'Hola');
UPDATE public.projects SET deleted_at = now() WHERE id = '00000000-0000-4000-8000-000000000001';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'El proyecto no se archivó';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_messages) THEN
    RAISE EXCEPTION 'El borrado lógico eliminó mensajes';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.applications) THEN
    RAISE EXCEPTION 'El borrado lógico eliminó postulaciones';
  END IF;
  BEGIN
    INSERT INTO public.project_messages (id, project_id, author_id, author_name, body)
    VALUES ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'Prueba', '  ');
    RAISE EXCEPTION 'Se aceptó un mensaje vacío';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
UPDATE public.projects SET deleted_at = NULL WHERE id = '00000000-0000-4000-8000-000000000001';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE deleted_at IS NULL) THEN
    RAISE EXCEPTION 'No se restauró el proyecto';
  END IF;
END $$;
SELECT 'migración, conservación de datos y restauración: OK' AS resultado;
