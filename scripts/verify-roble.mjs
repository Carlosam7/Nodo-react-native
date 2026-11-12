import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';

const base = process.env.EXPO_PUBLIC_ROBLE_BASE_URL || 'https://roble-api.openlab.uninorte.edu.co';
const contract = process.env.EXPO_PUBLIC_ROBLE_CONTRACT_ID || 'nodo_a9a72e0eab';
const auth = `${base.replace(/\/+$/, '')}/auth/${contract}`;
const db = `${base.replace(/\/+$/, '')}/database/${contract}`;
const rolesOnly = process.argv.includes('--roles');
const identityOnly = process.argv.includes('--identity');

if (process.argv.includes('--help')) {
  console.log('Uso: node scripts/verify-roble.mjs');
  console.log('     node scripts/verify-roble.mjs --roles   Consulta los roles sin crear registros.');
  console.log('     node scripts/verify-roble.mjs --identity   Comprueba la identidad en una consulta guardada.');
  console.log('Solicita dos cuentas en la terminal y crea un proyecto y una postulación de prueba en Roble.');
  console.log('Comprueba permisos y observa los cambios entre las dos escrituras de aceptación.');
  console.log('Los registros de prueba permanecen en la base y se identifica su proyecto al final.');
  process.exit(0);
}
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error('Ejecuta este comando en una terminal interactiva para introducir las credenciales sin mostrarlas.');
  process.exit(1);
}

async function prompt(label, secret = false) {
  const sink = new Writable({ write(chunk, encoding, callback) { if (!secret) process.stdout.write(chunk); callback(); } });
  const rl = createInterface({ input: process.stdin, output: sink, terminal: true });
  if (secret) process.stdout.write(label);
  return new Promise((resolve) => rl.question(secret ? '' : label, (answer) => {
    rl.close();
    if (secret) process.stdout.write('\n');
    resolve(secret ? answer : answer.trim());
  }));
}
async function request(url, { token, method = 'GET', body } = {}) {
  const response = await fetch(url, {
    method,
    signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await response.json(); } catch { /* Una respuesta vacía también puede ser válida. */ }
  return { status: response.status, ok: response.ok, data };
}
async function login(label) {
  let email;
  do {
    email = await prompt(`Correo de ${label}: `);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log('Introduce un correo válido, por ejemplo nombre@correo.com.');
      email = '';
    }
  } while (!email);
  const password = await prompt(`Contraseña de ${label} (oculta): `, true);
  const result = await request(`${auth}/login`, { method: 'POST', body: { email, password } });
  if (!result.ok || !result.data?.accessToken) throw new Error(`No se pudo iniciar sesión con ${label} (HTTP ${result.status}).`);
  const token = result.data.accessToken;
  const me = await request(`${auth}/me`, { token });
  if (!me.ok) throw new Error(`No se pudo consultar la sesión de ${label} (HTTP ${me.status}).`);
  const user = me.data?.user || me.data;
  const id = user?.userId || user?.id || user?._id || user?.sub;
  if (!id) throw new Error(`Roble no devolvió el identificador de ${label}.`);
  return { token, id: String(id), role: typeof user?.role === 'string' ? user.role : null };
}
async function read(token, table, filters) {
  const query = new URLSearchParams({ tableName: table, ...filters });
  const result = await request(`${db}/read?${query}`, { token });
  if (!result.ok) throw new Error(`No se pudo leer ${table} (HTTP ${result.status}).`);
  const rows = Array.isArray(result.data) ? result.data : result.data?.data;
  if (!Array.isArray(rows)) throw new Error(`Respuesta inesperada al leer ${table}.`);
  return rows;
}
async function insert(token, tableName, record) {
  const result = await request(`${db}/insert-one`, { token, method: 'POST', body: { tableName, record } });
  if (!result.ok) throw new Error(`No se pudo crear el registro de prueba en ${tableName} (HTTP ${result.status}).`);
  return result.data;
}
async function update(token, tableName, recordId, updates) {
  return request(`${db}/update`, { token, method: 'PUT', body: { tableName, idColumn: '_id', idValue: recordId, updates } });
}
function recordId(row) { return row?._id || row?.id; }
function testResult(label, ok, detail = '') {
  console.log(`${ok ? 'OK' : 'ATENCIÓN'}: ${label}${detail ? ` — ${detail}` : ''}`);
}

let fixture = null;
try {
  if (rolesOnly || identityOnly) {
    console.log('Esta consulta usa las dos cuentas y no crea proyectos ni postulaciones.');
    console.log('Las contraseñas no se muestran ni se guardan.');
  } else {
    console.log('Esta prueba crea un proyecto y una postulación identificados como prueba en la base real.');
    console.log('Las contraseñas no se muestran ni se guardan. Los registros no se eliminan automáticamente.');
    const confirmed = await prompt('Escribe SI para continuar: ');
    if (confirmed.toUpperCase() !== 'SI') { console.log('Prueba cancelada.'); process.exit(0); }
  }
  const owner = await login('la cuenta líder');
  const applicant = await login('la cuenta postulante');
  if (owner.id === applicant.id) throw new Error('Se necesitan dos cuentas distintas.');

  if (identityOnly) {
    const queryName = 'nodo_diagnostico_identidad';
    const execute = (token) => request(`${db}/saved-queries/by-name/${queryName}/execute`, { token, method: 'POST', body: {} });
    const [ownerResult, applicantResult] = await Promise.all([execute(owner.token), execute(applicant.token)]);
    if (!ownerResult.ok || !applicantResult.ok) {
      throw new Error(`No se pudo ejecutar la consulta guardada (HTTP ${ownerResult.status} y ${applicantResult.status}). Comprueba el nombre y los permisos de la consulta.`);
    }
    const ownerRow = ownerResult.data?.rows?.[0];
    const applicantRow = applicantResult.data?.rows?.[0];
    if (!ownerRow || !applicantRow) throw new Error('La consulta guardada no devolvió la fila esperada.');
    const fields = ['jwt_sub', 'jwt_claims_sub', 'app_user_id', 'app_current_user_id', 'request_user_id', 'database_user'];
    const matching = fields.filter((field) => ownerRow[field] === owner.id && applicantRow[field] === applicant.id);
    console.log(`Campos que coinciden con la identidad autenticada en ambas sesiones: ${matching.length ? matching.join(', ') : 'ninguno'}`);
    console.log('Esta prueba es diagnóstica; una coincidencia debe verificarse como dato protegido del servidor antes de usarla para permisos.');
  } else if (rolesOnly) {
    console.log(`Rol de la cuenta líder: ${owner.role || 'no informado'}`);
    console.log(`Rol de la cuenta postulante: ${applicant.role || 'no informado'}`);
  } else {

  const projectId = randomUUID();
  const title = `PRUEBA AUTOMÁTICA ${projectId.slice(0, 8)}`;
  fixture = { projectId, title };
  await insert(owner.token, 'projects', {
    id: projectId, creator_id: owner.id, title, description: 'Proyecto de prueba para verificar permisos y cupos.',
    total_spots: 1, filled_spots: 0, status: 'idea', gradient_colors: '["0xFFC41230","0xFFFF6B6B"]', created_at: new Date().toISOString(),
  });
  console.log(`Proyecto de prueba creado: ${title} (${projectId})`);
  const projects = await read(owner.token, 'projects', { id: projectId });
  const project = projects.find((row) => String(row.id) === projectId);
  if (!recordId(project)) throw new Error('No se pudo recuperar el identificador interno del proyecto de prueba.');

  const unauthorized = await update(applicant.token, 'projects', recordId(project), { status: 'cerrado' });
  const afterAttempt = (await read(owner.token, 'projects', { id: projectId })).find((row) => String(row.id) === projectId);
  const unauthorizedChanged = afterAttempt?.status === 'cerrado';
  testResult('Un no líder no puede cambiar el estado del proyecto', !unauthorizedChanged && [401, 403, 404].includes(unauthorized.status), `respuesta HTTP ${unauthorized.status}${unauthorizedChanged ? ', el estado sí cambió' : ''}`);
  if (unauthorizedChanged) {
    const restored = await update(owner.token, 'projects', recordId(project), { status: 'idea' });
    if (!restored.ok) throw new Error('No se pudo restaurar el estado del proyecto de prueba.');
  }

  const applicationId = randomUUID();
  await insert(applicant.token, 'applications', {
    id: applicationId, project_id: projectId, applicant_id: applicant.id,
    motivation: 'Postulación de prueba.', experience: 'Prueba de integración.', status: 'pending', submitted_at: new Date().toISOString(),
  });
  const applications = await read(owner.token, 'applications', { project_id: projectId });
  const application = applications.find((row) => String(row.id) === applicationId);
  if (!recordId(application)) throw new Error('No se pudo recuperar la postulación de prueba.');
  testResult('El líder puede consultar la postulación', true);

  const unauthorizedDecision = await update(applicant.token, 'applications', recordId(application), { status: 'accepted' });
  const afterDecision = (await read(owner.token, 'applications', { project_id: projectId })).find((row) => String(row.id) === applicationId);
  const decisionChanged = afterDecision?.status === 'accepted';
  testResult('Un postulante no puede aceptar su propia solicitud', !decisionChanged && [401, 403, 404].includes(unauthorizedDecision.status), `respuesta HTTP ${unauthorizedDecision.status}${decisionChanged ? ', la solicitud sí cambió' : ''}`);
  if (decisionChanged) {
    const restored = await update(owner.token, 'applications', recordId(application), { status: 'pending' });
    if (!restored.ok) throw new Error('No se pudo restaurar la postulación de prueba.');
  }

  const accepted = await update(owner.token, 'applications', recordId(application), { status: 'accepted' });
  if (!accepted.ok) throw new Error(`El líder no pudo aceptar la postulación (HTTP ${accepted.status}).`);
  const midApplication = (await read(owner.token, 'applications', { project_id: projectId })).find((row) => String(row.id) === applicationId);
  const midProject = (await read(owner.token, 'projects', { id: projectId })).find((row) => String(row.id) === projectId);
  const intermediate = midApplication?.status === 'accepted' && Number(midProject?.filled_spots) === 0;
  console.log(intermediate
    ? 'ATENCIÓN: se observó una postulación aceptada con el cupo aún sin actualizar; las escrituras no son atómicas en este recorrido.'
    : 'SIN CONCLUIR: no se observó el estado intermedio; esta prueba no demuestra que las escrituras sean atómicas.');
  const updated = await update(owner.token, 'projects', recordId(project), { filled_spots: 1, updated_at: new Date().toISOString() });
  if (!updated.ok) throw new Error(`No se pudo actualizar el cupo de prueba (HTTP ${updated.status}).`);
  const endProject = (await read(owner.token, 'projects', { id: projectId })).find((row) => String(row.id) === projectId);
  const endApplication = (await read(owner.token, 'applications', { project_id: projectId })).find((row) => String(row.id) === applicationId);
  testResult('La aceptación y el cupo quedan guardados', endApplication?.status === 'accepted' && Number(endProject?.filled_spots) === 1);
  console.log('La prueba terminó. No verifica aceptaciones simultáneas entre dos postulantes.');
  }
} catch (error) {
  console.error(`La prueba se detuvo: ${error instanceof Error ? error.message : 'error inesperado'}`);
  process.exitCode = 1;
} finally {
  if (fixture) console.log(`Registro para identificar o retirar manualmente: ${fixture.title} (${fixture.projectId}).`);
}
