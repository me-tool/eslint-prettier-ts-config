import pluginN from 'eslint-plugin-n';

const BASE_TEST_FILES = [
  '**/*.test.{ts,js,mjs}',
  '**/*.spec.{ts,js,mjs}',
  '**/*.config.{ts,mts,js,mjs}',
];

export function node({ testFiles = [] } = {}) {
  return [
    pluginN.configs['flat/recommended-module'],
    {
      rules: {
        'n/no-missing-import': 'off',
        'n/no-process-exit': 'off',
      },
    },
    {
      files: [...BASE_TEST_FILES, ...testFiles],
      rules: {
        'n/no-unpublished-import': 'off',
        'n/no-unpublished-require': 'off',
      },
    },
  ];
}
