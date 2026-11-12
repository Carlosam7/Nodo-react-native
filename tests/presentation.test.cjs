const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, parent, ...rest);
};
const load = Module._load;
let homeState;
let updateState;
let editState;
let adminState;
let chatState;
Module._load = function (request, parent, ...rest) {
  if (request === 'react-native') return require('react-native-web');
  if (request === 'react-native-svg') return { SvgXml: () => null };
  if (request === 'expo-haptics') return { selectionAsync: async () => {} };
  if (request === 'expo-router') return { useRouter: () => ({ push() {}, replace() {}, setParams() {} }), useLocalSearchParams: () => ({}) };
  if (request === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
  if (request === '@/features/auth/context/auth-context') return { useAuth: () => ({ isPublicSession: true, signedInUser: null }) };
  if (request === '../hooks/useHomeProjects') return { useHomeProjects: () => homeState };
  if (request === '../hooks/usePublishUpdate') return { usePublishUpdate: () => updateState };
  if (request === '../hooks/useEditProject') return { useEditProject: () => editState };
  if (request === '../hooks/useApplicantsAdmin') return { useApplicantsAdmin: () => adminState };
  if (request === '../hooks/useProjectChat') return { useProjectChat: () => chatState };
  return load.call(this, request, parent, ...rest);
};
for (const ext of ['.ts', '.tsx']) {
  Module._extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
}
const { HomeScreen } = require('../src/features/home/screens/HomeScreen.tsx');
const { ProjectCard } = require('../src/features/home/components/ProjectCard.tsx');
const { PublishUpdateScreen } = require('../src/features/project-updates/screens/PublishUpdateScreen.tsx');
const { EditProjectScreen } = require('../src/features/projects/screens/EditProjectScreen.tsx');
const { ApplicantsAdminScreen } = require('../src/features/applicants/screens/ApplicantsAdminScreen.tsx');
const { ProjectChatScreen } = require('../src/features/chat/screens/ProjectChatScreen.tsx');
const project = { id: 'p1', title: 'Proyecto semilla', description: 'Una descripción', categories: ['CIENCIA'], skills: ['REACT'], totalSpots: 2, filledSpots: 0, status: 'idea', gradientColors: ['#c41230'] };
const state = (changes = {}) => ({ categories: ['TODAS'], selectedCategory: 'TODAS', setSelectedCategory() {}, searchQuery: '', setSearchQuery() {}, isLoading: false, isRefreshing: false, error: null, filteredProjects: [], loadData() {}, ...changes });

test('inicio muestra la carga mientras llegan los proyectos', () => {
  homeState = state({ isLoading: true });
  assert.match(renderToStaticMarkup(React.createElement(HomeScreen)), /Cargando iniciativas/);
});

test('inicio muestra el error de conexión en lugar de una lista vacía', () => {
  homeState = state({ error: 'No se pudieron cargar las iniciativas.' });
  const html = renderToStaticMarkup(React.createElement(HomeScreen));
  assert.match(html, /Error de conexión/);
  assert.match(html, /No se pudieron cargar las iniciativas/);
});

test('inicio presenta un estado vacío cuando no hay coincidencias', () => {
  homeState = state();
  const html = renderToStaticMarkup(React.createElement(HomeScreen));
  assert.match(html, /No hay proyectos/);
  assert.match(html, /No encontramos iniciativas/);
});

test('la tarjeta solo muestra editar cuando se proporciona la acción', () => {
  const normal = renderToStaticMarkup(React.createElement(ProjectCard, { project, onPress() {} }));
  const editable = renderToStaticMarkup(React.createElement(ProjectCard, { project, onPress() {}, onEdit() {}, onDelete() {} }));
  assert.doesNotMatch(normal, /Editar/);
  assert.match(editable, /Editar proyecto semilla/i);
  assert.match(editable, /Eliminar proyecto semilla/i);
  assert.doesNotMatch(normal, /Eliminar/);
  assert.match(editable, /aria-label="Proyecto Proyecto semilla"/);
});


test('la pantalla de avances muestra un error de carga recuperable', () => {
  updateState = { project: null, isLoading: false, loadError: 'No se pudo cargar el proyecto.' };
  const html = renderToStaticMarkup(React.createElement(PublishUpdateScreen));
  assert.match(html, /No se pudo cargar el proyecto/);
  assert.match(html, /Volver/);
});

test('la pantalla de avances impide mostrar el formulario a un usuario ajeno', () => {
  updateState = { project, isLoading: false, isCreator: false, isMember: false };
  const html = renderToStaticMarkup(React.createElement(PublishUpdateScreen));
  assert.match(html, /Acceso denegado/);
  assert.doesNotMatch(html, /Publicar actualización/);
});


test('edición muestra el fallo de carga y la opción de regresar', () => {
  editState = { project: null, loading: false, error: 'No se encontró el proyecto.' };
  const html = renderToStaticMarkup(React.createElement(EditProjectScreen));
  assert.match(html, /No se encontró el proyecto/);
  assert.match(html, /Volver al perfil/);
});

test('gestión muestra acceso denegado a quien no lidera el proyecto', () => {
  adminState = { project, isLoading: false, canManage: false };
  const html = renderToStaticMarkup(React.createElement(ApplicantsAdminScreen));
  assert.match(html, /Acceso denegado/);
});


test('el chat denegado no muestra el campo para enviar', () => {
  chatState = { loading: false, authorized: false, error: 'Solo el equipo puede entrar.', messages: [], text: '' };
  const html = renderToStaticMarkup(React.createElement(ProjectChatScreen));
  assert.match(html, /Solo el equipo puede entrar/);
  assert.doesNotMatch(html, /Enviar mensaje/);
});

test('el chat del equipo muestra una bienvenida cuando no hay mensajes', () => {
  chatState = { loading: false, authorized: true, error: null, messages: [], text: '', setText() {}, send() {} };
  const html = renderToStaticMarkup(React.createElement(ProjectChatScreen));
  assert.match(html, /Aún no hay mensajes/);
  assert.match(html, /Enviar mensaje/);
});
