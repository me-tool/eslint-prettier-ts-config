import pluginUnicorn from 'eslint-plugin-unicorn';

export function unicorn() {
  return [
    pluginUnicorn.configs['flat/recommended'],
    {
      rules: {
        'unicorn/prevent-abbreviations': [
          'error',
          {
            allowList: {
              req: true,
              res: true,
              err: true,
              ctx: true,
              env: true,
              db: true,
              fn: true,
              args: true,
              params: true,
              props: true,
              ref: true,
              e2e: true,
            },
          },
        ],
        'unicorn/no-null': 'off',
        'unicorn/no-array-reduce': 'off',
        'unicorn/prefer-module': 'off',
        'unicorn/no-process-exit': 'off',
        'unicorn/filename-case': [
          'error',
          { cases: { kebabCase: true, camelCase: true, pascalCase: true } },
        ],
      },
    },
    {
      files: ['**/main.ts'],
      rules: {
        'unicorn/prefer-top-level-await': 'off',
      },
    },
  ];
}
