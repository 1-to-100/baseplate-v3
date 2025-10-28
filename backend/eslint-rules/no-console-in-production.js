/**
 * ESLint Rule: no-console-in-production
 * 
 * Restricts the use of console statements in production code to prevent
 * information disclosure, performance issues, and log pollution.
 * 
 * Allows console.error and console.warn in specific contexts (error handling),
 * but blocks console.log, console.debug, console.info in most application code.
 * 
 * Exceptions:
 * - main.ts (bootstrap/initialization logging)
 * - *.spec.ts and *.test.ts (test files)
 * - middleware error handlers (console.error for critical errors)
 * 
 * @see https://owasp.org/www-community/vulnerabilities/Information_exposure_through_debug_information
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Restrict console usage in production code for security and performance',
      category: 'Security',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noConsoleLog: 'console.log() is not allowed in production code. Use NestJS Logger instead for proper log management.',
      noConsoleDebug: 'console.debug() is not allowed. Use NestJS Logger with logger.debug() for development debugging.',
      noConsoleInfo: 'console.info() is not allowed. Use NestJS Logger with logger.log() or logger.info() instead.',
      noConsoleWarn: 'console.warn() should be avoided. Use NestJS Logger with logger.warn() for proper warning management.',
      noConsoleError: 'console.error() should be avoided outside error handlers. Use NestJS Logger with logger.error() for structured error logging.',
    },
  },
  create(context) {
    const filename = context.getFilename();
    
    // Allow console in test files
    if (filename.includes('.spec.ts') || filename.includes('.test.ts')) {
      return {};
    }
    
    // Allow console in main.ts bootstrap file (initialization logging)
    if (filename.endsWith('main.ts') || filename.endsWith('cli.ts')) {
      return {};
    }

    // Allow console.warn in utility files for developer warnings
    const isUtilFile = filename.includes('/utils/') || filename.includes('/helpers/');
    
    // Allow console.error in middleware error handlers
    const isMiddleware = filename.includes('/middlewares/');

    return {
      CallExpression(node) {
        // Check for console method calls
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'console' &&
          node.callee.property &&
          node.callee.property.type === 'Identifier'
        ) {
          const method = node.callee.property.name;
          
          // Always block these methods
          if (method === 'log') {
            context.report({
              node,
              messageId: 'noConsoleLog',
            });
          } else if (method === 'debug') {
            context.report({
              node,
              messageId: 'noConsoleDebug',
            });
          } else if (method === 'info') {
            context.report({
              node,
              messageId: 'noConsoleInfo',
            });
          } else if (method === 'warn' && !isUtilFile) {
            // Allow console.warn in utility files for developer warnings
            context.report({
              node,
              messageId: 'noConsoleWarn',
            });
          } else if (method === 'error' && !isMiddleware) {
            // Allow console.error in middleware for critical error handling
            context.report({
              node,
              messageId: 'noConsoleError',
            });
          }
        }
      },
    };
  },
};

