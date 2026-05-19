import baseConfig from './packages/eslint-config/index.mjs';

export default [
  {
    ignores: [
      '**/.next/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      '**/coverage/**',
    ],
  },
  ...baseConfig,
];
