import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { WinstonLogger } from 'nest-winston';

@Injectable()
export class AppLoggerService implements NestLoggerService {
  constructor(private readonly winston: WinstonLogger) {}

  log(message: string, context?: string, meta?: any) {
    this.winston.log(message, context || 'Application');
  }

  error(message: string, trace?: string, context?: string, meta?: any) {
    this.winston.error(message, trace, context || 'Application');
  }

  warn(message: string, context?: string, meta?: any) {
    this.winston.warn(message, context || 'Application');
  }

  debug(message: string, context?: string, meta?: any) {
    this.winston.debug(message, context || 'Application');
  }

  verbose(message: string, context?: string, meta?: any) {
    this.winston.verbose(message, context || 'Application');
  }
}
