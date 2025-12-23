/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {},
  transformIgnorePatterns: [
    'node_modules/(?!supertest)',
  ],
  testMatch: [
    '<rootDir>/src/tests/**/*.test.js',
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/server.js',
  ],
};