const { HTMLHint } = require('htmlhint');
const stylelint = require('stylelint');
const espree = require('espree');

class StaticValidationService {
  async validateSetup(htmlCode, cssCode, jsCode) {
    const results = {
      html: [],
      css: [],
      js: [],
      isValid: true // Critically invalid syntax will set this to false
    };

    // 1. Validate HTML
    if (htmlCode) {
      const htmlErrors = HTMLHint.verify(htmlCode, {
        'tagname-lowercase': true,
        'attr-lowercase': true,
        'attr-value-double-quotes': true,
        'tag-pair': true,
        'spec-char-escape': true,
        'id-unique': true,
        'src-not-empty': true,
        'title-require': true
      });
      results.html = htmlErrors.map(e => ({
        line: e.line,
        col: e.col,
        message: e.message,
        type: e.type // 'error' or 'warning'
      }));
      // We consider HTML tag pairs missing as critical
      if (htmlErrors.some(e => e.rule.id === 'tag-pair' && e.type === 'error')) {
        results.isValid = false;
      }
    }

    // 2. Validate CSS
    if (cssCode) {
      try {
        const cssResult = await stylelint.lint({
          code: cssCode,
          config: {
            extends: 'stylelint-config-standard'
          }
        });
        
        if (cssResult.errored) {
          const warnings = cssResult.results[0].warnings;
          results.css = warnings.map(w => ({
            line: w.line,
            col: w.column,
            message: w.text,
            type: w.severity
          }));
          // CSS syntax errors (like missing bracket) are critical
          if (warnings.some(w => w.rule === 'CssSyntaxError')) {
            results.isValid = false;
          }
        }
      } catch (err) {
        results.css.push({ message: err.message, type: 'error' });
        results.isValid = false;
      }
    }

    // 3. Validate JS
    if (jsCode) {
      try {
        // ESLint v9+ defaults to flat config and will error if no config file exists.
        // For "syntax validation", a parser check is enough and avoids env/config issues.
        espree.parse(jsCode, {
          ecmaVersion: 'latest',
          sourceType: 'script'
        });
      } catch (err) {
        results.js.push({
          line: err.lineNumber,
          col: err.column,
          message: err.message,
          type: 'error'
        });
        results.isValid = false;
      }
    }

    return results;
  }
}

module.exports = new StaticValidationService();
