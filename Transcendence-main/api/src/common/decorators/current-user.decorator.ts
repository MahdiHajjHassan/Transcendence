import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtUser, RequestWithUser } from '../types/request-with-user';

export const CurrentUser = createParamDecorator<keyof JwtUser | undefined>(
  (data, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!data) {
      return request.user;
    }
    return request.user?.[data];
  },
);
