import '@testing-library/jest-dom';

jest.mock('@vercel/kv', () => ({
  kv: {},
}));
