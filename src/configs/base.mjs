import js from '@eslint/js';

const ESLINT_DIRECTIVE_PREFIXES = [
  'eslint',
  'eslint-disable',
  'eslint-disable-line',
  'eslint-disable-next-line',
  'eslint-enable',
  'eslint-env',
  'exported',
  'global',
];

export function base() {
  return [
    js.configs.recommended,
    {
      plugins: {
        'ai-guardrails': {
          meta: { name: 'ai-guardrails' },
          rules: {
            'no-inline-eslint-config': {
              meta: {
                type: 'problem',
                schema: [],
                messages: {
                  forbidden:
                    'Inline ESLint config comments are forbidden. Use top-level config overrides or ignores.',
                },
              },
              create(ctx) {
                return {
                  Program() {
                    for (const comment of ctx.sourceCode.getAllComments()) {
                      if (isInlineEslintConfigComment(comment.value)) {
                        ctx.report({ loc: comment.loc, messageId: 'forbidden' });
                      }
                    }
                  },
                };
              },
            },
          },
        },
      },
      rules: {
        'ai-guardrails/no-inline-eslint-config': 'error',
        curly: ['error', 'all'],
        eqeqeq: ['error', 'always'],
        'no-console': 'error',
        'no-debugger': 'error',
        'no-implicit-coercion': 'error',
        'prefer-const': 'error',
        'no-var': 'error',
      },
    },
  ];
}

function isInlineEslintConfigComment(commentValue) {
  const value = commentValue.trimStart();
  return ESLINT_DIRECTIVE_PREFIXES.some(
    (prefix) => value === prefix || value.startsWith(`${prefix} `),
  );
}
