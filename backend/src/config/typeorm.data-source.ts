import 'reflect-metadata';
import { config } from 'dotenv';
import { join, resolve, sep } from 'path';
import { DataSource } from 'typeorm';

const isCompiled = __dirname.includes(`${sep}dist${sep}`);

const backendRoot = isCompiled
  ? resolve(__dirname, '..', '..', '..')
  : resolve(__dirname, '..', '..');

const projectRoot = resolve(backendRoot, '..');

config({ path: resolve(projectRoot, '.env') });
config({ path: resolve(backendRoot, '.env'), override: true });

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error('DATABASE_URL doit être défini pour exécuter les migrations TypeORM.');
}

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
});