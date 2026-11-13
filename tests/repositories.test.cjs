const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, parent, ...rest);
};
Module._extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { RobleProjectRepository } = require('../src/features/projects/infrastructure/roble-project-repository.ts');
const { RobleApplicantRepository } = require('../src/features/applicants/infrastructure/roble-applicant-repository.ts');
const gradients = [['#AA0000', '#BB0000']];
const catalog = { readAll: async (table) => table === 'categories' ? { c1: 'CIENCIA' } : { s1: 'REACT' }, ensure: async (table) => table === 'categories' ? 'c1' : 's1' };
const row = { id: 'p1', _id: 'db-p1', title: 'Proyecto', description: 'Descripción', creator_id: 'u1', total_spots: 3, filled_spots: 1, status: 'idea' };

test('repositorio de proyectos combina categorías y habilidades con los datos de Roble', async () => {
  const db = { read: async (table) => ({ projects: [row], project_categories: [{ project_id: 'p1', category_id: 'c1' }], project_skills: [{ project_id: 'p1', skill_id: 's1' }] })[table] || [] };
  const [project] = await new RobleProjectRepository(db, catalog, gradients).fetchProjects();
  assert.equal(project.recordId, 'db-p1');
  assert.deepEqual(project.categories, ['CIENCIA']);
  assert.deepEqual(project.skills, ['REACT']);
  assert.equal(project.filledSpots, 1);
});

test('fallo principal de Roble se propaga y falla de catálogo se degrada', async () => {
  const db = { read: async (table) => { if (table === 'projects') throw new Error('sin conexión'); return []; } };
  const repo = new RobleProjectRepository(db, { ...catalog, readAll: async () => { throw new Error('sin catálogo'); } }, gradients);
  assert.deepEqual(await repo.fetchCategories(), ['TODAS']);
  await assert.rejects(repo.fetchProjects(), /sin conexión/);
});

test('la creación revierte el proyecto cuando falla asociar una categoría', async () => {
  const deleted = [];
  const db = { insert: async (table, data) => { if (table === 'projects') return { ...data, _id: 'record-1' }; throw new Error('falló relación'); }, delete: async (...args) => deleted.push(args) };
  const repo = new RobleProjectRepository(db, catalog, gradients);
  const draft = { title: 'Proyecto', description: 'Descripción extensa', totalSpots: 2, categories: ['CIENCIA'], skills: [] };
  await assert.rejects(repo.saveProject(draft, { id: 'u1' }), /falló relación/);
  assert.deepEqual(deleted, [['projects', 'record-1']]);
});

test('guardar cambios de proyecto utiliza el identificador interno', async () => {
  const calls = [];
  const repo = new RobleProjectRepository({ update: async (...args) => calls.push(args) }, catalog, gradients);
  await repo.saveProjectEdit('record-1', { title: 'Nuevo', description: 'Detalle actualizado', totalSpots: 2 });
  assert.equal(calls[0][0], 'projects');
  assert.equal(calls[0][1], 'record-1');
  assert.equal(calls[0][2].total_spots, 2);
});

test('repositorio de postulantes presenta perfiles y competencias asociadas', async () => {
  const db = { read: async (table) => ({ applications: [{ id: 'a1', _id: 'db-a1', project_id: 'p1', applicant_id: 'u1', status: 'accepted' }], users: [{ id: 'u1', name: 'Ana' }], user_skills: [{ user_id: 'u1', skill_id: 's1' }] })[table] || [] };
  const [applicant] = await new RobleApplicantRepository(db, catalog).fetchApplicantsByProject('p1');
  assert.equal(applicant.recordId, 'db-a1');
  assert.equal(applicant.name, 'Ana');
  assert.equal(applicant.status, 'accepted');
  assert.deepEqual(applicant.skills, ['REACT']);
});

test('errores al cargar postulaciones no se confunden con una lista vacía', async () => {
  const db = { read: async () => { throw new Error('Roble no disponible'); } };
  await assert.rejects(new RobleApplicantRepository(db, catalog).fetchMyApplications('u1'), /Roble no disponible/);
});

const { CatalogService } = require('../src/core/infrastructure/roble-catalog-repository.ts');
const { UserProfileService } = require('../src/core/infrastructure/roble-user-profile-repository.ts');

test('el catálogo almacena sus lecturas en memoria y permite refrescarlas', async () => {
  let reads = 0;
  const repository = new CatalogService({ read: async () => { reads++; return [{ id: 'c1', name: 'CIENCIA' }]; } });
  assert.deepEqual(await repository.readAll('categories'), { c1: 'CIENCIA' });
  await repository.readAll('categories');
  assert.equal(reads, 1);
  await repository.readAll('categories', true);
  assert.equal(reads, 2);
});

test('un fallo al crear perfil se informa y puede reintentarse', async () => {
  let reads = 0;
  let inserts = 0;
  const db = { read: async () => { reads++; return []; }, insert: async () => { inserts++; if (inserts === 1) throw new Error('no disponible'); } };
  const repository = new UserProfileService(db);
  const user = { id: 'u1', email: 'user@example.test', name: 'Usuario' };
  await assert.rejects(repository.ensureProfile(user), /no disponible/);
  await repository.ensureProfile(user);
  await repository.ensureProfile(user);
  assert.equal(inserts, 2);
  assert.ok(reads >= 3);
});

test('un perfil creado por otra solicitud se reconoce después de un conflicto', async () => {
  let identityReads = 0;
  const db = { read: async (table, filters) => filters?.id ? (++identityReads === 1 ? [] : [{ id: 'u1' }]) : [], insert: async () => { throw new Error('duplicate'); } };
  await new UserProfileService(db).ensureProfile({ id: 'u1', email: 'user@example.test', name: 'Usuario' });
  assert.equal(identityReads, 2);
});

test('el borrado lógico oculta proyectos archivados y conserva su fila', async () => {
  const writes = [];
  const archived = { ...row, deleted_at: '2026-11-12T00:00:00.000Z' };
  const db = { read: async (table) => table === 'projects' ? [archived] : [], update: async (...args) => writes.push(args) };
  const repo = new RobleProjectRepository(db, catalog, gradients);
  assert.deepEqual(await repo.fetchProjects(), []);
  assert.equal(await repo.fetchProjectById('p1'), null);
  await repo.archiveProject('db-p1');
  assert.equal(writes[0][0], 'projects');
  assert.equal(writes[0][1], 'db-p1');
  assert.ok(writes[0][2].deleted_at);
});

const { RobleChatRepository } = require('../src/features/chat/infrastructure/roble-chat-repository.ts');
test('el repositorio de chat filtra por proyecto y ordena los mensajes', async () => {
  const calls = [];
  const db = { read: async (...args) => { calls.push(args); return [
    { id: 'm2', project_id: 'p1', author_id: 'u2', body: 'Segundo', created_at: '2026-01-02T00:00:00Z' },
    { id: 'm1', project_id: 'p1', author_id: 'u1', body: 'Primero', created_at: '2026-01-01T00:00:00Z' },
  ]; } };
  const messages = await new RobleChatRepository(db).fetchMessages('p1');
  assert.deepEqual(calls, [['project_messages', { project_id: 'p1' }]]);
  assert.deepEqual(messages.map((item) => item.body), ['Primero', 'Segundo']);
});

test('el fallo al guardar un mensaje se propaga', async () => {
  const db = { insert: async () => { throw new Error('sin conexión'); } };
  await assert.rejects(new RobleChatRepository(db).saveMessage('p1', { id: 'u1', name: 'Ana' }, 'Hola'), /sin conexión/);
});

const { RobleNotificationRepository } = require('../src/features/notifications/infrastructure/roble-notification-repository.ts');
test('notificaciones consulta por destinatario, ordena y marca la fila interna', async () => {
  const calls = [];
  const db = {
    read: async (...args) => { calls.push(args); return [
      { id: 'old', _id: 'old-row', recipient_id: 'u1', project_id: 'p1', title: 'Anterior', kind: 'update', created_at: '2026-01-01T00:00:00Z' },
      { id: 'new', _id: 'new-row', recipient_id: 'u1', project_id: 'p1', title: 'Nueva', kind: 'application', created_at: '2026-02-01T00:00:00Z' },
    ]; },
    update: async (...args) => calls.push(args),
  };
  const repo = new RobleNotificationRepository(db);
  const items = await repo.list('u1');
  assert.deepEqual(calls[0], ['notifications', { recipient_id: 'u1' }]);
  assert.deepEqual(items.map((item) => item.id), ['new', 'old']);
  await repo.markRead(items[0].recordId);
  assert.equal(calls[1][0], 'notifications');
  assert.equal(calls[1][1], 'new-row');
  assert.ok(calls[1][2].read_at);
});
