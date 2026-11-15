import 'reflect-metadata';
import { existsSync } from 'fs';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.config';

// The TypeORM CLI runs outside Nest, so load .env here.
// process.loadEnvFile is built into Node.js 20.12+ (no extra package needed).
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

/** Used only by the migration scripts in package.json. */
export default new DataSource(buildTypeOrmOptions(process.env));
