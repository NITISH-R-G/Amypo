import "@testing-library/jest-dom/vitest";

// Supress "The current testing environment is not configured to support act" warnings in JSDOM testing
global.IS_REACT_ACT_ENVIRONMENT = true;

window.HTMLElement.prototype.scrollIntoView = function() {};
