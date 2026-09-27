import '@testing-library/jest-dom/vitest';

// Specs share one browser, so a session one test signs in must not leak into the next file.
afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
