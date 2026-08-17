/* eslint-disable @typescript-eslint/no-require-imports */

// Deterministic device locale/calendar for every test.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'UTC' }],
}));

// In-memory secure store.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    getItemAsync: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    deleteItemAsync: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
});

const { setUpTests } = require('react-native-reanimated');
setUpTests();
