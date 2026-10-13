import baseConfig from './packages/eslint-config/index.mjs';

export default [
  {
    ignores: [
      '**/.next/**',
      '**/.next-*/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
      '**/.expo/**',
      '**/coverage/**',
      '**/next-env.d.ts',
      'apps/web/public/pdf.worker-*.min.mjs',
    ],
  },
  ...baseConfig,
];
