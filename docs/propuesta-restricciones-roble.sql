-- PROPUESTA PARA REVISIÓN: NO EJECUTAR TODAVÍA.
-- No resuelve los permisos de usuarios ni hace atómica la aceptación.
-- Precondiciones: ejecutar docs/preflight-roble.sql inmediatamente antes y
-- confirmar que no hay duplicados ni cupos inválidos; tomar respaldo del proyecto.
-- Estas sentencias pueden bloquear brevemente la escritura durante la validación.
-- Si una restricción no se puede crear, PostgreSQL revierte la transacción.
BEGIN;

ALTER TABLE public.applications
  ADD CONSTRAINT nodo_applications_project_applicant_unique
  UNIQUE (project_id, applicant_id);

ALTER TABLE public.projects
  ADD CONSTRAINT nodo_projects_capacity_check
  CHECK (total_spots >= 1 AND filled_spots IS NOT NULL
    AND filled_spots >= 0 AND filled_spots <= total_spots);

COMMIT;
