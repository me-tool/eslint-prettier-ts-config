import { configs } from 'typescript-eslint';

export function typescript({ tsconfigRootDir, disableTypeChecked = false } = {}) {
  if (disableTypeChecked) {
    return [...configs.strict, ...configs.stylistic];
  }

  return [
    ...configs.strictTypeChecked,
    ...configs.stylisticTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: tsconfigRootDir || process.cwd(),
        },
      },
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
        ],
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/strict-boolean-expressions': [
          'error',
          {
            allowAny: false,
            allowNullableBoolean: false,
            allowNullableEnum: false,
            allowNullableNumber: false,
            allowNullableObject: false,
            allowNullableString: false,
            allowNumber: false,
            allowString: false,
          },
        ],
        '@typescript-eslint/switch-exhaustiveness-check': [
          'error',
          {
            allowDefaultCaseForExhaustiveSwitch: false,
            considerDefaultExhaustiveForUnions: false,
            requireDefaultForNonUnion: false,
          },
        ],
        '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
        '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: ['class', 'enum', 'typeParameter'],
            format: ['PascalCase'],
          },
          {
            selector: 'interface',
            format: ['PascalCase'],
            custom: { regex: '^I[A-Z]', match: false },
          },
          {
            selector: 'typeAlias',
            format: ['PascalCase'],
            custom: { regex: '^T[A-Z]', match: false },
          },
          {
            selector: 'enumMember',
            format: ['PascalCase'],
          },
        ],
      },
    },
    // JS/CJS files: disable type-checked rules
    {
      files: ['**/*.{js,mjs,cjs}'],
      ...configs.disableTypeChecked,
      rules: {
        ...configs.disableTypeChecked.rules,
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
    },
  ];
}
