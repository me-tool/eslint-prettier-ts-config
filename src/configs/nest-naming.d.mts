import type { Linter } from 'eslint';

/**
 * Content form a suffix's file is expected to take.
 * - `class`     — file must export a class (controller, service, dto, ...)
 * - `interface` — file must contain an interface and must not contain a class
 * - `type`      — file must contain a type alias and must not contain a class
 * - `types`     — file must contain an interface or type alias (both allowed), must not contain a class
 * - `any`       — filename is allowed, content is NOT checked
 *                 (decorator -> function, constant -> const, middleware -> fn|class)
 */
export type SuffixKind = 'class' | 'interface' | 'type' | 'types' | 'any';

export interface SuffixDef {
  /** Content form required for files with this suffix. */
  kind: SuffixKind;

  /**
   * Class decorator the file's class is expected to carry (e.g. `Controller`,
   * `Injectable`, `Module`, `Catch`). Only meaningful for `kind: 'class'`.
   * Reported by `nest-naming/suffix-decorator` (severity controlled by `enforceDecorator`).
   */
  decorator?: string;
}

export interface NestNamingOptions {
  /**
   * Globs the rules apply to.
   * @default ['src/**\/*.ts']
   */
  files?: string[];

  /**
   * Globs to exclude (e.g. generated code).
   * @default []
   */
  ignores?: string[];

  /**
   * Override or extend the default suffix table. Merged on top of the built-in
   * defaults, so you only specify additions/changes.
   *
   * @example
   * // add a project-specific class suffix, relax an enforced decorator
   * nestNaming({ suffixes: { command: { kind: 'class' }, gateway: { kind: 'class' } } })
   */
  suffixes?: Record<string, SuffixDef>;

  /**
   * Which single test-file convention to enforce. In `'spec'` mode, `*.test.ts`
   * / `*.tests.ts` / `*.e2e-test.ts` are flagged (Nest's default jest
   * `testRegex` `.*\.spec\.ts$` silently skips them). Set `false` to disable.
   * @default 'spec'
   */
  testSuffix?: 'spec' | 'test' | false;

  /**
   * Require the base name (everything before the role suffix) to be kebab-case.
   * @default true
   */
  kebabCase?: boolean;

  /**
   * Enforce that controller/service/module/guard/... classes carry the expected
   * decorator. `'warn'` is recommended for adoption (abstract bases / mixins may
   * legitimately lack it); `true` => error, `false` => off.
   * @default 'warn'
   */
  enforceDecorator?: boolean | 'warn';

  /**
   * Single-segment filenames (no dot-suffix, e.g. `unit.ts`, `types.ts`) that
   * are exempt from the exported-type check. These files may freely export
   * interfaces and type aliases without being flagged.
   * @default ['index', 'main', 'types']
   */
  typeExemptFiles?: string[];
}

/**
 * NestJS file-naming guardrails: role-suffix whitelist, content<->suffix
 * binding, ambient declaration placement, no global types folder, and a
 * single enforced test-file convention. Self-contained — adds no external
 * ESLint plugin dependency.
 */
export declare function nestNaming(options?: NestNamingOptions): Linter.Config[];
