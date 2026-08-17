const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // eslint-plugin-import's node resolver can't read this package's "exports" map;
      // TypeScript resolves it fine.
      'import/no-unresolved': ['error', { ignore: ['^@expo/vector-icons$'] }],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '.expo/**'],
  },
]);
