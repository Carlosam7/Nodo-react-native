const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../src');
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const item = path.join(dir, entry.name);
    return entry.isDirectory() ? files(item) : /\.(ts|tsx)$/.test(item) ? [item] : [];
  });
}

test('dominio y aplicación no dependen de interfaz ni de infraestructura', () => {
  const layers = files(root).filter((file) => /[/\\](domain|application)[/\\]/.test(file));
  assert.ok(layers.length > 0);
  const forbidden = /(?:from\s+|import\s*\()\s*['"](?:react(?:-native)?|expo(?:-router)?|@\/core\/(?:db|composition|presentation|theme|config)|@\/features\/[^'"]+\/infrastructure|[^'"]*\/infrastructure)/;
  for (const file of layers) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), forbidden, path.relative(root, file));
  }
});

test('las rutas de pantalla delegan a funcionalidades', () => {
  const routes = files(path.join(root, 'app')).filter((file) => !file.endsWith('_layout.tsx'));
  for (const file of routes) {
    const contents = fs.readFileSync(file, 'utf8');
    assert.match(contents, /export default/, path.relative(root, file));
    assert.doesNotMatch(contents, /useState|fetch\(|useServices|StyleSheet\.create/, path.relative(root, file));
  }
});
