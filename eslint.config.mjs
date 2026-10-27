import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      // Static assets are served verbatim — they are not source and must not
      // be linted. A minified third-party bundle otherwise produces hundreds
      // of false positives.
      'public/**',
      'next-env.d.ts'
    ]
  },
  ...nextCoreWebVitals,
  ...nextTypeScript
];

export default eslintConfig;