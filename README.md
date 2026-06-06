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
| `@cspell/eslint-plugin` | Spell checking for identifiers, comments, and JSX text (optional) |

## Requirements

- **Node.js** ^20.19.0 || ^22.13.0 || >=24
- **ESLint** >= 10.4.1
- **TypeScript** >= 6.0.3 (optional — works without it when `disableTypeChecked: true`)
- **Prettier** >= 3.8.3 (optional — only needed if using `./prettier` export)

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

### 5. (Optional) Spell Checking

Requires **Node.js** >= 22.18.0 because `@cspell/eslint-plugin` v10 uses that runtime baseline.

```bash
pnpm add -D @cspell/eslint-plugin
```

```js
// eslint.config.mjs
import { defineConfig } from '@me-tool/eslint-prettier-ts-config';
import { cspell } from '@me-tool/eslint-prettier-ts-config/cspell';

export default [...defineConfig(), ...cspell()];
```

The CSpell config includes a built-in word list for common tech ecosystem terms (AI/DB/tooling). To add project-specific words, pass them via the `words` option:

```js
export default [
  ...defineConfig(),
  ...cspell({ words: ['myapp', 'myterm'] }),
];
```

Alternatively, create a `cspell.json` at project root — CSpell auto-discovers it.

### 6. (Optional) Barrel Import Enforcement

Enforce barrel imports at layer boundaries — prevent deep path imports like `@core/modules/redis/redis.module` and force consumers to use `@core/modules`.

```js
// eslint.config.mjs
import { defineConfig } from '@me-tool/eslint-prettier-ts-config';
import { barrel } from '@me-tool/eslint-prettier-ts-config/barrel';

export default [
  ...defineConfig({ tsconfigRootDir: import.meta.dirname }),
  ...barrel({
    layers: [
      { alias: '@core/modules' },
      { alias: '@core/utils' },
      { alias: '@shared', message: 'Import from @shared barrel only' },
    ],
    enforcedIn: ['src/features/**/*.ts', 'src/modules/**/*.ts', 'test/**/*.ts'],
  }),
];
```

| Option | Type | Description |
|--------|------|-------------|
| `layers[].alias` | `string` | Path alias to restrict. Blocks `${alias}/*/**` (deep imports). |
| `layers[].message` | `string?` | Custom error message. Defaults to `Use barrel: ${alias}`. |
| `enforcedIn` | `string[]` | Globs for files where the rule applies. Typically the consuming layers, not the layer defining the barrel. |

The rule only applies to files matching `enforcedIn` — internal imports within the same layer are not restricted.

### 7. (Optional) NestJS File Naming

Enforce the NestJS file-naming convention: role-suffix whitelist, content↔suffix binding, ambient declaration placement, and a single test-file convention. Self-contained — adds **no** external ESLint plugin dependency.

General form:

```txt
<kebab-base>.<role>.ts
```

The role suffix describes the dominant symbol's role, not merely its technical shape. One file should have one role: if a `*.service.ts` grows DTOs, interfaces, or exported utility types, split them into the role-specific files. Narrow private utility types that are not externally imported may stay close to the implementation.

```js
// eslint.config.mjs
import { defineConfig } from '@me-tool/eslint-prettier-ts-config';
import { nestNaming } from '@me-tool/eslint-prettier-ts-config/nest-naming';

export default [
  ...defineConfig({ tsconfigRootDir: import.meta.dirname }),
  ...nestNaming({ files: ['src/**/*.ts'] }),
];
```

Rules:

| Rule | Catches |
|------|---------|
| `nest-naming/allowed-suffix` | Filename suffix not in the role whitelist (e.g. `*.widget.ts`); non-kebab base (`CreateUser.dto.ts`) |
| `nest-naming/suffix-kind` | Content doesn't match suffix: `*.dto.ts` written as `interface`/`type`; a class inside `*.interface.ts` / `*.type.ts`; exported interfaces/types left in the wrong role file |
| `nest-naming/suffix-decorator` | A `*.controller.ts` / `*.service.ts` / `*.module.ts` / `*.guard.ts` class missing its `@Controller` / `@Injectable` / `@Module` decorator (severity = `enforceDecorator`, default `warn`) |
| `nest-naming/test-suffix` | Wrong test convention: `*.test.ts` when Nest's default jest `testRegex` only matches `*.spec.ts` (silent skip) |
| `nest-naming/declaration-file` | Ambient `declare ...` declarations hidden in normal implementation files, or project domain types placed in `*.d.ts` |
| `nest-naming/no-global-types-folder` | Project types placed in a global `types/` or `src/types/` folder instead of being co-located with the owning module |

Suffixes are graded by runtime shape. `class` files emit JS and participate in DI/decorators/new; `interface`/`type` files disappear after compilation; `any` files are allowed because they may be functions, constants, or mixed framework forms.

Class suffixes with enforced decorators:

| Suffix | Role | Decorator |
|--------|------|-----------|
| `controller` | HTTP/RPC entrypoint; orchestration, not business logic | `@Controller` |
| `service` | Injectable application/domain logic | `@Injectable` |
| `module` | DI organization unit | `@Module` |
| `guard` | `CanActivate` access control | `@Injectable` |
| `pipe` | `PipeTransform` validation/transformation | `@Injectable` |
| `interceptor` | `NestInterceptor` around advice | `@Injectable` |
| `filter` | `ExceptionFilter` handling | `@Catch` |
| `resolver` | GraphQL resolver | `@Resolver` |
| `gateway` | WebSocket gateway | `@WebSocketGateway` |

Class suffixes without fixed decorator enforcement:

| Suffix | Role |
|--------|------|
| `dto` | Boundary data contract with runtime validation; DTOs must be classes |
| `entity` | Persistence mapping / domain entity |
| `repository` | Custom repository |
| `strategy` | Passport strategy |
| `subscriber` | TypeORM event subscriber |

Compile-time suffixes:

| Suffix | Must contain | Forbidden |
|--------|--------------|-----------|
| `interface` | `interface` declaration | class |
| `type` | `type` alias | class |

Content-free suffixes:

| Suffixes | Typical content |
|----------|-----------------|
| `decorator` | Custom decorator functions / factories |
| `middleware` | Function middleware or injectable class |
| `constant` / `constants` | Exported constants |
| `enum` | Enum declarations |
| `config` | `registerAs()` functions or config objects |
| `schema` / `model` | Mongoose / GraphQL mixed forms |
| `validator` | `@ValidatorConstraint` class or validation functions |
| `util` / `utils` / `helper` / `helpers` | Pure helper functions |
| `mock` / `fixture` | Test helpers |

Content binding decisions:

- DTOs must be classes. `class-validator` relies on runtime objects; `interface`/`type` DTOs compile away and can silently bypass `ValidationPipe`.
- `*.interface.ts` and `*.type.ts` must not contain classes.
- Use `*.interface.ts` for `implements`, declaration merging, `extends`, and ordinary object shapes.
- Use `*.type.ts` for union, intersection, mapped, conditional, tuple, and utility types.
- Do not use `*.d.ts` for project domain types. Reserve `*.d.ts` for ambient declarations such as third-party typings, `declare global`, and `declare module`.
- Do not centralize project types in a global `types/` folder; co-locate them with the owning module.
- Base names must be kebab-case: `create-user.dto.ts`, not `CreateUser.dto.ts`.

Test suffixes:

| Type | Suffix | Reason |
|------|--------|--------|
| Unit test | `*.spec.ts` | Matches Nest's default Jest `testRegex` |
| E2E test | `*.e2e-spec.ts` | Matches Nest's e2e Jest config |
| Forbidden | `*.test.ts` / `*.tests.ts` | Can be silently skipped in Nest projects |

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `files` | `string[]` | `['src/**/*.ts']` | Globs the rules apply to. |
| `ignores` | `string[]` | `[]` | Globs to exclude. |
| `suffixes` | `Record<string, { kind; decorator? }>` | — | Merge on top of the default suffix table (add project suffixes / relax decorators). |
| `testSuffix` | `'spec' \| 'test' \| false` | `'spec'` | Which single test convention to enforce; `false` disables. |
| `kebabCase` | `boolean` | `true` | Require kebab-case base names. |
| `enforceDecorator` | `boolean \| 'warn'` | `'warn'` | `true` => error, `false` => off. Start at `warn` to surface noise from abstract bases before promoting to error. |

> Test files (`*.spec.ts`, `*.e2e-spec.ts`) and suffix-less files (`index.ts`, `main.ts`) are exempt from `allowed-suffix` and `suffix-kind`. Identifier naming is handled separately by the base config: classes, interfaces, type aliases, enums, enum members, and type parameters use `PascalCase`; interfaces cannot use Hungarian `I` prefixes.

## Options

```js
import { defineConfig } from '@me-tool/eslint-prettier-ts-config';

export default defineConfig({
  // Path to tsconfig.json directory (default: process.cwd())
  tsconfigRootDir: import.meta.dirname,

  // Additional ignore patterns (extends defaults, doesn't replace)
  ignores: ['**/generated/**', '**/proto/**'],

  // Additional abbreviations for unicorn/prevent-abbreviations (merged with defaults)
  abbreviations: { src: true, dest: true },

  // Additional prevent-abbreviations ignore patterns (merged with defaults)
  abbreviationIgnore: ['(^|[._-])api($|[._-])'],

  // Additional file globs where devDependency imports are allowed (merged with defaults)
  testFiles: ['**/__tests__/**', '**/e2e/**'],

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

- **`prevent-abbreviations`**: Allows common short names: `args`, `ctx`, `db`, `e2e`, `Env`, `env`, `err`, `fn`, `params`, `Prod`, `prod`, `props`, `ref`, `req`, `res`, `util`, `utils`; ignores conventional `*.e2e.*` filename segments
- **`no-null`**: Disabled — Node.js/TS ecosystem uses `null` pervasively
- **`no-array-reduce`**: Disabled — `reduce` is idiomatic for data aggregation
- **`prefer-module`**: Disabled — supports mixed CJS/ESM codebases
- **`prefer-top-level-await`**: Disabled for `main.ts` — CommonJS entry files cannot use top-level await
- **`filename-case`**: Allows kebab-case, camelCase, and PascalCase

### Notable TypeScript Customizations

- **`no-extraneous-class`**: Allows classes with decorators — required by NestJS (`@Module`), Angular (`@NgModule`), and similar frameworks
- **`restrict-template-expressions`**: Allows `number` in template literals — safe and ubiquitous in practice
- **`naming-convention`**: Enforces `PascalCase` for interfaces and type aliases; forbids Hungarian notation prefixes (`IUser` → `User`, `TProps` → `Props`)

### Notable Node.js Plugin Customizations

- **`no-missing-import`**: Disabled — `eslint-plugin-import-x` with TypeScript resolver already covers this
- **`no-process-exit`**: Disabled — `process.exit()` is valid in CLI tools and application entry points
- **`no-unpublished-import`** / **`no-unpublished-require`**: Disabled for test, spec, and config files — devDependencies imports are expected there

### Notable Import-x Customizations

- **`named`**: Disabled for TypeScript files — TypeScript compiler already validates named exports

### Notable SonarJS Customizations

- **`cognitive-complexity`**: Set to 15 (default is 10)
- **`no-nested-functions`**: Disabled — closures and callbacks are core JavaScript/TypeScript patterns
- **`todo-tag`** / **`fixme-tag`**: Set to `warn` — allows TODO markers during development without blocking CI
- **Cross-plugin dedup**: 9 rules disabled where `typescript-eslint` already provides equivalent checks: `no-array-delete`, `prefer-regexp-exec`, `deprecation`, `argument-type`, `different-types-comparison`, `no-try-promise`, `no-async-constructor`, `function-return-type`, `redundant-type-aliases`

## Environment

Targets modern Node.js runtimes (`^20.19.0 || ^22.13.0 || >=24`) with `ecmaVersion: 'latest'` and Node + ES2025 globals by default. Uses `eslint-plugin-n`'s `flat/recommended-module` preset (assumes `"type": "module"` in your project).

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
