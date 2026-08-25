/*
  Two projects, because they cannot share an environment.

  The `app` project runs under jest-expo, which is the only way to exercise
  React Native components. It cannot touch drizzle-orm/expo-sqlite: that needs
  the native module, which does not exist under Jest.

  The `node` project exists so the data layer is genuinely tested rather than
  only its pure helpers. It runs the SAME src/data/schema.ts and the SAME
  generated migrations against better-sqlite3 in memory, which also proves the
  migrations apply before any device sees them. Spec section 13 milestone 2
  calls for a scripted replay whose results match the web app's; this is where
  that lives.
*/
module.exports = {
  projects: [
    {
      displayName: 'app',
      preset: 'jest-expo',
      setupFiles: ['<rootDir>/jest.setup.js'],
      testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
      testPathIgnorePatterns: ['/node_modules/', '/.expo/', '\.node\.test\.ts$'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
    },
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/*.node.test.ts'],
      transform: {
        '^.+\.tsx?$': [
          'babel-jest',
          {
            presets: [
              ['@babel/preset-env', { targets: { node: 'current' } }],
              '@babel/preset-typescript',
            ],
          },
        ],
      },
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
    },
  ],
};
