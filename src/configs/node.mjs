import pluginN from 'eslint-plugin-n';

export function node() {
  return [pluginN.configs['flat/recommended-module']];
}
