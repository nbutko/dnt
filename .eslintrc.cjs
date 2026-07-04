module.exports = {
  root: true,
  env: { browser: true, es2023: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.app.json', './tsconfig.node.json'],
  },
  extends: [
    'airbnb',
    'airbnb-typescript',
    'airbnb/hooks',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint'],
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      typescript: { alwaysTryTypes: true },
    },
  },
  ignorePatterns: ['dist', 'node_modules', '*.cjs', 'vite.config.ts'],
  rules: {
    // No `function` keyword: arrow functions only (object method shorthand is unaffected).
    'no-restricted-syntax': [
      'error',
      {
        selector: 'FunctionDeclaration',
        message: 'Use an arrow function instead of a function declaration.',
      },
      {
        selector: 'FunctionExpression',
        message: 'Use an arrow function instead of a function expression.',
      },
      {
        selector: 'ClassDeclaration',
        message: 'Use a factory function instead of a class.',
      },
      {
        selector: 'ClassExpression',
        message: 'Use a factory function instead of a class.',
      },
    ],
    'no-console': 'warn',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
    'react/function-component-definition': [
      'error',
      { namedComponents: 'arrow-function', unnamedComponents: 'arrow-function' },
    ],
    'import/prefer-default-export': 'off',
    'import/extensions': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          'vite.config.ts',
          'src/test/**',
          'src/**/__tests__/**',
          'src/**/*.test.{ts,tsx}',
          'src/engine/sim/**',
        ],
      },
    ],
    'react/require-default-props': 'off',
  },
  overrides: [
    {
      // mulberry32 is a bitwise-arithmetic PRNG by nature; airbnb's no-bitwise
      // ban is right everywhere else, but fights the algorithm here.
      files: ['src/engine/rng.ts'],
      rules: { 'no-bitwise': 'off', 'operator-assignment': 'off' },
    },
  ],
}
