import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ESLint } from 'eslint';
import { defineAgentConfig } from '../src/agent.mjs';
import { defineConfig } from '../src/index.mjs';

const root = await mkdtemp(path.join(tmpdir(), 'cognirail-eslint-config-smoke-'));

try {
  await mkdir(path.join(root, 'src', 'agent', 'runtime'), { recursive: true });
  await mkdir(path.join(root, 'src', 'features'), { recursive: true });
  await writeFile(
    path.join(root, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          skipLibCheck: true,
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    ),
  );

  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: defineAgentConfig({
      tsconfigRootDir: root,
      boundaries: [
        {
          publicAlias: '@agent/runtime',
          internalGlobs: ['src/agent/runtime/**'],
          consumers: ['src/**/*.ts'],
        },
      ],
    }),
  });

  await writeFile(
    path.join(root, 'src', 'agent', 'runtime', 'main.tool.ts'),
    `export function mainTool(): string {
  return 'ok';
}
`,
  );
  await writeFile(
    path.join(root, 'src', 'agent', 'runtime', 'main.prompt.ts'),
    `export const mainPrompt = 'Answer directly.';
`,
  );
  await writeFile(
    path.join(root, 'src', 'agent', 'runtime', 'const-assertion.prompt.ts'),
    `export const prompt = 'hello' as const;
`,
  );
  await writeFile(
    path.join(root, 'src', 'agent', 'runtime', 'factory.prompt.ts'),
    `export const buildPrompt = (): string => 'hello';
`,
  );
  await writeFile(
    path.join(root, 'src', 'agent', 'runtime', 're-export.prompt.ts'),
    `const prompt = 'hello';

export { prompt };
`,
  );
  await writeFile(
    path.join(root, 'src', 'agent', 'runtime', 'default-literal.prompt.ts'),
    `export default 'hello';
`,
  );
  await writeFile(
    path.join(root, 'src', 'agent', 'runtime', 'default-identifier.prompt.ts'),
    `const prompt = 'hello';

export default prompt;
`,
  );
  await writeFile(
    path.join(root, 'src', 'agent', 'runtime', 'default-factory.prompt.ts'),
    `const buildPrompt = (): string => 'hello';

export default buildPrompt;
`,
  );
  await writeFile(
    path.join(root, 'src', 'agent', 'runtime', 'bad-name.bad.ts'),
    `export function run(): string {
  return 'bad';
}
`,
  );
  await writeFile(
    path.join(root, 'src', 'agent', 'runtime', 'bad.prompt.ts'),
    `export const count = 1;
`,
  );
  await writeFile(
    path.join(root, 'src', 'agent', 'runtime', 'bad.executor.ts'),
    `function helper(): string {
  return 'internal';
}

export const marker = helper();
`,
  );
  await writeFile(
    path.join(root, 'src', 'features', 'deep-import.ts'),
    `import { mainTool } from '@agent/runtime/main.tool';

export function run(): string {
  return mainTool();
}
`,
  );
  await writeFile(
    path.join(root, 'src', 'features', 'inline-disable.ts'),
    `/* eslint-disable no-console */
export function run(): string {
  return 'ok';
}
`,
  );

  const results = await eslint.lintFiles(['src/**/*.ts']);
  const byFile = new Map(
    results.map((result) => [result.filePath.replaceAll('\\', '/').split('/').at(-1), result]),
  );

  assert.equal(byFile.get('main.tool.ts').messages.length, 0);
  assert.equal(byFile.get('main.prompt.ts').messages.length, 0);
  assert.equal(byFile.get('const-assertion.prompt.ts').messages.length, 0);
  assert.equal(byFile.get('factory.prompt.ts').messages.length, 0);
  assert.equal(byFile.get('re-export.prompt.ts').messages.length, 0);
  assert.equal(byFile.get('default-literal.prompt.ts').messages.length, 0);
  assert.equal(byFile.get('default-identifier.prompt.ts').messages.length, 0);
  assert.equal(byFile.get('default-factory.prompt.ts').messages.length, 0);
  assert.ok(
    byFile
      .get('bad-name.bad.ts')
      .messages.some((message) => message.ruleId === 'role-naming/allowed-suffix'),
  );
  assert.ok(
    byFile
      .get('bad.prompt.ts')
      .messages.some((message) => message.ruleId === 'role-naming/suffix-kind'),
  );
  assert.ok(
    byFile
      .get('bad.executor.ts')
      .messages.some((message) => message.ruleId === 'role-naming/suffix-kind'),
  );
  assert.ok(
    byFile
      .get('deep-import.ts')
      .messages.some((message) => message.ruleId === '@typescript-eslint/no-restricted-imports'),
  );
  assert.ok(
    byFile
      .get('inline-disable.ts')
      .messages.some((message) => message.ruleId === 'ai-guardrails/no-inline-eslint-config'),
  );

  const baseConfig = defineConfig({ disableTypeChecked: true });
  assert.ok(baseConfig.length > 0);
  process.stdout.write('smoke ok\n');
} finally {
  await rm(root, { recursive: true, force: true });
}
