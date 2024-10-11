const globals = require('globals');
const eslint = require('@eslint/js');
const tslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

const commonConfig = {
  files: ['src/**/*.ts'],
};

module.exports = tslint.config(
  ...[eslint.configs.recommended, ...tslint.configs.recommended, prettier].map((config) => ({
    ...config,
    ...commonConfig,
  })),
  {
    ...commonConfig,
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
    },
  },
);
