import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class ApiDbLoggerMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const method: string = req.method;
    const url: string = req.url;
    const body: unknown = req.body;
    const headers: unknown = req.headers;
    const startTime = Date.now();

    res.on('finish', () => {
      this.prisma.apiLog
        .create({
          data: {
            method,
            url,
            statusCode: res.statusCode,
            duration: Date.now() - startTime,
            requestBody: JSON.stringify(body),
            headers: JSON.stringify(headers),
          },
        })
        .catch((error) => {
          console.error('Failed to log API request:', error);
        });
    });

    next();
  }
}
