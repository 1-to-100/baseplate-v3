/**
 * ESLint Rule: no-console-in-guards
 * 
 * Prevents the use of console methods in authentication guards to avoid
 * information disclosure and performance issues in production.
 * 
 * CVSS Score: 7.0 (HIGH)
 * Security Risks:
 * - Information Disclosure: Security-related debug information exposed in production logs
 * - Performance Impact: Console.log operations slow down authentication flow
 * - Attack Intelligence: Attackers can learn about security mechanisms from debug output
 * - User Information Exposure: Debug logs may contain sensitive user data
 * 
 * @see https://owasp.org/www-community/vulnerabilities/Information_exposure_through_debug_information
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow console statements in authentication guards for security',
      category: 'Security',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noConsoleInGuards: 'Console statements are not allowed in guards. They expose sensitive security information (user data, permissions, roles) and impact performance. Use NestJS Logger with proper environment checks for development debugging.',
      noConsoleInSecurityFiles: 'Console statements in security-critical files pose information disclosure risks. Use proper logging with sanitization instead.',
    },
  },
  create(context) {
    const filename = context.getFilename();
    const isGuardFile = filename.includes('/guards/') || filename.endsWith('guard.ts');
    const isAuthFile = filename.includes('/auth/');
    
    return {
      CallExpression(node) {
        // Only check files in guards or auth directories
        if (!isGuardFile && !isAuthFile) {
          return;
        }

        // Check for console method calls
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'console' &&
          node.callee.property &&
          node.callee.property.type === 'Identifier'
        ) {
          context.report({
            node,
            messageId: isGuardFile ? 'noConsoleInGuards' : 'noConsoleInSecurityFiles',
          });
        }
      },
    };
  },
};

