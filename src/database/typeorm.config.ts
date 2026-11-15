import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

/**
 * One source of database settings, shared by the running app (app.module.ts)
 * and the TypeORM CLI used for migrations (data-source.ts).
 *
 * synchronize is always false: the schema changes only through migration files.
 */
export function buildTypeOrmOptions(env: NodeJS.ProcessEnv): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: env.DB_LOGGING === 'true',
  };
}
