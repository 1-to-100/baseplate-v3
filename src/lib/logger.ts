// NOTE: A tracking system such as Sentry should replace the console

export const LogLevel = {
  NONE: 'NONE',
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  ALL: 'ALL',
} as const;

const LogLevelNumber = { NONE: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4, ALL: 5 } as const;

export interface LoggerOptions {
  prefix?: string;
  level?: keyof typeof LogLevel;
  showLevel?: boolean;
}

export class Logger {
  protected prefix: string;
  protected level: keyof typeof LogLevel;
  protected showLevel: boolean;

  private levelNumber: number;

  constructor({ prefix = '', level = LogLevel.ALL, showLevel = true }: LoggerOptions) {
    this.prefix = prefix;
    this.level = level;
    this.levelNumber = LogLevelNumber[this.level];
    this.showLevel = showLevel;
  }

  debug = (...args: unknown[]): void => {
    if (this.canWrite(LogLevel.DEBUG)) {
      this.write(LogLevel.DEBUG, ...args);
    }
  };

  warn = (...args: unknown[]): void => {
    if (this.canWrite(LogLevel.WARN)) {
      this.write(LogLevel.WARN, ...args);
    }
  };

  info = (...args: unknown[]): void => {
    if (this.canWrite(LogLevel.INFO)) {
      this.write(LogLevel.INFO, ...args);
    }
  };

  error = (...args: unknown[]): void => {
    if (this.canWrite(LogLevel.ERROR)) {
      this.write(LogLevel.ERROR, ...args);
    }
  };

  private canWrite(level: keyof typeof LogLevel): boolean {
    return this.levelNumber >= LogLevelNumber[level];
  }

  private write(level: keyof typeof LogLevel, ...args: unknown[]): void {
    let prefix = this.prefix;

    if (this.showLevel) {
      prefix = `- ${level} ${prefix}`;
    }

    if (level === LogLevel.ERROR) {
      console.error(prefix, ...args);
    } else if (level === LogLevel.WARN) {
      console.warn(prefix, ...args);
    } else if (level === LogLevel.INFO) {
      console.info(prefix, ...args);
    } else {
      console.log(prefix, ...args);
    }
  }
}

// This can be extended to create context specific logger (Server Action, Router Handler, etc.)
// to add context information (IP, User-Agent, timestamp, etc.)

export function createLogger({ prefix, level }: LoggerOptions = {}): Logger {
  return new Logger({ prefix, level });
}
