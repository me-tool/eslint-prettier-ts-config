import type { Linter } from 'eslint';

export interface BarrelLayer {
  /**
   * Path alias pattern to restrict.
   * The rule will block imports below this alias.
   *
   * @example '@core/modules' — blocks '@core/modules/redis/redis.module'
   * @example '@agentic' — blocks '@agentic/chain/chain.service'
   */
  alias: string;

  /**
   * Custom error message shown when the rule triggers.
   * Defaults to "Use barrel: " followed by the alias.
   */
  message?: string;
}

export interface BarrelBoundary {
  /**
   * Public alias consumers must import from. Imports below this alias are blocked.
   *
   * @example '@agent/runtime'
   */
  publicAlias: string;

  /**
   * Files inside the implementation boundary. These are ignored so internals
   * can import each other without going through the public barrel.
   *
   * @example ['src/agent/runtime/**']
   */
  internalGlobs?: string[];

  /**
   * Files where deep imports from publicAlias are forbidden.
   *
   * @example ['src/agent/**\/*.ts', 'src/tools/**\/*.ts', 'test/**\/*.ts']
   */
  consumers?: string[];

  /**
   * Additional globs allowed to import internals.
   *
   * @example ['src/agent/runtime/**']
   */
  allowInternalFrom?: string[];

  /**
   * Additional ignore globs for this boundary.
   */
  ignores?: string[];

  /**
   * Custom error message. Defaults to "Use public barrel: ${publicAlias}".
   */
  message?: string;
}

export interface BarrelOptions {
  /**
   * Architecture boundary definitions. Prefer this over legacy
   * `layers`/`enforcedIn` because it names public API, internals, and consumers
   * explicitly.
   */
  boundaries?: BarrelBoundary[];

  /**
   * Layer boundaries to enforce barrel imports on.
   * Each entry defines an alias pattern and optional message.
   *
   * @example
   * [
   *   { alias: '@core/modules', message: 'Use barrel: @core/modules' },
   *   { alias: '@core/utils' },
   * ]
   */
  layers?: BarrelLayer[];

  /**
   * Glob patterns for files where barrel imports are enforced.
   * Typically the consuming layers, not the layer that defines the barrel.
   *
   * @example ['src/modules/**\/*.ts', 'src/agentic/**\/*.ts', 'test/**\/*.ts']
   */
  enforcedIn?: string[];

  /**
   * Legacy global ignore globs for `layers`/`enforcedIn`.
   */
  ignores?: string[];
}

/**
 * Enforce barrel imports for cross-layer module boundaries.
 */
export declare function barrel(options?: BarrelOptions): Linter.Config[];
