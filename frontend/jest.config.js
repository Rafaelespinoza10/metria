/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Loads react-native-worklets' non-native implementations (Reanimated 4 under Jest).
  resolver: 'react-native-worklets/jest/resolver',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets|react-native-safe-area-context|zustand))',
  ],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
