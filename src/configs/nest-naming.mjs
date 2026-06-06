/**
 * NestJS file-naming guardrails (self-contained, no external plugin deps).
 *
 * Enforces five things off-the-shelf rules can't:
 *   1. filename role-suffix whitelist (+ optional kebab-case base)
 *   2. content<->suffix binding (e.g. *.dto.ts must be a class, *.interface.ts must not contain a class)
 *   3. one test-file convention (default *.spec.ts; blocks *.test.ts, which Nest's
 *      default jest testRegex ".*\\.spec\\.ts$" silently skips)
 *   4. ambient declaration placement (*.d.ts)
 *   5. no global src/types folder
 *
 * Suffixes are graded into kinds:
 *   - 'class'     : must export a class (controller/service/dto/...); some also require a decorator
 *   - 'interface' : must contain an interface, must not contain a class
 *   - 'type'      : must contain a type alias, must not contain a class
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
  const declarationFile = (filename) => {
    const base = String(filename).replace(/\\/g, '/').split('/').pop() || '';
    return base.endsWith('.d.ts');
  };
  const inGlobalTypesFolder = (filename) => {
    const normalized = String(filename).replace(/\\/g, '/');
    const cwd = process.cwd().replace(/\\/g, '/');
    return (
      normalized.startsWith('types/') ||
      normalized.startsWith(`${cwd}/types/`) ||
      /(^|\/)src\/types\//.test(normalized)
    );
  };
  // A test file carries its marker in the LAST segment (x.spec.ts / x.e2e-spec.ts).
  // Checking every segment would mis-classify a real role file named "test" (test.service.ts).
  const isTest = (parts) => TEST_MARKERS.has(parts[parts.length - 1]);
  const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  const unwrapDeclaration = (node) =>
    (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') &&
    node.declaration
      ? node.declaration
      : node;

  const isExportedDeclaration = (node) =>
    node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration';

  const collectTopLevel = (body) => {
    const out = {
      classes: [],
      exportedInterfaces: [],
      exportedTypeAliases: [],
      interfaces: [],
      typeAliases: [],
    };
    const exportedNames = new Set();
    for (const raw of body) {
      if (raw.type === 'ExportNamedDeclaration' && !raw.declaration) {
        for (const specifier of raw.specifiers ?? []) {
          const local = specifier.local?.name;
          if (local) exportedNames.add(local);
        }
      }
    }
    for (const raw of body) {
      const node = unwrapDeclaration(raw);
      const exported = isExportedDeclaration(raw) || exportedNames.has(node.id?.name);
      if (node.type === 'ClassDeclaration') out.classes.push(node);
      else if (node.type === 'TSInterfaceDeclaration') {
        out.interfaces.push(node);
        if (exported) out.exportedInterfaces.push(node);
      } else if (node.type === 'TSTypeAliasDeclaration') {
        out.typeAliases.push(node);
        if (exported) out.exportedTypeAliases.push(node);
      }
    }
    return out;
  };

  const visitAst = (node, visitor, seen = new WeakSet()) => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (typeof node.type === 'string') visitor(node);
    for (const [key, value] of Object.entries(node)) {
      if (
        key === 'parent' ||
        key === 'loc' ||
        key === 'range' ||
        key === 'tokens' ||
        key === 'comments'
      ) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) visitAst(item, visitor, seen);
      } else if (value && typeof value === 'object' && typeof value.type === 'string') {
        visitAst(value, visitor, seen);
      }
    }
  };

  const isAmbientDeclaration = (node) =>
    (node.type === 'TSModuleDeclaration' && node.id.type === 'Literal') || node.declare === true;

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
              "'*.interface.ts' must contain an interface. Use *.type.ts for union/utility types.",
            missingTypeAlias:
              "'*.type.ts' must contain a type alias. Use *.interface.ts for object shapes.",
            classInTypeFile: "'*.{{suffix}}.ts' is a type-only file and must not contain a class.",
            exportedInterfaceInWrongFile:
              "Exported interfaces must live in '*.interface.ts'. Keep only private narrow utility interfaces in implementation files.",
            exportedTypeInWrongFile:
              "Exported type aliases must live in '*.type.ts'. Keep only private narrow utility types in implementation files.",
          },
        },
        create(ctx) {
          const fn = ctx.filename ?? ctx.getFilename();
          const parts = segmentsOf(fn);
          if (!parts || parts.length < 2 || isTest(parts)) return {};
          const suffix = parts[parts.length - 1];
          const def = SUFFIXES[suffix];
          if (!def) return {};
          return {
            Program(node) {
              const { classes, exportedInterfaces, exportedTypeAliases, interfaces, typeAliases } =
                collectTopLevel(node.body);
              if (def.kind !== 'interface') {
                for (const item of exportedInterfaces)
                  ctx.report({ node: item, messageId: 'exportedInterfaceInWrongFile' });
              }
              if (def.kind !== 'type') {
                for (const item of exportedTypeAliases)
                  ctx.report({ node: item, messageId: 'exportedTypeInWrongFile' });
              }
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
              const { classes } = collectTopLevel(node.body);
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

      'declaration-file': {
        meta: {
          type: 'problem',
          schema: [],
          messages: {
            misplaced:
              "Ambient declarations (`declare ...`) must live in '*.d.ts' files so type-aware linting and IDEs can discover them reliably.",
            domainType:
              "Do not put project domain types in '*.d.ts'. Use co-located '*.interface.ts' or '*.type.ts' files; reserve '*.d.ts' for ambient declarations.",
          },
        },
        create(ctx) {
          const fn = ctx.filename ?? ctx.getFilename();
          if (declarationFile(fn)) {
            const reportDomainType = (node) => {
              ctx.report({ node, messageId: 'domainType' });
            };
            const checkTopLevel = (node) => {
              const declaration =
                unwrapDeclaration(node);
              if (!declaration) return;
              if (declaration.type === 'TSModuleDeclaration') return;
              if (declaration.declare === true) return;
              if (
                declaration.type === 'TSInterfaceDeclaration' ||
                declaration.type === 'TSTypeAliasDeclaration' ||
                declaration.type === 'ClassDeclaration' ||
                declaration.type === 'TSEnumDeclaration' ||
                declaration.type === 'TSDeclareFunction' ||
                declaration.type === 'VariableDeclaration'
              ) {
                reportDomainType(declaration);
              }
            };
            return {
              Program(node) {
                for (const statement of node.body) checkTopLevel(statement);
              },
            };
          }
          return {
            Program(node) {
              visitAst(node, (current) => {
                if (isAmbientDeclaration(current)) {
                  ctx.report({ node: current, messageId: 'misplaced' });
                }
              });
            },
          };
        },
      },

      'no-global-types-folder': {
        meta: {
          type: 'problem',
          schema: [],
          messages: {
            forbidden:
              "Do not put project types in a global 'types/' folder. Co-locate '*.interface.ts' and '*.type.ts' files with the owning module.",
          },
        },
        create(ctx) {
          const fn = ctx.filename ?? ctx.getFilename();
          if (!inGlobalTypesFolder(fn)) return {};
          return {
            Program(node) {
              ctx.report({ node, messageId: 'forbidden' });
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
        'nest-naming/declaration-file': 'error',
        'nest-naming/no-global-types-folder': 'error',
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
