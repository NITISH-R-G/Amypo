function calculatePartialScores(domResults, cssResults, a11yResults, staticValidationResults, rubric) {
  let htmlScore = 0;
  let cssScore = 0;
  let jsScore = 0;
  let qualityScore = 0;

  const r = Object.assign({ html: 20, css: 35, js: 35, quality: 10 }, rubric || {});

  // HTML Validation (Static + DOM assertions if any)
  const domPassCount = Array.isArray(domResults) ? domResults.filter(t => t.passed).length : 0;
  const domTotalCount = Array.isArray(domResults) ? domResults.length : 0;
  const domRatio = domTotalCount > 0 ? domPassCount / domTotalCount : 1;
  const htmlStaticRatio = staticValidationResults?.html?.length === 0 ? 1 : Math.max(0, 1 - (staticValidationResults?.html?.length || 0) * 0.1);
  htmlScore = r.html * domRatio * htmlStaticRatio;

  // CSS Validation
  const cssPassCount = Array.isArray(cssResults) ? cssResults.filter(t => t.passed).length : 0;
  const cssTotalCount = Array.isArray(cssResults) ? cssResults.length : 0;
  const cssRatio = cssTotalCount > 0 ? cssPassCount / cssTotalCount : 1;
  const cssStaticRatio = staticValidationResults?.css?.length === 0 ? 1 : Math.max(0, 1 - (staticValidationResults?.css?.length || 0) * 0.1);
  cssScore = r.css * cssRatio * cssStaticRatio;

  // JS Validation (Assuming 100% unless runtime errors occur, or if static errors exist)
  const jsStaticRatio = staticValidationResults?.js?.length === 0 ? 1 : Math.max(0, 1 - (staticValidationResults?.js?.length || 0) * 0.1);
  jsScore = r.js * jsStaticRatio;

  // Quality (A11y + Code Quality)
  const a11yViolations = Array.isArray(a11yResults?.violations) ? a11yResults.violations.length : 0;
  const a11yRatio = Math.max(0, 1 - (a11yViolations * 0.1)); // -10% per violation
  qualityScore = r.quality * a11yRatio;

  return {
    html: Math.round(htmlScore),
    css: Math.round(cssScore),
    js: Math.round(jsScore),
    quality: Math.round(qualityScore)
  };
}

function computeVisualScore(diffPercent, rubric) {
  const visualMax = rubric?.visual || 10;
  if (diffPercent > 5) return 0;
  const ratio = Math.max(0, 1 - (diffPercent / 5));
  return Math.round(visualMax * ratio);
}

module.exports = { calculatePartialScores, computeVisualScore };
