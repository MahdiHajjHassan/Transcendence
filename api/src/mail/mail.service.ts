import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? '587');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.transporter = null;
      this.logger.warn(
        'SMTP not fully configured. Email alerts will be logged only.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendMail(to: string, subject: string, text: string): Promise<void> {
    if (!to) {
      return;
    }

    if (!this.transporter) {
      this.logger.log(`[EMAIL-LOG] To:${to} Subject:${subject} Body:${text}`);
      return;
    }

    await this.transporter.sendMail({
      from:
        this.configService.get<string>('SMTP_FROM') ??
        'noreply@college-support.local',
      to,
      subject,
      text,
    });
  }
}
