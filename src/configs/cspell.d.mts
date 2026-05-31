import type { Linter } from 'eslint';

export interface CspellOptions {
  /**
   * Additional words to add to the built-in dictionary.
   * Merged with the default tech ecosystem word list.
   */
  words?: string[];
}

/**
 * Optional CSpell spell-checking config.
 * Checks identifiers, comments, and JSX text for typos.
 */
export declare function cspell(options?: CspellOptions): Linter.Config[];
