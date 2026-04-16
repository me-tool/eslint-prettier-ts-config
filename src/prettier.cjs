/** @type {import('prettier').Config} */
const prettierConfig = {
  semi: true,
  singleQuote: true,
  jsxSingleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  printWidth: 100,
  arrowParens: 'always',
  bracketSpacing: true,
  bracketSameLine: true,
  endOfLine: 'lf',
  htmlWhitespaceSensitivity: 'ignore',
  vueIndentScriptAndStyle: true,
};

module.exports = prettierConfig;
