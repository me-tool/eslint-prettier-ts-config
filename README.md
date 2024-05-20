# References

> 内容主要是来自下面的地址结合自身工作习惯

1. https://github.com/airbnb/javascript
2. https://github.dev/airbnb/javascript/tree/master/packages/eslint-config-airbnb-base
3. https://github.com/scdt-china/eslint-config-scc
4. https://zhuanlan.zhihu.com/p/366141969
5. https://www.npmjs.com/package/eslint-prettier-config
6. https://www.jianshu.com/p/2d6550a83f06 (ESLint 你可能不知道的知识点)
7. https://typescript-eslint.io/rules/
8. https://github.com/import-js/eslint-plugin-import
9. http://eslint.cn/docs/user-guide/configuring
10. https://zhuanlan.zhihu.com/p/386373956

# 项目说明

> 包含常用的 JS/TS + Node 以及 `VUE` 的规则验证
> 使用 `eslint-config-standard` 就没有使用 `eslint-config-airbnb-base`
>
> `eslint-config-standard` 可以和 [standard](https://www.npmjs.com/package/standard) 对比看看
>
> [Compare the Top 3 Style Guides and Set Them Up With ESLint](https://betterprogramming.pub/comparing-the-top-three-style-guides-and-setting-them-up-with-eslint-98ea0d2fc5b7)

## Package.json Dependencies

| Package                                                                                               | Description                                                                                                        |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [@typescript-eslint/eslint-plugin](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin)    | 为 ESlint Rule 提供作用于 TS 源码的能力                                                                            |
| [@typescript-eslint/parser ](https://www.npmjs.com/package/@typescript-eslint/parser)                 | 为 ESlint 提供解析 TS 源码的能力，也是 `@typescript-eslint/eslint-plugin` 的基础                                   |
| [confusing-browser-globals](https://www.npmjs.com/package/confusing-browser-globals)                  | 提供常见的全局属性，这里用在 `no-restricted-globals` ESlint rule 中，避免声明变量和全局变量冲突                    |
| [eslint-config-prettier](https://www.npmjs.com/package/eslint-config-prettier)                        | 关掉 Prettier 中不需要或者会导致冲突的 rule，_是为了解决 Prettier 和 ESlint 规则冲突的安装包之一_                  |
| [eslint-config-standard](https://www.npmjs.com/package/eslint-config-standard)                        | ESLint 标准，与之常见的是 `Airbnb` 的，以 `vue-cli` 创建项目来说， 支持 `Standard`、 `Airbnb`、`None`(自定义) 三种 |
| [eslint-import-resolver-typescript ](https://www.npmjs.com/package/eslint-import-resolver-typescript) | 为 `eslint-plugin-import` 提供作用于 TS 源码的能力                                                                 |
| [eslint-plugin-import](https://www.npmjs.com/package/eslint-plugin-import)                            | ESlint 关于 Import 的最佳实践集合                                                                                  |
| [eslint-plugin-node](https://www.npmjs.com/package/eslint-plugin-node)                                | ESlint 关于 Node 的最佳实践(?)集合                                                                                 |
| [eslint-plugin-prettier](https://www.npmjs.com/package/eslint-plugin-prettier)                        | 将 Prettier 像 ESlint Rules 使用，_是为了解决 Prettier 和 ESlint 规则冲突的安装包之一_                             |
| [eslint-plugin-promise](https://www.npmjs.com/package/eslint-plugin-promise)                          | ESlint 关于 Promise 的最佳实践(?)集合                                                                              |
| [eslint-plugin-vue](https://www.npmjs.com/package/eslint-plugin-vue)                                  | VUE 官方的关于 ESlint 的最佳实践集合                                                                               |

## index.js Extends

> `extends` 属性值可以省略包名的前缀 `eslint-config-`, 比如 `eslint-config-standard` 可以直接写为 `extends:['standard']`

| Extend                                       | Description                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| eslint:recommended                           | ESlint 最佳实践，启用的这些规则为[规则页面](http://eslint.cn/docs/rules/)中被标记为 ✅，该子集只会跟随 ESLint 主要版本进行更新 |
| plugin:@typescript-eslint/eslint-recommended | TS 下 ESlint 最佳实践; 对应 `@typescript-eslint/eslint-plugin`、`@typescript-eslint/parser`                                    |
| plugin:import/errors                         | 关于 import 的最佳实践; 对应 `eslint-plugin-import`                                                                            |
| plugin:import/typescript                     | 为 `eslint-plugin-import` 提供 TS 能力; 对应 `eslint-import-resolver-typescript`                                               |
| plugin:prettier/recommended                  | 为了解决 Prettier 和 ESlint 之间冲突; 对应 `eslint-config-prettier`、`eslint-plugin-prettier`                                  |
| eslint-plugin-vue                            | VUE 官方提供的 VUE ESlint 最佳实践; 对应 `eslint-plugin-vue`                                                                   |

# VSCode

## VSCode Extension

> 为了统一代码格式规范，以及提升代码可读性，推荐安装如下插件
> 下面插件安装均可以在 VScode 自身的插件管理中找到

### 编辑器配置，必须

1.  Prettier
2.  ESLint
3.  EditorConfig for VS Code

### 辅助检查，建议

1.  Code Spell Checker
2.  Error Lens
3.  indent-rainbow
4.  TSLint(如果不使用 TS 可以不安装)

## VScode Settings

> 这里直接贴出对应的属性，可以在 setting 的图形化界面中显示

```json
{
  "[html]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript, javascriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
    // 会覆盖掉全局的设置
    // 可以针对语言设置不同的  brackets
    // "editor.language.brackets": [],
    // 可以指定 brackets 自定义颜色，因为默认 brackets 颜色是不开启的
    // "editor.language.colorizedBracketPairs": []
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json, jsonc]": {
    "editor.defaultFormatter": "vscode.json-language-features"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[vue]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnPaste": true,
  "editor.formatOnSave": true,
  // 以下是和 airbnb 的 eslint 保持一致
  "prettier.arrowParens": "always", // 箭头函数如果只有一个参数，添加括号
  "prettier.endOfLine": "lf",
  "prettier.ignorePath": ".prettierignore",
  "prettier.jsxSingleQuote": true,
  "prettier.printWidth": 100,
  "prettier.semi": true,
  "prettier.singleQuote": true,
  "prettier.tabWidth": 2,
  // 行尾逗号,默认none,可选 none|es5|all
  // es5 包括es5中的数组、对象
  // all 包括函数对象等所有可选
  "prettier.trailingComma": "all",
  "prettier.useEditorConfig": false,
  "prettier.useTabs": false // 插入空格而不是 tab
}
```

# 如何使用该项目

## 项目中安装必要依赖

```bash
yarn add @me-tool/eslint-prettier-ts-config --save-dev

#
yarn add eslint prettier husky lint-staged --save-dev
```

## 项目使用引用

### ESLint

> 在项目的根目录下，创建 `.eslintrc.js` 文件

```javascript
module.exports = {
  extends: ['@me-tool/eslint-prettier-config'],
  parserOptions: {
    project: './tsconfig.json', // 如果不是 TS 项目可以忽略
  },
  rules: {
    // 自定义规则
  },
};
```

> 配置完成之后可以使用如下代码检查是否正确应用

```bash
npx eslint --print-config any_js_file
```

### Prettier

> 配置文件格式优先级, Prettier 使用 `cosmiconfig` 支持配置文件
>
> `cosmiconfig` 是一种常用的配置文件读取工具，按照下述顺序沿文件树寻找配置文件，找到则停止
>
> 当同一个目录下有多个不同格式的配置文件时，Prettier 只会使用一个。
>
> `Notice`: 该项目使用 .prettierrc.js 只是为了更好的标注注释

```text
Prettier 会按照以下优先级（从高到低）读取：

package.json 中的 `prettier` 字段
.prettierrc YAML 或 JSON 格式
  .prettierrc.json
  .prettierrc.yaml
.prettierrc.yml
.prettierrc.js
.prettier.config.js
.prettierrc.toml
```

> 在 package.json 中添加 `prettier` 字段

```javascript
{
  // ...
 "prettier": "@me-tool/eslint-prettier-ts-config/.prettierrc.js",
}
```

### husky

> `husky` 主流是 `4.\*` 和 `6.\*` 两个版本，在 https://zhuanlan.zhihu.com/p/366786798 中有说明具体的区别和使用方式，这里只阐述 `6.\*` 的配置

```bash
# 使用 husky 进行初始化
npx husky install

# 添加 git hooks，运行一下命令创建 git hooks
npx husky add .husky/pre-commit "npm run lint"
```

> `husky install` 已经过期，可以直接使用 `husky` 来替代，且注意会自动在 `package.json` 中添加 `prepare` script，需要手动修改如下

``` diff
# 防止出现使用 npm install --producttion 的方式，导致执行 prepare 错误
- "prepare": "husky"
+ "prepare": "if [ \"$NODE_ENV\" != \"production\" ]; then husky; fi"
```

### lint-staged

> package.json

```json
{
  "scripts": {
    "lint": "lint-staged"
  },
  "lint-staged": {
    "*.ts": ["prettier --write", "eslint --fix", "git add"],
    "*.js": ["prettier --write", "eslint --cache --fix", "git add"],
    "*.vue": ["prettier --write", "eslint --cache --fix", "git add"],
    "*.{json,md,yml,css}": ["prettier --write", "git add"]
  }
}
```

# Feature

[ ] 自动注入相应配置特别是 editor-config，这个应该放入到 @me-tool/cli 中

# Tips

## 如何处理 ESLint 和 Prettier 的冲突问题

> 内容参考 https://juejin.cn/post/7012160233061482532
>
> 让 `eslint` 只负责代码质量检测而让 `prettier` 负责美化呢: `eslint-config-prettier` + `eslint-plugin-prettier`

1. `eslint-config-prettier` 的作用是关闭 `eslint` 中与 `prettier` 相互冲突的规则。
2. `eslint-plugin-prettier` 的作用是赋予 `eslint` 用 `prettier` 格式化代码的能力。

```text
// 安装依赖
yarn add eslint-config-prettier eslint-plugin-prettier -D

// .eslintrc
{
   // 其余的配置
 - "extends": ["eslint:recommended", "standard"]
 + "extends": ["eslint:recommended", "standard",  "plugin:prettier/recommended"]
  // 其余的配置
}
```

关键在于新增加的 `plugin:prettier/recommended` 这个规则。让我们看看它具体做了什么

```javascript
// node_modules/eslint-plugin-prettier/eslint-plugin-prettier.js
module.exports = {
  // plugin:prettier/recommended 就是加载这个
  configs: {
    recommended: {
      extends: ['prettier'],
      plugins: ['prettier'],
      rules: {
        'prettier/prettier': 'error',
        'arrow-body-style': 'off',
        'prefer-arrow-callback': 'off',
      },
    },
  },
  // 其他的
};
```

`plugin:prettier/recommended` 这个语法就是加载了 `node_modules/eslint-plugin-prettier/eslint-plugin-prettier.js` 文件导出的 `configs` 中的 `recommended` 配置项。下面解析他们分别做了什么。

1. `extends: ['prettier']`: 通过 `eslint-config-prettier` 关闭 `eslint` 和 `prettier` 相冲突的规则。
2. `plugins: ['prettier']`: 加载 `eslint-plugin-prettier`，赋予 `eslint` 用 `prettier` 格式化文档的功能
3. `'prettier/prettier': 'error'`: 让代码文件中不符合 `prettier` 格式化规则的都标记为错误，结合 `vscode-eslint` 插件便可以看到这些错误被标记为红色，当运行 `eslint --fix` 命令时，将自动修复这些错误。
4. `arrow-body-style` 和 `prefer-arrow-callback`: 这两个规则在 `eslint` 和 `prettier` 中存在不可解决的冲突，所以关闭掉。

至此, prettier 和 eslint 便可以无冲突协作，保存时候也能自动修复并格式化代码了。
