module.exports = {
  plugins: ['@typescript-eslint'],
  extends: [
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:import/typescript',
    'prettier/@typescript-eslint',
    '@me-tool/eslint-prettier-config',
  ],
  parser: '@typescript-eslint/parser',
  rules: {
    /*
     * TypeScript
     * plugin:@typescript-eslint/eslint-recommended
     * https://typescript-eslint.io/rules/
     */
    '@typescript-eslint/no-explicit-any': 'error', // 禁止使用 any 作为变量类型
    '@typescript-eslint/no-unnecessary-type-assertion': 'error', // 禁止非必要的类型断言
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'after-used',
        ignoreRestSiblings: false,
        vars: 'all',
        varsIgnorePattern: '_',
      },
    ],
  },
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
};
