async function executeDomTests(page, domTestSpec) {
  if (!domTestSpec || !domTestSpec.length) return [];
  
  return page.evaluate((spec) => {
    return spec.map(test => {
      let passed = false;
      let hint = test.hint || `Failed DOM test for selector: ${test.selector}`;
      try {
        if (test.assertion === 'alertCalled') {
          passed = Array.isArray(window.__alerts) && window.__alerts.length > 0;
        } else {
          const elements = document.querySelectorAll(test.selector);
          if (test.assertion === 'exists') passed = elements.length > 0;
          else if (test.assertion === 'count') passed = elements.length === test.expected;
        }
      } catch (e) {
        hint = `Invalid selector: ${test.selector}`;
      }
      return { 
        testId: test.id || Math.random().toString(36).substr(2, 9), 
        passed, 
        hint, 
        selector: test.selector 
      };
    });
  }, domTestSpec);
}

module.exports = { executeDomTests };
