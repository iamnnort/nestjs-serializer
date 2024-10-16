const globals = require('globals');
const eslint = require('@eslint/js');
const tslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

module.exports = tslint.config(
  {
    ignores: ['dist'],
  },
  eslint.configs.recommended,
  ...tslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          caughtErrors: 'none',
        },
      ],
    },
  },
);
