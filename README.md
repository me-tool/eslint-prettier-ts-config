# @me-tool/eslint-prettier-ts-config

Opinionated ESLint v9 flat config + Prettier for TypeScript projects.

Designed as **AI coding guardrails** — strict type checks, complexity detection, modern JS enforcement, auto-fixable rules. One package, zero config hassle.

## Included Plugins

| Plugin | Purpose |
|--------|---------|
| `typescript-eslint` strictTypeChecked | Strict TS rules + type-aware analysis |
| `eslint-plugin-unicorn` | Modern JS idioms enforcement |
| `eslint-plugin-sonarjs` | Code smell + bug detection |
| `eslint-plugin-import-x` | Import organization + TS resolver |
| `eslint-plugin-n` | Node.js best practices |
| `eslint-config-prettier` | Disable formatting rules (let Prettier handle it) |
| `eslint-import-resolver-typescript` | TypeScript-aware import resolution for import-x |

## Requirements

- **Node.js** >= 18.18.0
- **ESLint** >= 9.0.0
- **TypeScript** >= 5.0.0 (optional — works without it when `disableTypeChecked: true`)
- **Prettier** >= 3.0.0 (optional — only needed if using `./prettier` export)

## Quick Start

### 1. Install

```bash
pnpm add -D @me-tool/eslint-prettier-ts-config eslint typescript prettier
```

### 2. ESLint — create `eslint.config.mjs`

```js
import { defineConfig } from '@me-tool/eslint-prettier-ts-config';

export default defineConfig();
```

> Also supports `eslint.config.ts` with typescript-eslint v8+.

### 3. Prettier — add to `package.json`

```json
{
  "prettier": "@me-tool/eslint-prettier-ts-config/prettier"
}
```

### 4. Add lint scripts

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint --fix . && prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

Done. Run `pnpm lint` to check, `pnpm lint:fix` to auto-fix.

> **Note:** Your project must have a `tsconfig.json` for type-aware rules to work. If you don't have one, set `disableTypeChecked: true` in the options.

## Options

```js
import { defineConfig } from '@me-tool/eslint-prettier-ts-config';

export default defineConfig({
  // Path to tsconfig.json directory (default: process.cwd())
  tsconfigRootDir: import.meta.dirname,

  // Additional ignore patterns (extends defaults, doesn't replace)
  ignores: ['**/generated/**', '**/proto/**'],

  // Rule overrides (applied last)
  overrides: {
    'no-console': 'warn',
    'sonarjs/cognitive-complexity': ['error', 20],
  },

  // Falls back to strict + stylistic (non-type-aware variants),
  // still provides substantial linting without a tsconfig.json.
  disableTypeChecked: false,
});
```

### Default Ignores

These glob patterns are always ignored: `dist/**`, `build/**`, `output/**`, `node_modules/**`, `coverage/**`, `.next/**`, `.nuxt/**`, `.output/**`.

### JS/CJS File Handling

JS files (`*.js`, `*.mjs`, `*.cjs`) automatically have type-checked rules and return-type requirements disabled. This means the config works in mixed TS/JS projects out of the box.

## Prettier Config

The bundled Prettier config uses these settings:

```json
{
  "semi": true,
  "singleQuote": true,
  "jsxSingleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always",
  "bracketSpacing": true,
  "bracketSameLine": true,
  "endOfLine": "lf",
  "htmlWhitespaceSensitivity": "ignore",
  "vueIndentScriptAndStyle": true
}
```

## AI Guardrail Rules

Key rules that catch common AI-generated code issues:

| Rule | AI Problem | Effect |
|------|-----------|--------|
| `@typescript-eslint/no-floating-promises` | AI writes `someAsync()` without `await` | Forces promise handling |
| `@typescript-eslint/no-misused-promises` | AI passes async to non-promise-expecting APIs | Catches async misuse |
| `@typescript-eslint/explicit-function-return-type` | AI omits return types | Forces explicit declarations |
| `@typescript-eslint/no-explicit-any` | AI falls back to `any` | Enforces proper typing |
| `@typescript-eslint/consistent-type-imports` | AI mixes value/type imports | Forces `import type {}` |
| `@typescript-eslint/prefer-nullish-coalescing` | AI writes `x \|\| fallback` instead of `x ?? fallback` | Prevents falsy-value bugs |
| `@typescript-eslint/prefer-optional-chain` | AI writes manual `if (a && a.b)` chains | Enforces `a?.b` |
| `sonarjs/cognitive-complexity` (<=15) | AI writes deeply nested logic | Limits function complexity |
| `unicorn/prefer-node-protocol` | AI writes `import fs from 'fs'` | Forces `node:fs` prefix |
| `unicorn/no-array-for-each` | AI uses `.forEach()` | Enforces `for...of` |
| `prefer-const` / `no-var` | AI uses `let` or `var` unnecessarily | Forces immutable bindings |

### Notable Unicorn Customizations

- **`prevent-abbreviations`**: Allows common short names: `req`, `res`, `err`, `ctx`, `env`, `db`, `fn`, `args`, `params`, `props`, `ref`
- **`no-null`**: Disabled — Node.js/TS ecosystem uses `null` pervasively
- **`prefer-module`**: Disabled — supports mixed CJS/ESM codebases
- **`filename-case`**: Allows kebab-case, camelCase, and PascalCase

## Environment

Targets **Node.js + ES2025** globals by default. Uses `eslint-plugin-n`'s `flat/recommended-module` preset (assumes `"type": "module"` in your project).

## VSCode Setup

```jsonc
// .vscode/settings.json
{
  "eslint.useFlatConfig": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

Recommended extensions: [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint), [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode), [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens).

## Migration from v1

v2 is a breaking change:

1. **Update the package**
   ```bash
   pnpm add -D @me-tool/eslint-prettier-ts-config@2 eslint@latest
   pnpm remove @me-tool/eslint-prettier-config  # remove old base
   ```

2. **Replace config file**: Delete `.eslintrc.js` / `.eslintrc.json`, create `eslint.config.mjs` as shown in Quick Start.

3. **Update Prettier**:
   ```diff
   - "prettier": "@me-tool/eslint-prettier-ts-config/.prettierrc.js"
   + "prettier": "@me-tool/eslint-prettier-ts-config/prettier"
   ```

4. **Update lint-staged**: Remove `git add` from commands (auto-staged since lint-staged v10).
   ```json
   {
     "lint-staged": {
       "*.{ts,mts}": ["eslint --fix", "prettier --write"],
       "*.{js,mjs,cjs}": ["eslint --fix", "prettier --write"],
       "*.{json,md,yml,css}": ["prettier --write"]
     }
   }
   ```

### New rules in v2

v2 adds significantly more rules than v1. Expect new lint errors on existing code, particularly from:
- `eslint-plugin-unicorn` (modern JS patterns)
- `eslint-plugin-sonarjs` (cognitive complexity)
- `@typescript-eslint` strict type checks (`no-floating-promises`, `explicit-function-return-type`, etc.)

Run `eslint --fix .` to auto-fix what's possible, then address remaining issues manually.

## License

ISC
