-- Migración propuesta para Nodo: requiere ejecutarse en Roble para habilitar
-- chat y borrado lógico. Revisar y respaldar la base antes de aplicarla.
-- El borrado lógico conserva proyectos y filas relacionadas.
BEGIN;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.project_messages (
  _id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 1000),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Si ya existían la columna o la tabla, comprobar el contrato usado por la app.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects'
      AND column_name = 'deleted_at' AND data_type = 'timestamp with time zone'
  ) THEN
    RAISE EXCEPTION 'projects.deleted_at existe con un tipo incompatible';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('_id', 'uuid'), ('id', 'uuid'), ('project_id', 'uuid'),
      ('author_id', 'uuid'), ('author_name', 'text'), ('body', 'text'),
      ('created_at', 'timestamp with time zone')
    ) AS expected(name, type)
    LEFT JOIN information_schema.columns AS actual
      ON actual.table_schema = 'public' AND actual.table_name = 'project_messages'
      AND actual.column_name = expected.name AND actual.data_type = expected.type
    WHERE actual.column_name IS NULL OR actual.is_nullable <> 'NO'
  ) THEN
    RAISE EXCEPTION 'project_messages existe con columnas incompatibles';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS nodo_project_messages_project_time_idx
  ON public.project_messages (project_id, created_at, id);

COMMIT;
