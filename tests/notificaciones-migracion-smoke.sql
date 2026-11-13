\set ON_ERROR_STOP on
CREATE TABLE projects (id uuid PRIMARY KEY);
\i /tmp/notificaciones.sql
INSERT INTO projects VALUES ('00000000-0000-0000-0000-000000000001');
INSERT INTO notifications (id, recipient_id, project_id, title, body, kind)
VALUES ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'Título', 'Mensaje', 'application');
UPDATE notifications SET read_at = now() WHERE id = '00000000-0000-0000-0000-000000000011';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM notifications WHERE _id IS NOT NULL AND read_at IS NOT NULL) THEN
   RAISE EXCEPTION 'No se guardó la notificación';
 END IF;
END $$;
