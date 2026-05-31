import cspellPlugin from '@cspell/eslint-plugin';

const BASE_WORDS = [
  // AI models & providers
  'deepseek', 'qwen', 'genai', 'logprobs', 'agentic',
  // DB & SQL
  'autoincrement', 'upsert', 'upserts', 'upserted',
  // general tech
  'abtest', 'loggable', 'timespan',
  // tooling & ecosystem
  'nestjs', 'fastify', 'typeorm', 'prisma', 'drizzle',
  'pnpm', 'vitest', 'tsconfig', 'eslintrc', 'prettier',
  'trpc', 'tsdoc', 'jsdoc', 'sonarjs', 'codemod',
];

export function cspell({ words = [] } = {}) {
  return [
    {
      files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
      plugins: { '@cspell': cspellPlugin },
      rules: {
        '@cspell/spellchecker': ['error', {
          autoFix: false,
          cspell: {
            words: [...BASE_WORDS, ...words],
          },
        }],
      },
    },
  ];
}
