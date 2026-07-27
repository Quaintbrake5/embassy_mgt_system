/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/services/*.ts',
    'src/middleware/*.ts',
    'src/controllers/*.ts',
    '!src/generated/**',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|morgan|helmet|express-rate-limit)/)',
  ],
};