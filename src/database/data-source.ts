import 'reflect-metadata';
import { existsSync } from 'fs';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.config';

// the TypeORM CLI runs outside Nest, so load .env ourselves
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default new DataSource(buildTypeOrmOptions(process.env));
