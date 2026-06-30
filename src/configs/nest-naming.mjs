const DEFAULT_TYPE_EXEMPT_FILES = ['index', 'main', 'types'];
const TEST_MARKERS = new Set(['spec', 'test', 'tests', 'e2e-spec', 'e2e-test']);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
 *   - 'types'     : must contain an interface OR type alias (both allowed), must not contain a class
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
    typeExemptFiles = DEFAULT_TYPE_EXEMPT_FILES,
  } = options;

  const suffixDefinitions = { ...DEFAULT_SUFFIXES, ...suffixes };
  const allowedSuffixes = Object.keys(suffixDefinitions);
  const wrongTestMarkers = getWrongTestMarkers(testSuffix);
  const wantedTestSuffix = getWantedTestSuffix(testSuffix);

  const plugin = {
    meta: { name: 'nest-naming', version: '1.0.0' },
    rules: {
      'allowed-suffix': createAllowedSuffixRule({
        allowedSuffixes,
        kebabCase,
        suffixDefinitions,
      }),
      'suffix-kind': createSuffixKindRule({
        suffixDefinitions,
        typeExemptFiles,
      }),
      'suffix-decorator': createSuffixDecoratorRule({ suffixDefinitions }),
      'test-suffix': createTestSuffixRule({
        testSuffix,
        wantedTestSuffix,
        wrongTestMarkers,
      }),
      'declaration-file': createDeclarationFileRule(),
      'no-global-types-folder': createNoGlobalTypesFolderRule(),
    },
  };

  return [
    {
      name: 'nest-naming',
      files,
      ignores,
      plugins: { 'nest-naming': plugin },
      rules: {
        'nest-naming/allowed-suffix': 'error',
        'nest-naming/suffix-kind': 'error',
        'nest-naming/suffix-decorator': getDecoratorSeverity(enforceDecorator),
        'nest-naming/test-suffix': 'error',
        'nest-naming/declaration-file': 'error',
        'nest-naming/no-global-types-folder': 'error',
      },
    },
  ];
}

function createAllowedSuffixRule({ allowedSuffixes, kebabCase, suffixDefinitions }) {
  return {
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
      const parts = getFilenameParts(ctx);
      if (isUncheckedRoleFilename(parts)) return {};

      return {
        Program(node) {
          const suffix = getLastPart(parts);
          if (!suffixDefinitions[suffix]) {
            ctx.report({
              node,
              messageId: 'unknownSuffix',
              data: { suffix, allowed: allowedSuffixes.join(', ') },
            });
            return;
          }
          if (kebabCase) reportNonKebabParts(ctx, node, parts);
        },
      };
    },
  };
}

function createSuffixKindRule({ suffixDefinitions, typeExemptFiles }) {
  return {
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
        missingTypes: "'*.{{suffix}}.ts' must contain an interface or type alias.",
        classInTypeFile: "'*.{{suffix}}.ts' is a type-only file and must not contain a class.",
        exportedInterfaceInWrongFile:
          "Exported interfaces must live in '*.interface.ts' or '*.type.ts'. Keep only private narrow utility interfaces in implementation files.",
        exportedTypeInWrongFile:
          "Exported type aliases must live in '*.type.ts' or '*.interface.ts'. Keep only private narrow utility types in implementation files.",
      },
    },
    create(ctx) {
      const parts = getFilenameParts(ctx);
      if (!parts || isTest(parts)) return {};

      if (parts.length < 2) {
        return createSingleSegmentTypeVisitor(ctx, parts, suffixDefinitions, typeExemptFiles);
      }

      const suffix = getLastPart(parts);
      const suffixDefinition = suffixDefinitions[suffix];
      if (!suffixDefinition) return {};

      return {
        Program(node) {
          reportSuffixKind(ctx, node, suffix, suffixDefinition);
        },
      };
    },
  };
}

function createSuffixDecoratorRule({ suffixDefinitions }) {
  return {
    meta: {
      type: 'suggestion',
      schema: [],
      messages: {
        missingDecorator: "'*.{{suffix}}.ts' should contain a class decorated with @{{decorator}}.",
      },
    },
    create(ctx) {
      const parts = getFilenameParts(ctx);
      if (isUncheckedRoleFilename(parts)) return {};

      const suffix = getLastPart(parts);
      const expectedDecorator = suffixDefinitions[suffix]?.decorator;
      if (!expectedDecorator) return {};

      return {
        Program(node) {
          const { classes } = collectTopLevel(node.body);
          const decorated = classes.some((classNode) => hasDecorator(classNode, expectedDecorator));
          if (classes.length > 0 && !decorated) {
            ctx.report({
              node: classes[0],
              messageId: 'missingDecorator',
              data: { suffix, decorator: expectedDecorator },
            });
          }
        },
      };
    },
  };
}

function createTestSuffixRule({ testSuffix, wantedTestSuffix, wrongTestMarkers }) {
  return {
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
      const parts = getFilenameParts(ctx);
      if (!parts || parts.length < 2) return {};

      return {
        Program(node) {
          const found = getLastPart(parts);
          if (wrongTestMarkers.has(found)) {
            ctx.report({
              node,
              messageId: 'wrongTestSuffix',
              data: { want: wantedTestSuffix, found },
            });
          }
        },
      };
    },
  };
}

function createDeclarationFileRule() {
  return {
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
      if (isDeclarationFile(getFilename(ctx))) {
        return {
          Program(node) {
            for (const statement of node.body) reportDomainTypeInDeclarationFile(ctx, statement);
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
  };
}

function createNoGlobalTypesFolderRule() {
  return {
    meta: {
      type: 'problem',
      schema: [],
      messages: {
        forbidden:
          "Do not put project types in a global 'types/' folder. Co-locate '*.interface.ts' and '*.type.ts' files with the owning module.",
      },
    },
    create(ctx) {
      if (!inGlobalTypesFolder(getFilename(ctx))) return {};
      return {
        Program(node) {
          ctx.report({ node, messageId: 'forbidden' });
        },
      };
    },
  };
}

function createSingleSegmentTypeVisitor(ctx, parts, suffixDefinitions, typeExemptFiles) {
  const basename = parts[0];
  const suffixDefinition = suffixDefinitions[basename];
  const typeAllowingFile =
    suffixDefinition && ['interface', 'type', 'types'].includes(suffixDefinition.kind);

  if (typeExemptFiles.includes(basename) || typeAllowingFile) return {};

  return {
    Program(node) {
      const { exportedInterfaces, exportedTypeAliases } = collectTopLevel(node.body);
      reportExportedTypesInWrongFile(ctx, exportedInterfaces, exportedTypeAliases);
    },
  };
}

function reportSuffixKind(ctx, node, suffix, suffixDefinition) {
  const topLevel = collectTopLevel(node.body);
  reportExportedTypesForSuffix(ctx, suffixDefinition, topLevel);

  switch (suffixDefinition.kind) {
    case 'class': {
      reportMissingClass(ctx, node, suffix, topLevel.classes);
      break;
    }
    case 'interface': {
      reportMissingInterface(ctx, node, topLevel.interfaces);
      reportClassesInTypeFile(ctx, suffix, topLevel.classes);
      break;
    }
    case 'type': {
      reportMissingTypeAlias(ctx, node, topLevel.typeAliases);
      reportClassesInTypeFile(ctx, suffix, topLevel.classes);
      break;
    }
    case 'types': {
      reportMissingTypes(ctx, node, suffix, topLevel.interfaces, topLevel.typeAliases);
      reportClassesInTypeFile(ctx, suffix, topLevel.classes);
      break;
    }
    case 'any': {
      break;
    }
    // No default
  }
}

function reportExportedTypesForSuffix(ctx, suffixDefinition, topLevel) {
  const allowsInterface =
    suffixDefinition.kind === 'interface' || suffixDefinition.kind === 'types';
  const allowsType = suffixDefinition.kind === 'type' || suffixDefinition.kind === 'types';

  if (!allowsInterface) {
    for (const item of topLevel.exportedInterfaces) {
      ctx.report({ node: item, messageId: 'exportedInterfaceInWrongFile' });
    }
  }
  if (!allowsType) {
    for (const item of topLevel.exportedTypeAliases) {
      ctx.report({ node: item, messageId: 'exportedTypeInWrongFile' });
    }
  }
}

function reportExportedTypesInWrongFile(ctx, exportedInterfaces, exportedTypeAliases) {
  for (const item of exportedInterfaces) {
    ctx.report({ node: item, messageId: 'exportedInterfaceInWrongFile' });
  }
  for (const item of exportedTypeAliases) {
    ctx.report({ node: item, messageId: 'exportedTypeInWrongFile' });
  }
}

function reportMissingClass(ctx, node, suffix, classes) {
  if (classes.length === 0) {
    ctx.report({ node, messageId: 'missingClass', data: { suffix } });
  }
}

function reportMissingInterface(ctx, node, interfaces) {
  if (interfaces.length === 0) {
    ctx.report({ node, messageId: 'missingInterface' });
  }
}

function reportMissingTypeAlias(ctx, node, typeAliases) {
  if (typeAliases.length === 0) {
    ctx.report({ node, messageId: 'missingTypeAlias' });
  }
}

function reportMissingTypes(ctx, node, suffix, interfaces, typeAliases) {
  if (interfaces.length === 0 && typeAliases.length === 0) {
    ctx.report({ node, messageId: 'missingTypes', data: { suffix } });
  }
}

function reportClassesInTypeFile(ctx, suffix, classes) {
  for (const classNode of classes) {
    ctx.report({ node: classNode, messageId: 'classInTypeFile', data: { suffix } });
  }
}

function reportNonKebabParts(ctx, node, parts) {
  for (const segment of parts.slice(0, -1)) {
    if (!KEBAB.test(segment)) {
      ctx.report({
        node,
        messageId: 'nonKebab',
        data: { base: parts.slice(0, -1).join('.') },
      });
      return;
    }
  }
}

function reportDomainTypeInDeclarationFile(ctx, node) {
  const declaration = unwrapDeclaration(node);
  if (!declaration || declaration.type === 'TSModuleDeclaration' || declaration.declare === true) {
    return;
  }
  if (isProjectDomainDeclaration(declaration)) {
    ctx.report({ node: declaration, messageId: 'domainType' });
  }
}

function isProjectDomainDeclaration(declaration) {
  return [
    'TSInterfaceDeclaration',
    'TSTypeAliasDeclaration',
    'ClassDeclaration',
    'TSEnumDeclaration',
    'TSDeclareFunction',
    'VariableDeclaration',
  ].includes(declaration.type);
}

function collectTopLevel(body) {
  const exportedNames = collectExportedNames(body);
  const out = {
    classes: [],
    exportedInterfaces: [],
    exportedTypeAliases: [],
    interfaces: [],
    typeAliases: [],
  };

  for (const raw of body) {
    collectTopLevelDeclaration(out, raw, exportedNames);
  }
  return out;
}

function collectExportedNames(body) {
  const exportedNames = new Set();
  for (const raw of body) {
    if (raw.type === 'ExportNamedDeclaration' && !raw.declaration) {
      for (const specifier of raw.specifiers ?? []) {
        const local = specifier.local?.name;
        if (local) exportedNames.add(local);
      }
    }
  }
  return exportedNames;
}

function collectTopLevelDeclaration(out, raw, exportedNames) {
  const node = unwrapDeclaration(raw);
  const exported = isExportedDeclaration(raw) || exportedNames.has(node.id?.name);

  switch (node.type) {
    case 'ClassDeclaration': {
      out.classes.push(node);
      break;
    }
    case 'TSInterfaceDeclaration': {
      out.interfaces.push(node);
      if (exported) out.exportedInterfaces.push(node);
      break;
    }
    case 'TSTypeAliasDeclaration': {
      out.typeAliases.push(node);
      if (exported) out.exportedTypeAliases.push(node);
      break;
    }
    // No default
  }
}

function visitAst(node, visitor, seen = new WeakSet()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  if (typeof node.type === 'string') visitor(node);

  for (const [key, value] of Object.entries(node)) {
    if (SKIPPED_AST_KEYS.has(key)) continue;
    visitAstValue(value, visitor, seen);
  }
}

function visitAstValue(value, visitor, seen) {
  if (Array.isArray(value)) {
    for (const item of value) visitAst(item, visitor, seen);
    return;
  }
  if (value && typeof value === 'object' && typeof value.type === 'string') {
    visitAst(value, visitor, seen);
  }
}

function hasDecorator(classNode, expectedDecorator) {
  return (classNode.decorators ?? []).some(
    (decorator) => getDecoratorName(decorator) === expectedDecorator,
  );
}

function getDecoratorName(decorator) {
  const expression = decorator.expression;
  if (expression.type === 'CallExpression' && expression.callee.type === 'Identifier') {
    return expression.callee.name;
  }
  if (expression.type === 'Identifier') {
    return expression.name;
  }
  return null;
}

function unwrapDeclaration(node) {
  return (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') &&
    node.declaration
    ? node.declaration
    : node;
}

function isExportedDeclaration(node) {
  return node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration';
}

function isAmbientDeclaration(node) {
  return (
    (node.type === 'TSModuleDeclaration' && node.id.type === 'Literal') || node.declare === true
  );
}

function getFilename(ctx) {
  return ctx.filename ?? ctx.getFilename();
}

function getFilenameParts(ctx) {
  return getSegments(getFilename(ctx));
}

function getSegments(filename) {
  const base = String(filename).replaceAll('\\', '/').split('/').pop() || '';
  if (!base.endsWith('.ts') || base.endsWith('.d.ts')) return null;
  return base.slice(0, -3).split('.');
}

function isDeclarationFile(filename) {
  const base = String(filename).replaceAll('\\', '/').split('/').pop() || '';
  return base.endsWith('.d.ts');
}

function inGlobalTypesFolder(filename) {
  const normalized = String(filename).replaceAll('\\', '/');
  const normalizedWorkingDirectory = process.cwd().replaceAll('\\', '/');
  return (
    normalized.startsWith('types/') ||
    normalized.startsWith(`${normalizedWorkingDirectory}/types/`) ||
    /(^|\/)src\/types\//.test(normalized)
  );
}

function isUncheckedRoleFilename(parts) {
  return !parts || parts.length < 2 || isTest(parts);
}

function isTest(parts) {
  return TEST_MARKERS.has(getLastPart(parts));
}

function getLastPart(parts) {
  return parts.at(-1);
}

function getWrongTestMarkers(testSuffix) {
  if (testSuffix === 'spec') return new Set(['test', 'tests', 'e2e-test']);
  if (testSuffix === 'test') return new Set(['spec', 'e2e-spec']);
  return new Set();
}

function getWantedTestSuffix(testSuffix) {
  return testSuffix === 'test' ? 'test' : 'spec';
}

function getDecoratorSeverity(enforceDecorator) {
  if (enforceDecorator === true) return 'error';
  if (enforceDecorator === false) return 'off';
  return 'warn';
}

const SKIPPED_AST_KEYS = new Set(['parent', 'loc', 'range', 'tokens', 'comments']);

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
  // type constructs — both allow interface + type alias coexistence
  interface: { kind: 'types' },
  type: { kind: 'types' },
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
