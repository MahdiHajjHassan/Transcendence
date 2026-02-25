import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const rawKey = request.headers['x-api-key'];
    const apiKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;

    if (!apiKey) {
      throw new UnauthorizedException('Missing API key.');
    }

    const hashedKey = createHash('sha256').update(apiKey).digest('hex');

    const match = await this.prisma.apiKey.findFirst({
      where: {
        hashedKey,
        active: true,
      },
    });

    if (!match) {
      throw new UnauthorizedException('Invalid API key.');
    }

    return true;
  }
}
