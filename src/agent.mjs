import { defineConfig } from './index.mjs';
import { barrel } from './configs/barrel.mjs';
import { roleNaming } from './configs/role-naming.mjs';

const AGENT_SUFFIXES = {
  runtime: { kind: 'any' },
  executor: { kind: 'class-or-function' },
  planner: { kind: 'class-or-function' },
  tool: { kind: 'schema-or-function' },
  prompt: { kind: 'text-or-factory' },
  eval: { kind: 'any' },
  adapter: { kind: 'class-or-function' },
  schema: { kind: 'any' },
  memory: { kind: 'class-or-function' },
  interface: { kind: 'types' },
  type: { kind: 'types' },
};

/**
 * Agent project role naming preset.
 *
 * @param {import('./agent.d.mts').AgentNamingOptions} options
 * @returns {import('eslint').Linter.Config[]}
 */
export function agentNaming(options = {}) {
  const { suffixes = {}, ...rest } = options;
  return roleNaming({
    ...rest,
    suffixes: { ...AGENT_SUFFIXES, ...suffixes },
  });
}

/**
 * Core agent project ESLint preset: base AI guardrails + agent role naming
 * + optional barrel boundaries. CSpell remains opt-in via the ./cspell export.
 *
 * @param {import('./agent.d.mts').DefineAgentConfigOptions} options
 * @returns {import('eslint').Linter.Config[]}
 */
export function defineAgentConfig(options = {}) {
  const { naming = {}, boundaries = [], ...baseOptions } = options;

  return [...defineConfig(baseOptions), ...agentNaming(naming), ...barrel({ boundaries })];
}
