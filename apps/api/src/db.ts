import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
export const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_MAX ?? 10), connectionTimeoutMillis: 5000, query_timeout: 5000 }) });
