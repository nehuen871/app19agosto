import { generateKeyPairSync } from 'node:crypto';
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
const subject = process.argv[2];
if (!subject || !/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject)) throw new Error('Uso: node scripts/configure-push.mjs mailto:contacto@dominio.com');
const file = new URL('../.env', import.meta.url);
let contents = readFileSync(file, 'utf8');
const names = ['PUSH_VAPID_PUBLIC_KEY', 'PUSH_VAPID_PRIVATE_KEY', 'PUSH_VAPID_SUBJECT'];
const configured = names.filter(name => new RegExp(`^${name}=.+$`, 'm').test(contents));
if (configured.length && configured.length !== names.length) throw new Error('Hay una configuración VAPID incompleta. Revisá .env antes de generar claves.');
if (configured.length) {
  process.stdout.write('Las claves push ya están configuradas; se conservaron.\n');
} else {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = privateKey.export({ format: 'jwk' });
  const publicKey = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]).toString('base64url');
  for (const name of names) contents = contents.replace(new RegExp(`^${name}=.*\\n?`, 'gm'), '');
  contents += `\nPUSH_VAPID_PUBLIC_KEY=${publicKey}\nPUSH_VAPID_PRIVATE_KEY=${jwk.d}\nPUSH_VAPID_SUBJECT=${subject}\n`;
  writeFileSync(file, contents, { mode: 0o600 });
  chmodSync(file, 0o600);
  process.stdout.write('Claves push generadas en .env. No se mostraron ni se versionaron.\n');
}
