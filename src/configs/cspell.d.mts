import type { Linter } from 'eslint';

/**
 * Optional CSpell spell-checking config.
 * Checks identifiers, comments, and JSX text for typos.
 */
export declare function cspell(): Linter.Config[];
