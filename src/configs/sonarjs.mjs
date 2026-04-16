import pluginSonar from 'eslint-plugin-sonarjs';

export function sonarjs() {
  return [
    pluginSonar.configs.recommended,
    {
      rules: {
        'sonarjs/cognitive-complexity': ['error', 15],
        'sonarjs/no-unused-vars': 'off', // handled by @typescript-eslint/no-unused-vars
      },
    },
  ];
}
