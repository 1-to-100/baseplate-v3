/**
 * Custom ESLint Rules Plugin
 * 
 * This plugin contains custom security rules for the project.
 */

const noRawSql = require('./no-raw-sql.js');
const noConsoleInGuards = require('./no-console-in-guards.js');
const noConsoleInProduction = require('./no-console-in-production.js');

module.exports = {
  rules: {
    'no-raw-sql': noRawSql,
    'no-console-in-guards': noConsoleInGuards,
    'no-console-in-production': noConsoleInProduction,
  },
};

