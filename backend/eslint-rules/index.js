/**
 * Custom ESLint Rules Plugin
 * 
 * This plugin contains custom security rules for the project.
 */

const noRawSql = require('./no-raw-sql.js');

module.exports = {
  rules: {
    'no-raw-sql': noRawSql,
  },
};

