import js from '@eslint/js';

export function base() {
  return [
    js.configs.recommended,
    {
      rules: {
        'prefer-const': 'error',
        'no-var': 'error',
      },
    },
  ];
}
