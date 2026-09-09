import "@testing-library/jest-dom/vitest";
window.IS_REACT_ACT_ENVIRONMENT = true;
window.HTMLElement.prototype.scrollIntoView = function() {};
