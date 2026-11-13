const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '../src');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(root, request.slice(2));
  return resolve.call(this, request, parent, ...rest);
};
Module._extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  module._compile(result.outputText, filename);
};

const { submitApplication } = require('../src/features/applicants/application/submit-application.ts');
const { decideApplication } = require('../src/features/applicants/application/decide-application.ts');
const { publishUpdate } = require('../src/features/projects/application/publish-update.ts');
const project = { id: 'p1', recordId: 'r1', creatorId: 'owner', filledSpots: 0, totalSpots: 1 };
const user = { id: 'member', name: 'Member' };
const draft = { projectId: 'p1', motivation: 'Hi', experience: 'Skills', skills: [] };

test('una postulación duplicada no se guarda', async () => {
  let saved = false;
  const repository = { fetchProjectById: async () => project, hasApplication: async () => true, ensureProfile: async () => {}, saveApplication: async () => { saved = true; } };
  await assert.rejects(submitApplication(repository, draft, user, project), /Ya tienes/);
  assert.equal(saved, false);
});

test('solo el líder acepta y se actualiza el cupo', async () => {
  const writes = [];
  const repository = { updateApplicationStatus: async (...args) => writes.push(args), updateProjectSpots: async (...args) => writes.push(args) };
  const applicant = { id: 'a1', recordId: 'ar1', status: 'pending' };
  await assert.rejects(decideApplication(repository, { applicant, project, newStatus: 'accepted', actor: user }), /Solo el líder/);
  assert.equal(writes.length, 0);
  const result = await decideApplication(repository, { applicant, project, newStatus: 'accepted', actor: { id: 'owner' } });
  assert.equal(result.updatedFilledSpots, 1);
  assert.deepEqual(writes, [['ar1', 'accepted'], ['r1', 1]]);
});

test('un colaborador aceptado publica pero no cambia el estado', async () => {
  let saves = 0;
  const repository = { fetchProjectById: async () => project, fetchTeamMembers: async () => [{ userId: user.id, isCreator: false }], saveUpdate: async () => { saves++; return {}; }, updateProjectStatus: async () => {} };
  const input = { projectId: 'p1', author: user, title: 'Avance', body: 'Contenido', projectRecordId: 'r1' };
  await assert.rejects(publishUpdate(repository, { ...input, newStatus: 'cerrado' }), /Solo el líder/);
  assert.equal(saves, 0);
  await publishUpdate(repository, input);
  assert.equal(saves, 1);
});

test('rechazar a un miembro aceptado libera un cupo', async () => {
  const writes = [];
  const repository = { updateApplicationStatus: async (...args) => writes.push(args), updateProjectSpots: async (...args) => writes.push(args) };
  const result = await decideApplication(repository, {
    applicant: { recordId: 'ar1', status: 'accepted' },
    project: { ...project, filledSpots: 1 }, newStatus: 'rejected', actor: { id: 'owner' },
  });
  assert.equal(result.updatedFilledSpots, 0);
  assert.deepEqual(writes, [['ar1', 'rejected'], ['r1', 0]]);
});

test('no se acepta un postulante cuando los cupos están llenos', async () => {
  const writes = [];
  const repository = { updateApplicationStatus: async (...args) => writes.push(args), updateProjectSpots: async (...args) => writes.push(args) };
  await assert.rejects(decideApplication(repository, {
    applicant: { recordId: 'ar1', status: 'pending' },
    project: { ...project, filledSpots: 1 }, newStatus: 'accepted', actor: { id: 'owner' },
  }), /cupo/);
  assert.equal(writes.length, 0);
});

test('al publicar un avance el líder puede cambiar el estado', async () => {
  const writes = [];
  const repository = {
    fetchProjectById: async () => project, fetchTeamMembers: async () => [],
    saveUpdate: async () => { writes.push('update'); return {}; },
    updateProjectStatus: async (...args) => writes.push(args),
  };
  await publishUpdate(repository, { projectId: 'p1', projectRecordId: 'r1', author: { id: 'owner' }, title: 'A', body: 'B', newStatus: 'cerrado' });
  assert.deepEqual(writes, ['update', ['r1', 'cerrado']]);
});

const { editProject } = require('../src/features/projects/application/edit-project.ts');
test('solo el creador puede editar y los cupos no pueden ser menores que los ocupados', async () => {
  const writes = [];
  const repository = { fetchProjectById: async () => ({ ...project, filledSpots: 2 }), saveProjectEdit: async (...args) => writes.push(args) };
  const edit = { title: ' Proyecto ', description: ' Descripción extensa ', totalSpots: 1 };
  await assert.rejects(editProject(repository, 'p1', edit, user), /Solo el creador/);
  await assert.rejects(editProject(repository, 'p1', edit, { id: 'owner' }), /cupos/);
  assert.equal(writes.length, 0);
  await editProject(repository, 'p1', { ...edit, totalSpots: 3 }, { id: 'owner' });
  assert.deepEqual(writes, [['r1', { title: 'Proyecto', description: 'Descripción extensa', totalSpots: 3 }]]);
});

const { createProject } = require('../src/features/projects/application/create-project.ts');
const { changeProjectStatus } = require('../src/features/projects/application/change-project-status.ts');
const { loadProjectDetail } = require('../src/features/project-detail/application/load-project-detail.ts');
const { loadApplicants } = require('../src/features/applicants/application/load-applicants.ts');

test('crear un proyecto valida los datos antes de escribir', async () => {
  const calls = [];
  const repo = { ensureProfile: async () => calls.push('profile'), saveProject: async (value) => { calls.push(value); return value; } };
  const valid = { title: ' Proyecto ', description: ' Descripción suficiente ', categories: ['Ciencia'], totalSpots: 2, skills: [] };
  await assert.rejects(createProject(repo, { ...valid, categories: [] }, user), /categoría/);
  await assert.rejects(createProject(repo, { ...valid, totalSpots: 0 }, user), /cupos/);
  assert.deepEqual(calls, []);
  await createProject(repo, valid, user);
  assert.equal(calls[1].title, 'Proyecto');
  assert.equal(calls[1].description, 'Descripción suficiente');
});

test('solo el líder cambia el estado y se usa el identificador persistido', async () => {
  const writes = [];
  const repo = { fetchProjectById: async () => project, updateProjectStatus: async (...args) => writes.push(args) };
  await assert.rejects(changeProjectStatus(repo, 'p1', 'cerrado', user), /Solo el líder/);
  await changeProjectStatus(repo, 'p1', 'cerrado', { id: 'owner' });
  assert.deepEqual(writes, [['r1', 'cerrado']]);
});

test('el avance cambia el proyecto recuperado y no un identificador externo', async () => {
  const writes = [];
  const repo = { fetchProjectById: async () => project, fetchTeamMembers: async () => [], saveUpdate: async () => ({}), updateProjectStatus: async (...args) => writes.push(args) };
  await publishUpdate(repo, { projectId: 'p1', projectRecordId: 'otro', author: { id: 'owner' }, title: 'Avance', body: 'Texto', newStatus: 'cerrado' });
  assert.deepEqual(writes, [['r1', 'cerrado']]);
});

test('el detalle reúne los datos del proyecto y la postulación del usuario', async () => {
  const projects = { fetchProjectById: async () => project, fetchTeamMembers: async () => [{ userId: 'owner' }], fetchUpdates: async () => [{ id: 'u1' }] };
  const apps = { fetchMyApplications: async () => [{ projectId: 'other' }, { projectId: 'p1', status: 'pending' }] };
  const result = await loadProjectDetail(projects, apps, 'p1', 'member');
  assert.equal(result.myApplication.status, 'pending');
  assert.equal(result.members.length, 1);
  assert.equal(result.updates.length, 1);
});

test('la lista de postulantes solo se consulta para el líder', async () => {
  let reads = 0;
  const projects = { fetchProjectById: async () => project };
  const apps = { fetchApplicantsByProject: async () => { reads++; return [{ id: 'a1' }]; } };
  assert.deepEqual((await loadApplicants(projects, apps, 'p1', 'member')).applicants, []);
  assert.equal(reads, 0);
  assert.equal((await loadApplicants(projects, apps, 'p1', 'owner')).applicants.length, 1);
  assert.equal(reads, 1);
});

const { ApplicantService } = require('../src/features/applicants/application/applicant-service.ts');
const { AuthService } = require('../src/features/auth/application/auth-service.ts');

test('la postulación usa los cupos vigentes del repositorio', async () => {
  let saved = false;
  const repo = { hasApplication: async () => false, saveApplication: async () => { saved = true; }, fetchApplicantsByProject: async () => [], fetchMyApplications: async () => [], updateApplicationStatus: async () => {}, updateProjectSpots: async () => {} };
  const service = new ApplicantService(repo, { ensureProfile: async () => {} }, { fetchProjectById: async () => ({ ...project, filledSpots: 1 }) });
  await assert.rejects(service.submitApplication(draft, user, project), /cupos/);
  assert.equal(saved, false);
});

test('una decisión solo utiliza postulaciones del proyecto recuperado', async () => {
  let reads = 0;
  let writes = 0;
  const repo = { fetchApplicantsByProject: async () => { reads++; return []; }, updateApplicationStatus: async () => { writes++; }, updateProjectSpots: async () => { writes++; } };
  const service = new ApplicantService(repo, {}, { fetchProjectById: async () => project });
  await assert.rejects(service.decideApplication({ applicant: { id: 'a1' }, project, newStatus: 'accepted', actor: user }), /Solo el líder/);
  assert.equal(reads, 0);
  await assert.rejects(service.decideApplication({ applicant: { id: 'a1' }, project, newStatus: 'accepted', actor: { id: 'owner' } }), /No se encontró la postulación/);
  assert.equal(writes, 0);
});

test('autenticación asegura el perfil tras el acceso y no después de un error', async () => {
  let profiles = 0;
  const gateway = { login: async () => user, register: async () => { throw new Error('error'); } };
  const service = new AuthService(gateway, { ensureProfile: async () => { profiles++; } });
  assert.equal(await service.login('user', 'password'), user);
  await assert.rejects(service.register('user', 'password', 'name'));
  assert.equal(profiles, 1);
});

const { archiveProject } = require('../src/features/projects/application/archive-project.ts');
test('solo el creador puede ocultar el proyecto', async () => {
  const writes = [];
  const repo = { fetchProjectById: async () => project, archiveProject: async (id) => writes.push(id) };
  await assert.rejects(archiveProject(repo, 'p1', user), /Solo el creador/);
  assert.equal(writes.length, 0);
  await archiveProject(repo, 'p1', { id: 'owner' });
  assert.deepEqual(writes, ['r1']);
});

const { ChatService } = require('../src/features/chat/application/chat-service.ts');
test('el chat admite al líder y a integrantes aceptados, no a otros usuarios', async () => {
  const writes = [];
  const projects = { fetchProjectById: async () => project, fetchTeamMembers: async () => [{ userId: 'member', isCreator: false }] };
  const messages = { fetchMessages: async () => [{ body: 'Hola' }], saveMessage: async (...args) => { writes.push(args); return { body: args[2] }; } };
  const service = new ChatService(projects, messages);
  await assert.rejects(service.fetchMessages('p1', { id: 'other', isGuest: false }), /integrantes aceptados/);
  await assert.rejects(service.sendMessage('p1', { id: 'member', isGuest: false }, '   '), /Escribe/);
  assert.equal(writes.length, 0);
  assert.equal((await service.fetchMessages('p1', { id: 'owner', isGuest: false })).length, 1);
  await service.sendMessage('p1', { id: 'member', isGuest: false }, ' Hola ');
  assert.equal(writes[0][2], 'Hola');
});

test('recorrido local: crear, postular, aceptar, editar y publicar un avance', async () => {
  const leader = { id: 'owner', name: 'Líder' };
  const member = { id: 'member', name: 'Integrante' };
  const state = { project: null, applications: [], updates: [] };
  const repo = {
    ensureProfile: async () => {},
    saveProject: async (input) => {
      state.project = { ...input, id: 'project-flow', recordId: 'project-row', creatorId: leader.id, filledSpots: 0 };
      return { ...state.project };
    },
    fetchProjectById: async (id) => state.project?.id === id ? { ...state.project } : null,
    saveProjectEdit: async (_id, input) => { Object.assign(state.project, input); },
    hasApplication: async (projectId, applicantId) => state.applications.some((item) => item.projectId === projectId && item.applicantId === applicantId),
    saveApplication: async (_draft, applicant, selectedProject) => {
      const result = { id: 'app-flow', recordId: 'application-row', projectId: selectedProject.id, applicantId: applicant.id, status: 'pending' };
      state.applications.push(result);
      return { ...result };
    },
    updateApplicationStatus: async (_id, status) => { state.applications[0].status = status; },
    updateProjectSpots: async (_id, value) => { state.project.filledSpots = value; },
    fetchTeamMembers: async () => state.applications.filter((item) => item.status === 'accepted').map((item) => ({ userId: item.applicantId, isCreator: false })),
    saveUpdate: async (input) => { const result = { id: 'update-flow', ...input }; state.updates.push(result); return result; },
    updateProjectStatus: async (_id, status) => { state.project.status = status; },
  };
  const created = await createProject(repo, { title: ' Proyecto final ', description: ' Descripción suficiente ', categories: ['Ciencia'], totalSpots: 2, skills: [] }, leader);
  const application = await submitApplication(repo, { ...draft, projectId: created.id }, member, created);
  await decideApplication(repo, { applicant: application, project: created, newStatus: 'accepted', actor: leader });
  await editProject(repo, created.id, { title: 'Proyecto actualizado', description: 'Descripción actualizada', totalSpots: 3 }, leader);
  await publishUpdate(repo, { projectId: created.id, author: member, title: 'Primer avance', body: 'Trabajo realizado' });
  assert.equal(state.applications[0].status, 'accepted');
  assert.equal(state.project.filledSpots, 1);
  assert.equal(state.project.totalSpots, 3);
  assert.equal(state.project.title, 'Proyecto actualizado');
  assert.equal(state.updates[0].author.id, member.id);
});

test('el fallo al guardar un avance no intenta cambiar el estado del proyecto', async () => {
  let changes = 0;
  const repo = {
    fetchProjectById: async () => project,
    fetchTeamMembers: async () => [],
    saveUpdate: async () => { throw new Error('base no disponible'); },
    updateProjectStatus: async () => { changes++; },
  };
  await assert.rejects(publishUpdate(repo, { projectId: 'p1', author: { id: 'owner' }, title: 'Avance', body: 'Contenido', newStatus: 'cerrado' }), /base no disponible/);
  assert.equal(changes, 0);
});

const { NotificationService } = require('../src/features/notifications/application/notification-service.ts');
test('una notificación solo puede marcarla como leída su destinatario', async () => {
  const updates = [];
  const service = new NotificationService({ markRead: async (id) => updates.push(id) });
  const notification = { recipientId: 'member', recordId: 'n1', readAt: null };
  await assert.rejects(service.markRead(notification, 'other'), /No puedes/);
  assert.deepEqual(updates, []);
  await service.markRead(notification, 'member');
  assert.deepEqual(updates, ['n1']);
});

test('postular avisa al líder sin convertir un fallo del aviso en fallo de la postulación', async () => {
  const notifications = [];
  const actualProject = { ...project, title: 'Proyecto prueba' };
  const repo = { hasApplication: async () => false, saveApplication: async () => ({ id: 'a1' }) };
  const sender = { send: async (item) => { notifications.push(item); throw new Error('fallo de notificación'); } };
  const service = new ApplicantService(repo, { ensureProfile: async () => {} }, { fetchProjectById: async () => actualProject }, sender);
  const oldWarn = console.warn;
  console.warn = () => {};
  try {
    assert.equal((await service.submitApplication(draft, user, actualProject)).id, 'a1');
    assert.equal(notifications[0].recipientId, 'owner');
    assert.equal(notifications[0].kind, 'application');
  } finally { console.warn = oldWarn; }
});

test('una decisión avisa al postulante solo cuando cambia su estado', async () => {
  const sent = [];
  const actualProject = { ...project, title: 'Proyecto prueba' };
  let currentStatus = 'pending';
  const repo = {
    fetchApplicantsByProject: async () => [{ id: 'a1', recordId: 'ar1', applicantId: 'member', status: currentStatus }],
    updateApplicationStatus: async (_id, status) => { currentStatus = status; },
    updateProjectSpots: async () => {},
  };
  const service = new ApplicantService(repo, {}, { fetchProjectById: async () => actualProject }, { send: async (item) => sent.push(item) });
  const input = { applicant: { id: 'a1' }, project: actualProject, actor: { id: 'owner' }, newStatus: 'accepted' };
  await service.decideApplication(input);
  await service.decideApplication(input);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].recipientId, 'member');
  assert.equal(sent[0].kind, 'accepted');
});

const { ProjectService } = require('../src/features/projects/application/project-service.ts');
test('un avance notifica a los demás integrantes una sola vez y excluye al autor', async () => {
  const sent = [];
  const currentProject = { ...project, title: 'Proyecto prueba' };
  const repository = {
    fetchProjectById: async () => currentProject,
    fetchTeamMembers: async () => [{ userId: 'member', isCreator: false }, { userId: 'owner', isCreator: true }],
    saveUpdate: async () => ({ id: 'update-1' }),
  };
  const service = new ProjectService(repository, {}, { send: async (item) => sent.push(item) });
  await service.publishUpdate({ projectId: 'p1', author: { id: 'member', name: 'Ana' }, title: 'Avance', body: 'Texto' });
  assert.deepEqual(sent.map((item) => item.recipientId), ['owner']);
  assert.equal(sent[0].kind, 'update');
});

const { findNewNotification } = require('../src/features/notifications/application/find-new-notification.ts');
test('solo aparecen como burbuja las notificaciones no leídas recibidas tras la carga inicial', () => {
  const old = { id: 'old', readAt: null };
  const read = { id: 'read', readAt: new Date() };
  const incoming = { id: 'new', readAt: null };
  assert.equal(findNewNotification(null, [old]), null);
  assert.equal(findNewNotification(new Set(['old']), [old, read]), null);
  assert.equal(findNewNotification(new Set(['old']), [incoming, old]), incoming);
});
