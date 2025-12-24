module.exports = {
  testEnvironment: 'node',
  testRunner: 'jest-circus/runner',
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.(ts|tsx)$': ['babel-jest', { cwd: __dirname }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  globals: {
    'babel-jest': {
      useESM: true,
    },
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(axios|node-fetch)/)',
  ],
  setupFilesAfterEnv: ['./src/tests/setup.js'],
  testTimeout: 20000,
};
