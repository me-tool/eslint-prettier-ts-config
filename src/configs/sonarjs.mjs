import { configs } from 'eslint-plugin-sonarjs';

export function sonarjs() {
  return [
    configs.recommended,
    {
      rules: {
        'sonarjs/cognitive-complexity': ['error', 15],
        'sonarjs/no-unused-vars': 'off',
        'sonarjs/unused-import': 'off',
        'sonarjs/no-nested-functions': 'off',
        'sonarjs/todo-tag': 'warn',
        'sonarjs/fixme-tag': 'warn',
        'sonarjs/no-array-delete': 'off',
        'sonarjs/prefer-regexp-exec': 'off',
        'sonarjs/deprecation': 'off',
        'sonarjs/argument-type': 'off',
        'sonarjs/different-types-comparison': 'off',
        'sonarjs/no-try-promise': 'off',
        'sonarjs/no-async-constructor': 'off',
        'sonarjs/function-return-type': 'off',
        'sonarjs/redundant-type-aliases': 'off',
      },
    },
  ];
}
