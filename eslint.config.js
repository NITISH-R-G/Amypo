const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'docs/**',
      'reports/**'
    ]
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-constant-condition': 'off',
      'no-empty': 'off',
      'no-useless-escape': 'off',
      'no-useless-catch': 'off',
      'no-cond-assign': 'off',
      'no-fallthrough': 'off',
      'no-unreachable': 'off',
      'no-prototype-builtins': 'off',
      'no-case-declarations': 'off',
      'no-func-assign': 'off',
      'no-empty-pattern': 'off'
    }
  }
];