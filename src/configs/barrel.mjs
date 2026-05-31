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
  const { layers = [], enforcedIn = [] } = options;

  if (layers.length === 0 || enforcedIn.length === 0) return [];

  const patterns = layers.map(({ alias, message }) => ({
    group: [`${alias}/*/**`],
    message: message ?? `Use barrel: ${alias}`,
  }));

  return [
    {
      files: enforcedIn,
      rules: {
        '@typescript-eslint/no-restricted-imports': ['error', { patterns }],
      },
    },
  ];
}
