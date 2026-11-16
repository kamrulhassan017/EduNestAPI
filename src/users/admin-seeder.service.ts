import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';

/**
 * On start-up, creates the first admin account if the users table has no admin.
 * Credentials come from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD in .env.
 */
@Injectable()
export class AdminSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger('AdminSeeder');

  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const name = this.config.get<string>('ADMIN_NAME') ?? 'EduNest Admin';
    const email =
      this.config.get<string>('ADMIN_EMAIL') ?? 'admin@edunest.local';
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!password) {
      this.logger.warn(
        'ADMIN_PASSWORD is not set in .env; skipping admin seed',
      );
      return;
    }

    try {
      const created = await this.usersService.ensureAdmin(
        name,
        email,
        password,
      );
      if (created) this.logger.log(`Seeded admin account ${email}`);
    } catch (error) {
      // Most likely the users table does not exist yet.
      this.logger.warn(
        `Admin seed skipped (${(error as Error).message}). Run "npm run migration:run" and restart.`,
      );
    }
  }
}
