// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // Edge Functions run on Deno, which resolves `npm:` imports itself.
    files: ['supabase/functions/**/*.ts'],
    rules: { 'import/no-unresolved': ['error', { ignore: ['^npm:'] }] },
  },
]);
