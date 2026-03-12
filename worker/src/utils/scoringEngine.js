/**
 * Applies the grading rubrics to test results.
 */
function calculatePartialScores(domResults, cssResults, diffPercentage, rubric) {
  const scores = {
    html: 0,
    css: 0,
    js: 0, // In this automated context, DOM changes verify logic
    visual: 0
  };

  const weights = rubric || { html: 20, css: 35, js: 35, visual: 10 };

  // Calculate HTML/JS DOM assertions
  if (domResults && domResults.length > 0) {
    const passed = domResults.filter(t => t.passed).length;
    // Assuming half DOM checks map to HTML rubric and half to JS interactions rubric, 
    // or aggregate them based on specification.
    // For simplicity, overall DOM verification counts toward JS/HTML combo based on spec.
    const fraction = passed / domResults.length;
    scores.html = Math.round(fraction * weights.html * 10) / 10;
    scores.js = Math.round(fraction * weights.js * 10) / 10; 
  } else {
    // If no tests defined but runs successfully, grant full
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

  // Calculate Visual Diff bucket mapping
  if (typeof diffPercentage === 'number') {
    if (diffPercentage <= 1) scores.visual = weights.visual; // full marks
    else if (diffPercentage <= 3) scores.visual = weights.visual * 0.8;
    else if (diffPercentage <= 6) scores.visual = weights.visual * 0.5;
    else scores.visual = 0;
  }

  return scores;
}

module.exports = { calculatePartialScores };
