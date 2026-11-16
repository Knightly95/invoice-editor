const config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'jest-fixed-jsdom',
  testEnvironmentOptions: {
    html: '<!DOCTYPE html>',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    customExportConditions: [''],
  },
  setupFilesAfterEnv: ['<rootDir>/src/specs/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/specs/mocks/styleMock.js',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$':
      '<rootDir>/src/specs/mocks/styleMock.js',
    '^api$': '<rootDir>/src/api/index.tsx',
    '^api/(.*)$': '<rootDir>/src/api/$1',
    '^app/(.*)$': '<rootDir>/src/app/$1',
    '^helpers/(.*)$': '<rootDir>/src/helpers/$1',
    '^hocs/(.*)$': '<rootDir>/src/hocs/$1',
    '^hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^specs/(.*)$': '<rootDir>/src/specs/$1',
    '^types/(.*)$': '<rootDir>/src/types/$1',
    '^ui/(.*)$': '<rootDir>/src/ui/$1',
  },
  transform: {
    '^.+\\.(ts|js)x?$': 'ts-jest',
    'node_modules/until-async/.*\\.js$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true,
          esModuleInterop: true,
        },
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!until-async)'],
  coverageProvider: 'v8',
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/react-app-env.d.ts',
    '!src/api/gen/**',
    '!src/specs/**',
  ],
}

export default config
