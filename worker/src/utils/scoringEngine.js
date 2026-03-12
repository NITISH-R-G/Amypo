/**
 * Applies the grading rubrics to test results.
 */
/**
 * Applies the grading rubrics to test results.
 */
function calculatePartialScores(domResults, cssResults, a11yResults, rubric) {
  const scores = {
    html: 0,
    css: 0,
    js: 0,
    visual: 0,
    a11y: 0
  };

  const weights = rubric || { html: 20, css: 30, js: 30, visual: 10, a11y: 10 };

  // Calculate HTML/JS DOM assertions
  if (domResults && domResults.length > 0) {
    const passed = domResults.filter(t => t.passed).length;
    const fraction = passed / domResults.length;
    scores.html = Math.round(fraction * weights.html * 10) / 10;
    scores.js = Math.round(fraction * weights.js * 10) / 10; 
  } else {
    scores.html = weights.html;
    scores.js = weights.js;
  }

  // Calculate CSS assertions
  if (cssResults && cssResults.length > 0) {
    const passed = cssResults.filter(t => t.passed).length;
    const fraction = passed / cssResults.length;
    scores.css = Math.round(fraction * weights.css * 10) / 10;
  } else {
    scores.css = weights.css;
  }

  // Calculate Accessibility (A11y) score
  if (a11yResults && a11yResults.violations) {
    const violationsCount = a11yResults.violations.length;
    // Every violation deducts 5 points from the A11y bucket (down to 0)
    const rawA11y = Math.max(0, weights.a11y - (violationsCount * 5));
    scores.a11y = Math.round(rawA11y * 10) / 10;
  } else {
    scores.a11y = weights.a11y;
  }

  return scores;
}

module.exports = { calculatePartialScores };
