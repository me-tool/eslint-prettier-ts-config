import type { Linter } from 'eslint';
import type { DefineConfigOptions } from './index.d.mts';
import type { BarrelBoundary } from './configs/barrel.d.mts';
import type { RoleNamingOptions, RoleSuffixDef } from './configs/role-naming.d.mts';

export interface AgentNamingOptions extends Omit<RoleNamingOptions, 'suffixes'> {
  suffixes?: Record<string, RoleSuffixDef>;
}

export interface DefineAgentConfigOptions extends DefineConfigOptions {
  naming?: AgentNamingOptions;
  boundaries?: BarrelBoundary[];
}

export declare function agentNaming(options?: AgentNamingOptions): Linter.Config[];

export declare function defineAgentConfig(options?: DefineAgentConfigOptions): Linter.Config[];
