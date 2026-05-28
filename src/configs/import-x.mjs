import pluginImportX from 'eslint-plugin-import-x';

export function importX() {
  return [
    pluginImportX.flatConfigs.recommended,
    pluginImportX.flatConfigs.typescript,
    {
      files: ['**/*.{ts,mts,cts,tsx}'],
      rules: {
        'import-x/named': 'off',
      },
    },
  ];
}
