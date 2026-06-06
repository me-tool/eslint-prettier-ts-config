import pluginUnicorn from 'eslint-plugin-unicorn';

const BASE_ABBREVIATIONS = {
  args: true,
  ctx: true,
  db: true,
  e2e: true,
  Env: true,
  env: true,
  err: true,
  fn: true,
  params: true,
  Prod: true,
  prod: true,
  props: true,
  ref: true,
  req: true,
  res: true,
  util: true,
  utils: true,
};

const BASE_ABBREVIATION_IGNORE = ['(^|[._-]|[a-z])[eE]2[eE]($|[._-]|[A-Z])'];

const BASE_ABBREVIATION_REPLACEMENTS = {
  args: false,
  ctx: false,
  db: false,
  e2e: false,
  env: false,
  err: false,
  fn: false,
  params: false,
  prod: false,
  props: false,
  ref: false,
  req: false,
  res: false,
  util: false,
  utils: false,
};

export function unicorn({ abbreviations = {}, abbreviationIgnore = [] } = {}) {
  return [
    pluginUnicorn.configs['flat/recommended'],
    {
      rules: {
        'unicorn/prevent-abbreviations': [
          'error',
          {
            allowList: { ...BASE_ABBREVIATIONS, ...abbreviations },
            ignore: [...BASE_ABBREVIATION_IGNORE, ...abbreviationIgnore],
            replacements: BASE_ABBREVIATION_REPLACEMENTS,
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
