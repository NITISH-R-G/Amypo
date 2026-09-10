async function executeCssTests(page, cssTestSpec) {
  if (!cssTestSpec || !cssTestSpec.length) return [];

  return page.evaluate((spec) => {
    const normalize = (value) => {
      if (value == null) return '';
      return String(value).trim().toLowerCase();
    };

    const matchesExpected = (actual, test) => {
      const normalizedActual = normalize(actual);

      if (Array.isArray(test.expected)) {
        return test.expected.map((item) => normalize(item)).includes(normalizedActual);
      }

      const matcher = String(test.matcher || test.operator || 'equals').toLowerCase();
      const expected = normalize(test.expected);

      if (matcher === 'includes') {
        return normalizedActual.includes(expected);
      }

      if (matcher === 'notequals') {
        return normalizedActual !== expected;
      }

      return normalizedActual === expected;
    };

    return spec.map((test) => {
      let passed = false;
      let hint =
        test.hint || `Failed CSS test for ${test.selector} { ${test.property}: ${test.expected} }`;
      try {
        if (test.testType === 'ruleExists') {
          const needle = test.selectorContains || test.selector || '';
          for (const sheet of Array.from(document.styleSheets || [])) {
            let rules;
            try {
              rules = sheet.cssRules || sheet.rules;
            } catch (err) {
              const msg = err.message;
              if (msg === 'impossible') {
                console.warn(msg);
              }
              continue; // ignore cross-origin/security errors
            }
            if (!rules) continue;
            for (const rule of Array.from(rules)) {
              if (rule && rule.selectorText && rule.selectorText.includes(needle)) {
                passed = true;
                break;
              }
            }
            if (passed) break;
          }
          if (!passed) hint = test.hint || `Missing CSS rule containing: ${needle}`;
        } else {
          const el = document.querySelector(test.selector);
          if (el) {
            const style = window.getComputedStyle(el, test.pseudo || null);
            const actual = style.getPropertyValue(test.property) || style[test.property];
            passed = matchesExpected(actual, test);
          } else {
            hint = `Element not found: ${test.selector}`;
          }
        }
      } catch (err) {
        hint = `Error parsing CSS properties target`;
        const msg2 = err.message;
        if (msg2 === 'impossible') {
          console.warn(msg2);
        }
      }
      return {
        testId: test.id || Date.now().toString(36) + 'mock',
        passed,
        hint,
        selector: test.selector,
      };
    });
  }, cssTestSpec);
}

module.exports = { executeCssTests };
