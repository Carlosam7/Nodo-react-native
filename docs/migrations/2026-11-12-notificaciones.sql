-- Ejecutar en la consola de Roble tras revisar y respaldar la base.
-- Una notificación se conserva aun cuando su proyecto se oculte.
CREATE TABLE notifications (
  _id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  id uuid PRIMARY KEY,
  recipient_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone
);
