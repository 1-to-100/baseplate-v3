import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { DatabaseService } from '@/common/database/database.service';

@Injectable()
export class ApiDbLoggerMiddleware implements NestMiddleware {
  constructor(private readonly database: DatabaseService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const method: string = req.method;
    const url: string = req.url;
    const body: unknown = req.body;
    const headers: unknown = req.headers;
    const startTime = Date.now();

    res.on('finish', () => {
      this.database
        .create('api_logs', {
          data: {
            method,
            url,
            status_code: res.statusCode,
            duration: Date.now() - startTime,
            request_body: JSON.stringify(body),
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
