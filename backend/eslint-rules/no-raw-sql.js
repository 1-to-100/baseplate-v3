/**
 * ESLint Rule: no-raw-sql
 * 
 * Prevents the use of raw SQL query methods that could lead to SQL injection vulnerabilities.
 * This includes methods like rawQuery, execute_raw_query, $queryRaw, $executeRaw, etc.
 * 
 * @see https://owasp.org/www-community/attacks/SQL_Injection
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow raw SQL query methods for security',
      category: 'Security',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noRawSQL: 'Raw SQL queries are not allowed. Use safe query builder methods from DatabaseService instead. Methods like findMany(), findUnique(), create(), update(), etc. provide SQL injection protection.',
      noRawSQLFunction: 'Direct calls to execute_raw_query are not allowed. Use safe query builder methods instead.',
    },
  },
  create(context) {
    const dangerousMethods = [
      'rawQuery',
      'execute_raw_query',
      '$queryRaw',
      '$executeRaw',
      'executeRawQuery',
      'runRawQuery',
    ];

    return {
      CallExpression(node) {
        // Check for method calls like database.rawQuery()
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property &&
          node.callee.property.type === 'Identifier' &&
          dangerousMethods.includes(node.callee.property.name)
        ) {
          context.report({
            node,
            messageId: node.callee.property.name === 'execute_raw_query' 
              ? 'noRawSQLFunction' 
              : 'noRawSQL',
          });
        }

        // Check for rpc() calls with execute_raw_query as first argument
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'rpc' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          node.arguments[0].value === 'execute_raw_query'
        ) {
          context.report({
            node,
            messageId: 'noRawSQLFunction',
          });
        }
      },

      // Check for method definitions of rawQuery
      MethodDefinition(node) {
        if (
          node.key &&
          node.key.type === 'Identifier' &&
          dangerousMethods.includes(node.key.name)
        ) {
          context.report({
            node,
            messageId: 'noRawSQL',
          });
        }
      },
    };
  },
};

