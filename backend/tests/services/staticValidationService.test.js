const staticValidationService = require('../../src/services/staticValidationService');

describe('StaticValidationService', () => {
  describe('validateSetup', () => {
    it('should return valid result for empty inputs', async () => {
      const result = await staticValidationService.validateSetup('', '', '');
      expect(result.isValid).toBe(true);
      expect(result.summary.totalErrors).toBe(0);
      expect(result.summary.totalWarnings).toBe(0);
    });

    it('should validate valid HTML', async () => {
      const htmlCode = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <img src="test.png" alt="test" />
</body>
</html>`;
      const result = await staticValidationService.validateSetup(htmlCode, '', '');
      expect(result.isValid).toBe(true);
      expect(result.summary.html.errors).toBe(0);
    });

    it('should detect invalid HTML (missing tag pair)', async () => {
      const htmlCode = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <div>
</body>
</html>`;
      const result = await staticValidationService.validateSetup(htmlCode, '', '');
      expect(result.isValid).toBe(false);
      expect(result.summary.html.errors).toBeGreaterThan(0);
      expect(result.html.some(e => e.ruleId === 'tag-pair')).toBe(true);
    });

    it('should validate valid CSS', async () => {
      const cssCode = `body {
  color: red;
}
`;
      const result = await staticValidationService.validateSetup('', cssCode, '');
      expect(result.isValid).toBe(true);
      expect(result.summary.css.errors).toBe(0);
    });

    it('should detect invalid CSS syntax', async () => {
      const cssCode = `body {
  color: red;
`;
      const result = await staticValidationService.validateSetup('', cssCode, '');
      expect(result.isValid).toBe(false);
      expect(result.summary.css.errors).toBeGreaterThan(0);
      expect(result.css.some(e => e.ruleId === 'CssSyntaxError' || e.message.includes('CssSyntaxError') || e.ruleId === 'stylelint')).toBe(true);
    });

    it('should validate valid JS', async () => {
      const jsCode = `
const a = 1;
console.log(a);
      `;
      const result = await staticValidationService.validateSetup('', '', jsCode);
      expect(result.isValid).toBe(true);
      expect(result.summary.js.errors).toBe(0);
    });

    it('should detect invalid JS syntax', async () => {
      const jsCode = `const a = ;`;
      const result = await staticValidationService.validateSetup('', '', jsCode);
      expect(result.isValid).toBe(false);
      expect(result.summary.js.errors).toBeGreaterThan(0);
      expect(result.js.some(e => e.ruleId === 'parse-error')).toBe(true);
    });

    it('should detect JS linter errors (e.g. no-undef)', async () => {
      const jsCode = `
function test() {
  undeclaredVar = 10;
}
test();
      `;
      const result = await staticValidationService.validateSetup('', '', jsCode);
      expect(result.isValid).toBe(true);
      expect(result.summary.js.errors).toBeGreaterThan(0);
      expect(result.js.some(e => e.ruleId === 'no-undef')).toBe(true);
    });

    it('should calculate total summaries correctly', async () => {
      const htmlCode = `<img />`;
      const cssCode = `body { color: red }`;
      const jsCode = `let b = 1;`;

      const result = await staticValidationService.validateSetup(htmlCode, cssCode, jsCode);
      expect(result.summary.totalErrors).toBe(result.summary.html.errors + result.summary.css.errors + result.summary.js.errors);
      expect(result.summary.totalWarnings).toBe(result.summary.html.warnings + result.summary.css.warnings + result.summary.js.warnings);
    });

    it('should handle stylelint exception gracefully', async () => {
      const stylelint = require('stylelint');
      jest.spyOn(stylelint, 'lint').mockRejectedValueOnce(new Error('Mocked stylelint error'));
      const result = await staticValidationService.validateSetup('', 'body { color: red; }', '');
      expect(result.isValid).toBe(false);
      expect(result.css.some(e => e.message === 'Mocked stylelint error')).toBe(true);
      expect(result.summary.css.errors).toBe(1);
    });

    it('should generate warnings for JS code', async () => {
       const jsCode = `
          let a = 1;
          if (a == 1) { // eqeqeq warning
             // do something
          }
       `;
       const result = await staticValidationService.validateSetup('', '', jsCode);
       expect(result.isValid).toBe(true);
       expect(result.summary.js.warnings).toBeGreaterThan(0);
       expect(result.js.some(e => e.ruleId === 'eqeqeq')).toBe(true);
    });
  });
});
