#!/usr/bin/env node

import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { CliModule } from './cli.module';
import { SeedCommand } from './commands/seed.command';
import { CleanupCommand } from './commands/cleanup.command';

const program = new Command();

program
  .name('stock-app-cli')
  .description('CLI tool for managing stock-app test data')
  .version('1.0.0');

program
  .command('seed')
  .description('Populate database with test customer, users, and documents')
  .action(async () => {
    const logger = new Logger('CLI');
    try {
      const app = await NestFactory.createApplicationContext(CliModule, {
        logger: ['error', 'warn', 'log'],
      });

      const seedCommand = app.get(SeedCommand);
      await seedCommand.execute();

      await app.close();
      logger.log('Seed command completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Seed command failed:', error);
      process.exit(1);
    }
  });

program
  .command('cleanup')
  .description('Permanently delete all test data from the database (HARD DELETE)')
  .action(async () => {
    const logger = new Logger('CLI');
    try {
      const app = await NestFactory.createApplicationContext(CliModule, {
        logger: ['error', 'warn', 'log'],
      });

      const cleanupCommand = app.get(CleanupCommand);
      await cleanupCommand.execute();

      await app.close();
      logger.log('Cleanup command completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Cleanup command failed:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
