import pluginImportX from 'eslint-plugin-import-x';

export function importX({ maxCycleDepth = 3 } = {}) {
  return [
    pluginImportX.flatConfigs.recommended,
    pluginImportX.flatConfigs.typescript,
    {
      files: ['**/*.{ts,mts,cts,tsx}'],
      rules: {
        'import-x/named': 'off',
        'import-x/no-cycle': ['error', { maxDepth: maxCycleDepth }],
      },
    },
  ];
}
