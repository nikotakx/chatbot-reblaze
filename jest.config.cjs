/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  testMatch: [
    '**/__tests__/unit/**/*.test.[jt]s?(x)',
    '**/__tests__/integration/**/*.test.[jt]s?(x)',
    '!**/__tests__/unit/client/**/*.test.[jt]s?(x)', // Exclude client tests
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};