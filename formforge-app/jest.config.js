module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-reanimated)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterFrameworks: ['@testing-library/jest-native/extend-expect'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'stores/**/*.ts',
    'components/**/*.tsx',
    '!**/*.d.ts',
  ],
};
