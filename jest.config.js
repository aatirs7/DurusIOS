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
      /* The repo's own babel.config.js (babel-preset-expo). @babel/preset-env,
         which this used to name, is not installed, so the project could not
         run at all. */
      transform: { '^.+\.tsx?$': 'babel-jest' },
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
    },
  ],
};
