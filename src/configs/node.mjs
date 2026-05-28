import pluginN from 'eslint-plugin-n';

export function node() {
  return [
    pluginN.configs['flat/recommended-module'],
    {
      rules: {
        'n/no-missing-import': 'off',
        'n/no-process-exit': 'off',
      },
    },
    {
      files: [
        '**/*.test.{ts,js,mjs}',
        '**/*.spec.{ts,js,mjs}',
        '**/*.config.{ts,mts,js,mjs}',
      ],
      rules: {
        'n/no-unpublished-import': 'off',
        'n/no-unpublished-require': 'off',
      },
    },
  ];
}
