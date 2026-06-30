import type { Linter } from 'eslint';

export type RoleSuffixKind =
  | 'class'
  | 'function'
  | 'class-or-function'
  | 'schema-or-function'
  | 'text-or-factory'
  | 'interface'
  | 'type'
  | 'types'
  | 'any';

export interface RoleSuffixDef {
  kind: RoleSuffixKind;
  /**
   * Allows exported interface/type aliases to remain in this role file.
   * Defaults to false for non-type role files.
   */
  allowExportedTypes?: boolean;
}

export interface RoleNamingOptions {
  files?: string[];
  ignores?: string[];
  suffixes?: Record<string, RoleSuffixDef>;
  testSuffix?: 'spec' | 'test' | false;
  kebabCase?: boolean;
  typeExemptFiles?: string[];
}

export declare function roleNaming(options?: RoleNamingOptions): Linter.Config[];
