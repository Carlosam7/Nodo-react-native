\set ON_ERROR_STOP on
CREATE TABLE public.projects (id uuid PRIMARY KEY, total_spots integer NOT NULL, filled_spots integer, deleted_at timestamptz, updated_at timestamptz);
CREATE TABLE public.applications (id uuid PRIMARY KEY, project_id uuid REFERENCES public.projects(id), status text);
\i /tmp/decision.sql
INSERT INTO projects VALUES ('00000000-0000-0000-0000-000000000001', 1, 0, NULL, now());
INSERT INTO applications VALUES
 ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'pending'),
 ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'pending');
SELECT * FROM nodo_decidir_postulacion('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'accepted');
SELECT * FROM nodo_decidir_postulacion('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'accepted');
DO $$ BEGIN
  BEGIN
    PERFORM nodo_decidir_postulacion('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'accepted');
    RAISE EXCEPTION 'La aceptación con cupo lleno debía fallar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'No hay cupos disponibles' THEN RAISE; END IF;
  END;
  IF (SELECT filled_spots FROM projects LIMIT 1) <> 1 OR
     (SELECT status FROM applications WHERE id = '00000000-0000-0000-0000-000000000012') <> 'pending' THEN
    RAISE EXCEPTION 'Estado inconsistente después del rechazo';
  END IF;
END $$;
SELECT * FROM nodo_decidir_postulacion('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'rejected');
DO $$ BEGIN
  IF (SELECT filled_spots FROM projects LIMIT 1) <> 0 OR
     (SELECT status FROM applications WHERE id = '00000000-0000-0000-0000-000000000011') <> 'rejected' THEN
    RAISE EXCEPTION 'Estado inconsistente después de liberar el cupo';
  END IF;
END $$;
