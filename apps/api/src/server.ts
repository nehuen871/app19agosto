import { readEnvironment } from './env';
const env = readEnvironment();
const { db } = await import('./db');
const { createApp } = await import('./app');
const server = createApp(db).listen(env.PORT, '0.0.0.0', () => {
  process.stdout.write(JSON.stringify({ event: 'listening', port: env.PORT }) + '\n');
});
let stopping = false;
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  if (stopping) return;
  stopping = true;
  process.stdout.write(JSON.stringify({ event: 'shutdown', signal }) + '\n');
  const deadline = setTimeout(() => process.exit(1), 10000);
  deadline.unref();
  server.close(() => { void db.$disconnect().then(() => { clearTimeout(deadline); process.exit(0); }); });
  server.closeIdleConnections();
});
