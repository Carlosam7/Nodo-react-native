#!/bin/sh
set -eu
initdb -D /tmp/nodo-data >/dev/null
pg_ctl -D /tmp/nodo-data -o '-k /tmp -p 55432' -w start >/dev/null
trap 'pg_ctl -D /tmp/nodo-data -m fast -w stop >/dev/null' EXIT
psql -h /tmp -p 55432 -d postgres -f /tmp/smoke.sql >/dev/null
# Restaurar una postulación pendiente y conservar un cupo libre.
psql -h /tmp -p 55432 -d postgres -v ON_ERROR_STOP=1 -c "UPDATE applications SET status='pending'; UPDATE projects SET filled_spots=0;" >/dev/null
psql -h /tmp -p 55432 -d postgres -v ON_ERROR_STOP=1 >/tmp/first.log 2>&1 <<'SQL' &
BEGIN;
SELECT * FROM nodo_decidir_postulacion('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'accepted');
SELECT pg_sleep(2);
COMMIT;
SQL
first_pid=$!
# Esperar a que la primera transacción haya tomado el bloqueo, sin depender de tiempos arbitrarios.
while ! psql -h /tmp -p 55432 -d postgres -Atc "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND query LIKE '%pg_sleep(2)%' AND state = 'active')" | grep -q t; do
  if ! kill -0 "$first_pid" 2>/dev/null; then cat /tmp/first.log; exit 1; fi
done
if psql -h /tmp -p 55432 -d postgres -v ON_ERROR_STOP=1 -c "SELECT * FROM nodo_decidir_postulacion('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'accepted');" >/tmp/second.log 2>&1; then
  echo 'La segunda aceptación debía fallar'; exit 1
fi
wait "$first_pid"
grep -q 'No hay cupos disponibles' /tmp/second.log
psql -h /tmp -p 55432 -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  IF (SELECT count(*) FROM applications WHERE status = 'accepted') <> 1 OR
     (SELECT filled_spots FROM projects LIMIT 1) <> 1 THEN
    RAISE EXCEPTION 'La prueba concurrente dejó los cupos desajustados';
  END IF;
END $$;
SQL
echo 'Concurrencia y cupos: OK'
