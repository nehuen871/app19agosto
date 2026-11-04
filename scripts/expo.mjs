import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = resolve(root, process.env.ENV_FILE ?? '.env');
let values = {};
try { values = parseEnv(readFileSync(envFile, 'utf8')); }
catch (error) { if (process.env.ENV_FILE || error.code !== 'ENOENT') throw new Error('No se pudo leer el archivo de ambiente de Expo.'); }
const env = { ...process.env };
for (const [key, value] of Object.entries(values)) {
  if ((key.startsWith('EXPO_PUBLIC_') || key === 'REACT_NATIVE_PACKAGER_HOSTNAME') && env[key] === undefined) env[key] = value;
}
const child = spawn('pnpm', ['exec', 'expo', ...process.argv.slice(2)], { cwd: resolve(root, 'apps/mobile'), env, stdio: 'inherit' });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', () => { process.stderr.write('No se pudo iniciar Expo. Comprobá que pnpm esté instalado.\n'); process.exit(1); });
child.on('exit', code => process.exit(code ?? 1));
