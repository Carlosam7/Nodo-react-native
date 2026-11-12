-- Diagnóstico de solo lectura para las tablas de proyectos y postulaciones.
-- No consulta filas de usuarios, correos, tokens ni contraseñas.
-- Ejecutar desde la consola SQL del proyecto Nodo.
SELECT jsonb_pretty(jsonb_build_object(
  'columnas', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'esquema', table_schema, 'tabla', table_name, 'columna', column_name,
      'tipo', data_type, 'nullable', is_nullable
    ) ORDER BY table_schema, table_name, ordinal_position)
    FROM information_schema.columns
    WHERE table_name IN ('projects', 'applications')
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
  ), '[]'::jsonb),
  'seguridad_por_fila', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'esquema', n.nspname, 'tabla', c.relname,
      'rls_habilitada', c.relrowsecurity, 'rls_forzada', c.relforcerowsecurity
    ) ORDER BY n.nspname, c.relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname IN ('projects', 'applications') AND c.relkind IN ('r', 'p')
  ), '[]'::jsonb),
  'politicas', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'esquema', schemaname, 'tabla', tablename, 'nombre', policyname,
      'comando', cmd, 'roles', roles, 'lectura', qual, 'escritura', with_check
    ) ORDER BY schemaname, tablename, policyname)
    FROM pg_policies WHERE tablename IN ('projects', 'applications')
  ), '[]'::jsonb),
  'restricciones', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'esquema', n.nspname, 'tabla', c.relname, 'nombre', k.conname,
      'tipo', k.contype, 'definicion', pg_get_constraintdef(k.oid)
    ) ORDER BY n.nspname, c.relname, k.conname)
    FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname IN ('projects', 'applications')
  ), '[]'::jsonb),
  'disparadores', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'esquema', n.nspname, 'tabla', c.relname, 'nombre', t.tgname,
      'definicion', pg_get_triggerdef(t.oid)
    ) ORDER BY n.nspname, c.relname, t.tgname)
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname IN ('projects', 'applications') AND NOT t.tgisinternal
  ), '[]'::jsonb)
)) AS diagnostico;
