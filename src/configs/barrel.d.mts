import type { Linter } from 'eslint';

export interface BarrelLayer {
  /**
   * Path alias pattern to restrict.
   * The rule will block deep imports two levels past this alias.
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

export interface BarrelOptions {
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
}

/**
 * Enforce barrel imports for cross-layer module boundaries.
 */
export declare function barrel(options?: BarrelOptions): Linter.Config[];
