-- Consulta de solo lectura para guardar como nodo_diagnostico_identidad.
-- Solo devuelve identificadores de sesión y el rol de PostgreSQL; no devuelve tokens.
SELECT
  NULLIF(current_setting('request.jwt.claim.sub', true), '') AS jwt_sub,
  CASE
    WHEN COALESCE(current_setting('request.jwt.claims', true), '') LIKE '{%'
    THEN current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
    ELSE NULL
  END AS jwt_claims_sub,
  NULLIF(current_setting('app.user_id', true), '') AS app_user_id,
  NULLIF(current_setting('app.current_user_id', true), '') AS app_current_user_id,
  NULLIF(current_setting('request.user_id', true), '') AS request_user_id,
  current_user::text AS database_user;
