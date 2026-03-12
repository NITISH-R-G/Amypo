async function executeCssTests(page, cssTestSpec) {
  if (!cssTestSpec || !cssTestSpec.length) return [];

  return page.evaluate((spec) => {
    return spec.map(test => {
      let passed = false;
      let hint = test.hint || `Failed CSS test for ${test.selector} { ${test.property}: ${test.expected} }`;
      try {
        const el = document.querySelector(test.selector);
        if (el) {
          const style = window.getComputedStyle(el);
          passed = style[test.property] === test.expected;
        } else {
          hint = `Element not found: ${test.selector}`;
        }
      } catch (e) {
        hint = `Error parsing CSS properties target`;
      }
      return { 
        testId: test.id || Math.random().toString(36).substr(2, 9), 
        passed, 
        hint, 
        selector: test.selector 
      };
    });
  }, cssTestSpec);
}

module.exports = { executeCssTests };
