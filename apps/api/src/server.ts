import { db } from './db';
import { createApp } from './app';
const server = createApp(db).listen(4000, '0.0.0.0');
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { server.close(() => { void db.$disconnect().then(() => process.exit(0)); }); });
