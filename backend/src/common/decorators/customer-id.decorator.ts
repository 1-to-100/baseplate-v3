import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CustomerId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const customerId = request.headers['x-customer-id'];
    return typeof customerId === 'string' && !isNaN(Number(customerId))
      ? Number(customerId)
      : null;
  },
);
