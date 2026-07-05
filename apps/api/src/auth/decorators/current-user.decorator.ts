import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../users/user.entity';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
