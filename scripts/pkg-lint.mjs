// Enforces package.json conventions across the workspace. Run: pnpm pkg-lint [paths...]

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SCOPE = '@alienlabs/';
const DEPRECATED_FIELDS = ['browser', 'main', 'module', 'types', 'typesVersions'];
const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

const listPackages = () =>
  JSON.parse(execFileSync('pnpm', ['-r', 'ls', '--depth=-1', '--json'], { encoding: 'utf8' })).map(({ path }) => path);

const isSorted = (keys) => keys.every((key, i) => i === 0 || keys[i - 1].localeCompare(key) <= 0);

const lint = (dir) => {
  const errors = [];
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const isRoot = resolve(dir) === resolve(root);

  if (!pkg.name?.startsWith(SCOPE)) {
    errors.push(`"name" must be scoped ${SCOPE}`);
  }
  if (pkg.private !== true) {
    errors.push('"private" must be true (publishing is not configured)');
  }
  if (!isRoot) {
    if (pkg.type !== 'module') {
      errors.push('"type" must be "module"');
    }
    if (!pkg.exports && !pkg.scripts?.build) {
      errors.push('library packages must declare "exports"');
    }
    if (pkg.exports && pkg.sideEffects === undefined) {
      errors.push('packages with "exports" must declare "sideEffects"');
    }
  }
  for (const field of DEPRECATED_FIELDS) {
    if (field in pkg) {
      errors.push(`remove "${field}" (use "exports")`);
    }
  }
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps) {
      continue;
    }
    if (!isSorted(Object.keys(deps))) {
      errors.push(`"${field}" must be sorted`);
    }
    for (const [name, version] of Object.entries(deps)) {
      const internal = name.startsWith(SCOPE);
      if (internal && !version.startsWith('workspace:')) {
        errors.push(`"${field}.${name}" must use "workspace:*"`);
      } else if (!internal && version !== 'catalog:') {
        errors.push(`"${field}.${name}" must use "catalog:" (pin the version in pnpm-workspace.yaml)`);
      }
    }
  }
  return errors;
};

const targets = process.argv.slice(2).map((file) => resolve(file.replace(/package\.json$/, '')));
const dirs = targets.length > 0 ? targets : listPackages();

let failed = false;
for (const dir of dirs) {
  const errors = lint(dir);
  const label = relative(root, join(dir, 'package.json')) || 'package.json';
  if (errors.length > 0) {
    failed = true;
    console.error(`✗ ${label}`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
  } else {
    console.log(`✓ ${label}`);
  }
}
process.exit(failed ? 1 : 0);
