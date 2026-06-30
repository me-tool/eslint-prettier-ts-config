/**
 * Enforce barrel imports for cross-layer module boundaries.
 *
 * Prevents deep path imports like `@core/modules/redis/redis.module`
 * and forces consumers to use barrel files like `@core/modules`.
 *
 * Only enforced in files matching `enforcedIn` globs — typically the
 * layers that consume the barrels, not the layer that defines them.
 *
 * @param {import('./barrel.d.mts').BarrelOptions} options
 * @returns {import('eslint').Linter.Config[]}
 */
export function barrel(options = {}) {
  const { boundaries = [], layers = [], enforcedIn = [], ignores = [] } = options;

  return [
    ...createBoundaryConfigs(boundaries),
    ...createLegacyLayerConfigs({ enforcedIn, ignores, layers }),
  ];
}

function createBoundaryConfigs(boundaries) {
  return boundaries
    .filter(({ consumers = [], publicAlias }) => publicAlias && consumers.length > 0)
    .map((boundary) => {
      const {
        allowInternalFrom = [],
        consumers,
        ignores = [],
        internalGlobs = [],
        message,
        publicAlias,
      } = boundary;
      return {
        files: consumers,
        ignores: [...internalGlobs, ...allowInternalFrom, ...ignores],
        rules: {
          '@typescript-eslint/no-restricted-imports': [
            'error',
            {
              patterns: [
                {
                  group: createDeepImportGroups(publicAlias),
                  message: message ?? `Use public barrel: ${publicAlias}`,
                },
              ],
            },
          ],
        },
      };
    });
}

function createLegacyLayerConfigs({ enforcedIn, ignores, layers }) {
  if (layers.length === 0 || enforcedIn.length === 0) return [];

  const patterns = layers.map(({ alias, message }) => ({
    group: createDeepImportGroups(alias),
    message: message ?? `Use barrel: ${alias}`,
  }));

  return [
    {
      files: enforcedIn,
      ignores,
      rules: {
        '@typescript-eslint/no-restricted-imports': ['error', { patterns }],
      },
    },
  ];
}

function createDeepImportGroups(alias) {
  return [`${alias}/*`, `${alias}/*/**`];
}
