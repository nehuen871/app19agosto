import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const wrapper = fileURLToPath(new URL('./expo.mjs', import.meta.url));
function run(overrides = {}, missing = false) {
  const temp = mkdtempSync(resolve(tmpdir(), 'expo-env-'));
  try {
    const bin = resolve(temp, 'bin'); mkdirSync(bin);
    writeFileSync(resolve(bin, 'pnpm'), `#!/usr/bin/env node\nconsole.log(JSON.stringify({url:process.env.EXPO_PUBLIC_API_URL,secretPresent:process.env.PRIVATE_ENV_TEST_VALUE!==undefined,args:process.argv.slice(2)}));\n`, { mode: 0o755 });
    const file = resolve(temp, 'test.env');
    if (!missing) writeFileSync(file, 'EXPO_PUBLIC_API_URL=https://api.staging.example/api/v1\nPRIVATE_ENV_TEST_VALUE=private-test-only\n');
    return spawnSync(process.execPath, [wrapper, 'export', '--platform', 'web'], { encoding: 'utf8', env: { PATH: bin + ':' + process.env.PATH, ENV_FILE: file, ...overrides } });
  } finally { rmSync(temp, { recursive: true, force: true }); }
}
test('Expo loads the selected environment, forwards arguments and excludes private file variables', () => {
  const result = run(); assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { url: 'https://api.staging.example/api/v1', secretPresent: false, args: ['exec', 'expo', 'export', '--platform', 'web'] });
});
test('explicit process configuration takes precedence over the selected file', () => {
  const result = run({ EXPO_PUBLIC_API_URL: 'https://api.production.example/api/v1' });
  assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).url, 'https://api.production.example/api/v1');
});
test('an explicitly selected missing environment fails without revealing credentials', () => {
  const result = run({}, true); assert.notEqual(result.status, 0); assert.match(result.stderr, /archivo de ambiente/);
});
