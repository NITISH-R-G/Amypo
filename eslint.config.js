const js = require('@eslint/js');
const globals = require('globals');
const sonarjs = require('eslint-plugin-sonarjs');
const security = require('eslint-plugin-security');

module.exports = [
  js.configs.recommended,
  sonarjs.configs.recommended,
  security.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'docs/**'
    ]
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jest,
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-duplicate-string': 'off', // Frequently triggers false positives in tests/configs
    }
  }
];
