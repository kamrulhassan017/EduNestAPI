import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WelcomeMailRecipient {
  name: string;
  email: string;
  role: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  get isConfigured(): boolean {
    return Boolean(
      this.config.get('MAIL_USER') && this.config.get('MAIL_PASSWORD'),
    );
  }

  async sendWelcome(user: WelcomeMailRecipient): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(
        `MAIL_USER / MAIL_PASSWORD not set; welcome email to ${user.email} not sent`,
      );
      return false;
    }

    try {
      await this.mailer.sendMail({
        to: user.email,
        subject: 'Welcome to EduNest',
        template: 'welcome',
        context: {
          name: user.name,
          email: user.email,
          role: user.role,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Welcome email sent to ${user.email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Welcome email to ${user.email} failed: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
