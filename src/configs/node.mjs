import pluginN from 'eslint-plugin-n';

const BASE_TEST_FILES = [
  '**/*.test.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
  '**/*.spec.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
  '**/*.config.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
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
