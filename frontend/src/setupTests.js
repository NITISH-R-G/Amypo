import "@testing-library/jest-dom";

// Ensure act environment warnings are suppressed/handled nicely in Vitest + React 18
if (typeof globalThis !== 'undefined') {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
}
