/**
 * NestJS file-naming guardrails (self-contained, no external plugin deps).
 *
 * Enforces three things off-the-shelf rules can't:
 *   1. filename role-suffix whitelist (+ optional kebab-case base)
 *   2. content<->suffix binding (e.g. *.dto.ts must be a class, *.interface.ts must not contain a class)
 *   3. one test-file convention (default *.spec.ts; blocks *.test.ts, which Nest's
 *      default jest testRegex ".*\\.spec\\.ts$" silently skips)
 *
 * Suffixes are graded into kinds:
 *   - 'class'     : must export a class (controller/service/dto/...); some also require a decorator
 *   - 'interface' : must declare an interface, must not contain a class
 *   - 'type'      : must declare a type alias, must not contain a class
 *   - 'any'       : filename allowed, content NOT checked
 *                   (decorator -> functions, constant -> const, middleware -> fn|class, etc.)
 *
 * @param {import('./nest-naming.d.mts').NestNamingOptions} options
 * @returns {import('eslint').Linter.Config[]}
 */
export function nestNaming(options = {}) {
  const {
    files = ['src/**/*.ts'],
    ignores = [],
    suffixes = {},
    testSuffix = 'spec',
    kebabCase = true,
    enforceDecorator = 'warn',
  } = options;

  const SUFFIXES = { ...DEFAULT_SUFFIXES, ...suffixes };
  const ALLOWED = Object.keys(SUFFIXES);

  const TEST_MARKERS = new Set(['spec', 'test', 'tests', 'e2e-spec', 'e2e-test']);
  const WRONG_TEST =
    testSuffix === 'spec'
      ? new Set(['test', 'tests', 'e2e-test'])
      : testSuffix === 'test'
        ? new Set(['spec', 'e2e-spec'])
        : new Set();
  const wantSuffix = testSuffix === 'test' ? 'test' : 'spec';

  const segmentsOf = (filename) => {
    const base = String(filename).replace(/\\/g, '/').split('/').pop() || '';
    if (!base.endsWith('.ts') || base.endsWith('.d.ts')) return null;
    return base.slice(0, -3).split('.');
  };
  // A test file carries its marker in the LAST segment (x.spec.ts / x.e2e-spec.ts).
  // Checking every segment would mis-classify a real role file named "test" (test.service.ts).
  const isTest = (parts) => TEST_MARKERS.has(parts[parts.length - 1]);
  const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  const collect = (body) => {
    const out = { classes: [], interfaces: [], typeAliases: [] };
    const unwrap = (n) =>
      (n.type === 'ExportNamedDeclaration' || n.type === 'ExportDefaultDeclaration') && n.declaration
        ? n.declaration
        : n;
    for (const raw of body) {
      const n = unwrap(raw);
      if (n.type === 'ClassDeclaration') out.classes.push(n);
      else if (n.type === 'TSInterfaceDeclaration') out.interfaces.push(n);
      else if (n.type === 'TSTypeAliasDeclaration') out.typeAliases.push(n);
    }
    return out;
  };
  const decoratorName = (d) => {
    const e = d.expression;
    if (e.type === 'CallExpression' && e.callee.type === 'Identifier') return e.callee.name;
    if (e.type === 'Identifier') return e.name;
    return null;
  };

  const plugin = {
    meta: { name: 'nest-naming', version: '1.0.0' },
    rules: {
      'allowed-suffix': {
        meta: {
          type: 'problem',
          schema: [],
          messages: {
            unknownSuffix:
              "Filename suffix '.{{suffix}}.ts' is not an allowed role suffix. Allowed: {{allowed}}.",
            nonKebab: "Filename base '{{base}}' must be kebab-case (e.g. create-user.dto.ts).",
          },
        },
        create(ctx) {
          const fn = ctx.filename ?? ctx.getFilename();
          const parts = segmentsOf(fn);
          if (!parts || parts.length < 2 || isTest(parts)) return {};
          const suffix = parts[parts.length - 1];
          return {
            Program(node) {
              if (!ALLOWED.includes(suffix)) {
                ctx.report({
                  node,
                  messageId: 'unknownSuffix',
                  data: { suffix, allowed: ALLOWED.join(', ') },
                });
                return;
              }
              if (kebabCase) {
                for (const seg of parts.slice(0, -1)) {
                  if (!KEBAB.test(seg)) {
                    ctx.report({
                      node,
                      messageId: 'nonKebab',
                      data: { base: parts.slice(0, -1).join('.') },
                    });
                    break;
                  }
                }
              }
            },
          };
        },
      },

      'suffix-kind': {
        meta: {
          type: 'problem',
          schema: [],
          messages: {
            missingClass:
              "'*.{{suffix}}.ts' must export a class. Move pure types to *.interface.ts / *.type.ts.",
            missingInterface:
              "'*.interface.ts' must declare an interface. Use *.type.ts for union/utility types.",
            missingTypeAlias:
              "'*.type.ts' must declare a type alias. Use *.interface.ts for object shapes.",
            classInTypeFile: "'*.{{suffix}}.ts' is a type-only file and must not contain a class.",
          },
        },
        create(ctx) {
          const fn = ctx.filename ?? ctx.getFilename();
          const parts = segmentsOf(fn);
          if (!parts || parts.length < 2 || isTest(parts)) return {};
          const suffix = parts[parts.length - 1];
          const def = SUFFIXES[suffix];
          if (!def || def.kind === 'any') return {};
          return {
            Program(node) {
              const { classes, interfaces, typeAliases } = collect(node.body);
              if (def.kind === 'class') {
                if (classes.length === 0)
                  ctx.report({ node, messageId: 'missingClass', data: { suffix } });
              } else if (def.kind === 'interface') {
                if (interfaces.length === 0) ctx.report({ node, messageId: 'missingInterface' });
                for (const c of classes)
                  ctx.report({ node: c, messageId: 'classInTypeFile', data: { suffix } });
              } else if (def.kind === 'type') {
                if (typeAliases.length === 0) ctx.report({ node, messageId: 'missingTypeAlias' });
                for (const c of classes)
                  ctx.report({ node: c, messageId: 'classInTypeFile', data: { suffix } });
              }
            },
          };
        },
      },

      'suffix-decorator': {
        meta: {
          type: 'suggestion',
          schema: [],
          messages: {
            missingDecorator: "'*.{{suffix}}.ts' should contain a class decorated with @{{decorator}}.",
          },
        },
        create(ctx) {
          const fn = ctx.filename ?? ctx.getFilename();
          const parts = segmentsOf(fn);
          if (!parts || parts.length < 2 || isTest(parts)) return {};
          const suffix = parts[parts.length - 1];
          const expected = SUFFIXES[suffix]?.decorator;
          if (!expected) return {};
          return {
            Program(node) {
              const { classes } = collect(node.body);
              if (classes.length === 0) return;
              const ok = classes.some((c) =>
                (c.decorators ?? []).some((d) => decoratorName(d) === expected),
              );
              if (!ok)
                ctx.report({
                  node: classes[0],
                  messageId: 'missingDecorator',
                  data: { suffix, decorator: expected },
                });
            },
          };
        },
      },

      'test-suffix': {
        meta: {
          type: 'problem',
          schema: [],
          messages: {
            wrongTestSuffix:
              "Test files must use '.{{want}}.ts' (Nest's default jest testRegex only matches .spec). Rename this '.{{found}}.ts' file.",
          },
        },
        create(ctx) {
          if (testSuffix === false) return {};
          const fn = ctx.filename ?? ctx.getFilename();
          const parts = segmentsOf(fn);
          if (!parts || parts.length < 2) return {};
          return {
            Program(node) {
              // Only the final segment counts: flags x.test.ts, not test.service.ts.
              const last = parts[parts.length - 1];
              if (WRONG_TEST.has(last))
                ctx.report({
                  node,
                  messageId: 'wrongTestSuffix',
                  data: { want: wantSuffix, found: last },
                });
            },
          };
        },
      },
    },
  };

  const decoratorSeverity =
    enforceDecorator === true ? 'error' : enforceDecorator === false ? 'off' : 'warn';

  return [
    {
      name: 'nest-naming',
      files,
      ignores,
      plugins: { 'nest-naming': plugin },
      rules: {
        'nest-naming/allowed-suffix': 'error',
        'nest-naming/suffix-kind': 'error',
        'nest-naming/suffix-decorator': decoratorSeverity,
        'nest-naming/test-suffix': 'error',
      },
    },
  ];
}

const DEFAULT_SUFFIXES = {
  // class + framework decorator enforced
  controller: { kind: 'class', decorator: 'Controller' },
  service: { kind: 'class', decorator: 'Injectable' },
  module: { kind: 'class', decorator: 'Module' },
  guard: { kind: 'class', decorator: 'Injectable' },
  pipe: { kind: 'class', decorator: 'Injectable' },
  interceptor: { kind: 'class', decorator: 'Injectable' },
  filter: { kind: 'class', decorator: 'Catch' },
  resolver: { kind: 'class', decorator: 'Resolver' },
  gateway: { kind: 'class', decorator: 'WebSocketGateway' },
  // class, decorator varies by ORM / strategy -> only require class
  dto: { kind: 'class' },
  entity: { kind: 'class' },
  repository: { kind: 'class' },
  strategy: { kind: 'class' },
  subscriber: { kind: 'class' },
  // type constructs
  interface: { kind: 'interface' },
  type: { kind: 'type' },
  // filename-allowed, content free (functions / consts / mixed forms)
  decorator: { kind: 'any' },
  middleware: { kind: 'any' },
  constant: { kind: 'any' },
  constants: { kind: 'any' },
  enum: { kind: 'any' },
  config: { kind: 'any' },
  schema: { kind: 'any' },
  model: { kind: 'any' },
  validator: { kind: 'any' },
  util: { kind: 'any' },
  utils: { kind: 'any' },
  helper: { kind: 'any' },
  helpers: { kind: 'any' },
  mock: { kind: 'any' },
  fixture: { kind: 'any' },
};
