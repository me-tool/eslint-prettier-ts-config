const DEFAULT_TYPE_EXEMPT_FILES = ['index', 'main', 'types'];
const TEST_MARKERS = new Set(['spec', 'test', 'tests', 'e2e-spec', 'e2e-test']);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Generic role-based file naming guardrails.
 *
 * @param {import('./role-naming.d.mts').RoleNamingOptions} options
 * @returns {import('eslint').Linter.Config[]}
 */
export function roleNaming(options = {}) {
  const {
    files = ['src/**/*.ts'],
    ignores = [],
    suffixes = {},
    testSuffix = 'spec',
    kebabCase = true,
    typeExemptFiles = DEFAULT_TYPE_EXEMPT_FILES,
  } = options;

  const suffixDefinitions = { ...DEFAULT_SUFFIXES, ...suffixes };
  const allowedSuffixes = Object.keys(suffixDefinitions);
  const wrongTestMarkers = getWrongTestMarkers(testSuffix);
  const wantedTestSuffix = getWantedTestSuffix(testSuffix);

  const plugin = {
    meta: { name: 'role-naming', version: '1.0.0' },
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
      name: 'role-naming',
      files,
      ignores,
      plugins: { 'role-naming': plugin },
      rules: {
        'role-naming/allowed-suffix': 'error',
        'role-naming/suffix-kind': 'error',
        'role-naming/test-suffix': 'error',
        'role-naming/declaration-file': 'error',
        'role-naming/no-global-types-folder': 'error',
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
        nonKebab: "Filename base '{{base}}' must be kebab-case.",
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
        missingClass: "'*.{{suffix}}.ts' must export a class.",
        missingFunction: "'*.{{suffix}}.ts' must export a function.",
        missingClassOrFunction: "'*.{{suffix}}.ts' must export a class or function.",
        missingRuntimeDeclaration:
          "'*.{{suffix}}.ts' must export a runtime declaration such as a schema, constant, function, or class.",
        missingTextOrFactory:
          "'*.{{suffix}}.ts' must export prompt text or a prompt factory function.",
        missingTypes: "'*.{{suffix}}.ts' must contain an interface or type alias.",
        classInTypeFile: "'*.{{suffix}}.ts' is a type-only file and must not contain a class.",
        exportedInterfaceInWrongFile:
          "Exported interfaces must live in '*.interface.ts' or '*.type.ts'.",
        exportedTypeInWrongFile:
          "Exported type aliases must live in '*.type.ts' or '*.interface.ts'.",
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

function createTestSuffixRule({ testSuffix, wantedTestSuffix, wrongTestMarkers }) {
  return {
    meta: {
      type: 'problem',
      schema: [],
      messages: {
        wrongTestSuffix: "Test files must use '.{{want}}.ts'. Rename this '.{{found}}.ts' file.",
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
        misplaced: "Ambient declarations (`declare ...`) must live in '*.d.ts' files.",
        domainType:
          "Do not put project domain types in '*.d.ts'. Use co-located '*.interface.ts' or '*.type.ts' files.",
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
          "Do not put project types in a global 'types/' folder. Co-locate role files with the owning module.",
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
      reportMissingClass(ctx, node, suffix, topLevel.exportedClasses);
      break;
    }
    case 'function': {
      reportMissingFunction(ctx, node, suffix, topLevel.exportedFunctions);
      break;
    }
    case 'class-or-function': {
      reportMissingClassOrFunction(ctx, node, suffix, topLevel);
      break;
    }
    case 'schema-or-function':
    case 'text-or-factory': {
      reportMissingRuntimeDeclaration(ctx, node, suffix, suffixDefinition.kind, topLevel);
      break;
    }
    case 'interface':
    case 'type':
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
  if (suffixDefinition.allowExportedTypes === true || isTypeKind(suffixDefinition.kind)) return;

  reportExportedTypesInWrongFile(ctx, topLevel.exportedInterfaces, topLevel.exportedTypeAliases);
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

function reportMissingFunction(ctx, node, suffix, functions) {
  if (functions.length === 0) {
    ctx.report({ node, messageId: 'missingFunction', data: { suffix } });
  }
}

function reportMissingClassOrFunction(ctx, node, suffix, topLevel) {
  if (topLevel.exportedClasses.length === 0 && topLevel.exportedFunctions.length === 0) {
    ctx.report({ node, messageId: 'missingClassOrFunction', data: { suffix } });
  }
}

function reportMissingRuntimeDeclaration(ctx, node, suffix, kind, topLevel) {
  if (kind === 'text-or-factory' && hasPromptDeclaration(topLevel)) return;
  if (kind === 'schema-or-function' && hasExportedRuntimeDeclaration(topLevel)) return;

  const messageId =
    kind === 'text-or-factory' ? 'missingTextOrFactory' : 'missingRuntimeDeclaration';
  ctx.report({ node, messageId, data: { suffix } });
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

function hasExportedRuntimeDeclaration(topLevel) {
  return (
    topLevel.exportedClasses.length > 0 ||
    topLevel.exportedFunctions.length > 0 ||
    topLevel.exportedVariables.length > 0
  );
}

function hasPromptDeclaration(topLevel) {
  return (
    topLevel.exportedFunctions.length > 0 ||
    topLevel.exportedFunctionVariables.length > 0 ||
    topLevel.exportedStringVariables.length > 0
  );
}

function isTypeKind(kind) {
  return kind === 'interface' || kind === 'type' || kind === 'types';
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
  const topLevelDeclarations = collectTopLevelDeclarations(body);
  const out = {
    classes: [],
    exportedClasses: [],
    exportedFunctions: [],
    exportedFunctionVariables: [],
    exportedInterfaces: [],
    exportedStringVariables: [],
    exportedTypeAliases: [],
    exportedVariables: [],
    functions: [],
    interfaces: [],
    typeAliases: [],
    variables: [],
  };

  for (const raw of body) {
    collectTopLevelDeclaration(out, raw, exportedNames, topLevelDeclarations);
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

function collectTopLevelDeclarations(body) {
  const declarations = new Map();
  for (const raw of body) {
    const node = unwrapDeclaration(raw);
    if (node.type === 'VariableDeclaration') collectVariableDeclarationsByName(declarations, node);
    else if (node.id?.name) declarations.set(node.id.name, node);
  }
  return declarations;
}

function collectVariableDeclarationsByName(declarations, node) {
  for (const declaration of node.declarations) {
    const name = getDeclarationName(declaration);
    if (name) declarations.set(name, node);
  }
}

function collectTopLevelDeclaration(out, raw, exportedNames, topLevelDeclarations) {
  if (raw.type === 'ExportDefaultDeclaration') {
    collectDefaultExportDeclaration(out, raw.declaration, topLevelDeclarations);
    return;
  }

  const node = unwrapDeclaration(raw);
  const exported = isExportedDeclaration(raw) || exportedNames.has(node.id?.name);

  switch (node.type) {
    case 'ClassDeclaration': {
      collectClassDeclaration(out, node, exported);
      break;
    }
    case 'FunctionDeclaration': {
      collectFunctionDeclaration(out, node, exported);
      break;
    }
    case 'VariableDeclaration': {
      collectVariableDeclaration(out, raw, node, exportedNames);
      break;
    }
    case 'TSInterfaceDeclaration': {
      collectInterfaceDeclaration(out, node, exported);
      break;
    }
    case 'TSTypeAliasDeclaration': {
      collectTypeAliasDeclaration(out, node, exported);
      break;
    }
    // No default
  }
}

function collectDefaultExportDeclaration(out, declaration, topLevelDeclarations) {
  const node = resolveDefaultExportDeclaration(declaration, topLevelDeclarations);
  if (!node) return;

  switch (node.type) {
    case 'ClassDeclaration': {
      collectClassDeclaration(out, node, true);
      break;
    }
    case 'FunctionDeclaration': {
      collectFunctionDeclaration(out, node, true);
      break;
    }
    case 'VariableDeclaration': {
      collectDefaultVariableDeclaration(out, node);
      break;
    }
    default: {
      collectDefaultExportExpression(out, node);
    }
  }
}

function collectDefaultExportExpression(out, node) {
  if (isStringExpression(node)) out.exportedStringVariables.push(node);
  if (isFunctionExpression(node)) out.exportedFunctionVariables.push(node);
}

function resolveDefaultExportDeclaration(declaration, topLevelDeclarations) {
  if (declaration.type === 'Identifier') return topLevelDeclarations.get(declaration.name) ?? null;
  return declaration;
}

function collectDefaultVariableDeclaration(out, node) {
  out.variables.push(node);
  out.exportedVariables.push(node);
  if (isStringVariableDeclaration(node)) out.exportedStringVariables.push(node);
  if (isFunctionVariableDeclaration(node)) out.exportedFunctionVariables.push(node);
}

function collectClassDeclaration(out, node, exported) {
  out.classes.push(node);
  if (exported) out.exportedClasses.push(node);
}

function collectFunctionDeclaration(out, node, exported) {
  out.functions.push(node);
  if (exported) out.exportedFunctions.push(node);
}

function collectVariableDeclaration(out, raw, node, exportedNames) {
  out.variables.push(node);
  if (!isExportedVariableDeclaration(raw, node, exportedNames)) return;

  out.exportedVariables.push(node);
  if (isStringVariableDeclaration(node)) out.exportedStringVariables.push(node);
  if (isFunctionVariableDeclaration(node)) out.exportedFunctionVariables.push(node);
}

function collectInterfaceDeclaration(out, node, exported) {
  out.interfaces.push(node);
  if (exported) out.exportedInterfaces.push(node);
}

function collectTypeAliasDeclaration(out, node, exported) {
  out.typeAliases.push(node);
  if (exported) out.exportedTypeAliases.push(node);
}

function isStringVariableDeclaration(node) {
  return node.declarations.some((declaration) => isStringExpression(declaration.init));
}

function isFunctionVariableDeclaration(node) {
  return node.declarations.some((declaration) => isFunctionExpression(declaration.init));
}

function isStringExpression(node) {
  const expression = unwrapExpression(node);
  if (!expression) return false;
  if (expression.type === 'Literal') return typeof expression.value === 'string';
  return expression.type === 'TemplateLiteral';
}

function isFunctionExpression(node) {
  const expression = unwrapExpression(node);
  if (!expression) return false;
  return expression.type === 'ArrowFunctionExpression' || expression.type === 'FunctionExpression';
}

function unwrapExpression(node) {
  let current = node;
  while (
    current &&
    ['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression'].includes(current.type)
  ) {
    current = current.expression;
  }
  return current;
}

function isExportedVariableDeclaration(raw, node, exportedNames) {
  if (isExportedDeclaration(raw)) return true;
  return node.declarations.some((declaration) =>
    exportedNames.has(getDeclarationName(declaration)),
  );
}

function getDeclarationName(declaration) {
  return declaration.id?.type === 'Identifier' ? declaration.id.name : null;
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

const SKIPPED_AST_KEYS = new Set(['parent', 'loc', 'range', 'tokens', 'comments']);

const DEFAULT_SUFFIXES = {
  interface: { kind: 'types' },
  type: { kind: 'types' },
};
