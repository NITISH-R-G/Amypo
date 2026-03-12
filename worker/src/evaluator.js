const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { executeDomTests } = require('./utils/domTestEngine');
const { executeCssTests } = require('./utils/cssTestEngine');
const { executeInteractions } = require('./utils/interactionEngine');
const { generateVisualDiff } = require('./utils/visualDiffEngine');
const { calculatePartialScores } = require('./utils/scoringEngine');

/**
 * Runs the student code in a sandboxed Puppeteer environment.
 */
async function evaluateSubmission(runId, submissionId, htmlCode, cssCode, jsCode, testSpec, baselines, allowedDomains = [], job = null) {
  const startTime = Date.now();
  const consoleErrors = [];
  const runIdStr = String(runId);
  // In Docker, artifacts are mounted at `/app/artifacts`. Using `process.cwd()` keeps this
  // stable across environments (worker runs from `/app/worker`).
  const artifactsPath = path.resolve(process.cwd(), '..', 'artifacts', runIdStr);
  fs.mkdirSync(artifactsPath, { recursive: true });

  if (job) await job.updateProgress({ stage: 'Launching sandbox' });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  // ====== ANTI-CHEATING SANDBOX UPGRADE ======
  await page.evaluateOnNewDocument(() => {
    // 1. Disable localStorage & sessionStorage
    Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('localStorage is disabled in sandbox'); } });
    Object.defineProperty(window, 'sessionStorage', { get: () => { throw new Error('sessionStorage is disabled in sandbox'); } });
    
    // 2. Disable service workers
    if (navigator.serviceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined });
    }
    
    // 3. Block iframes
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName, options) {
      if (tagName && tagName.toLowerCase() === 'iframe') {
        throw new Error('iframes are disabled in sandbox');
      }
      return originalCreateElement.call(document, tagName, options);
    };
    
    // 4. Disable eval
    window.eval = function() { throw new Error('eval() is disabled in sandbox'); };
  });

  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.protocol === 'data:' || allowedDomains.includes(url.hostname)) {
      request.continue();
    } else {
      request.abort();
    }
  });

  page.on('pageerror', error => consoleErrors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const buildContent = (html, css, js) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>${css || ''}</style>
      </head>
      <body>
        ${html || ''}
        <script>
          // Intercept alerts so interaction tests can assert the click behavior without hanging the run.
          window.__alerts = [];
          window.alert = (msg) => { window.__alerts.push(String(msg)); };
        </script>
        <script>
          try { ${js || ''} } catch (e) { console.error(e); }
        </script>
      </body>
      </html>
    `;

  const disableAnimationsCss = `
    * {
      animation: none !important;
      transition: none !important;
    }
  `;

  const safeSetContent = async (content, stageLabel) => {
    try {
      if (job && stageLabel) await job.updateProgress({ stage: stageLabel });
      // Avoid hard-failing on networkidle2 timeouts; stabilize separately.
      await page.setContent(content, { timeout: 10000, waitUntil: 'load' });
      await page.addStyleTag({ content: disableAnimationsCss });
      await stabilize();
      return true;
    } catch (e) {
      consoleErrors.push(e.name === 'TimeoutError' ? 'Timeout Exceeded' : e.message);
      return false;
    }
  };

  const stabilize = async () => {
    // Keep this small to avoid slowing down jobs; goal is stable screenshots.
    try {
      if (job) await job.updateProgress({ stage: 'Waiting for network idle' });
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 8000 });
    } catch (_) {
      // If networkidle isn't available or times out, continue with a small delay.
    }
    await new Promise(r => setTimeout(r, 150));
  };

  try {
    const viewports = testSpec?.viewports || [{ name: 'desktop', width: 1366, height: 768 }];
    
    let domResults = [];
    let cssResults = [];
    let layoutHints = [];
    const visualArtifacts = [];
    let aggregatedVisualScore = 0;

    for (let i = 0; i < viewports.length; i++) {
      const vp = viewports[i];
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });

      // Generate expected screenshot from baseline code (preferred) or baseline image (fallback).
      const expectedImgName = `expected_${vp.name}.png`;
      const expectedImgPath = path.join(artifactsPath, expectedImgName);
      let expectedReady = false;

      // STEP 2 — Load baseline image generated by trainer (preferred)
      const baseline = baselines?.find(b => b.viewport === vp.name);
      if (baseline && baseline.reference_image_path && fs.existsSync(baseline.reference_image_path)) {
        try {
          fs.copyFileSync(baseline.reference_image_path, expectedImgPath);
          expectedReady = true;
        } catch (_) {
          // leave expectedReady false; we'll attempt baseline-code rendering below
        }
      }

      // Fallback: render expected from baseline code if present (still produces expected_{viewport}.png)
      if (!expectedReady && (testSpec?.baseline?.html || testSpec?.baseline?.css || testSpec?.baseline?.js)) {
        if (job) await job.updateProgress({ stage: `Rendering expected baseline (${vp.name})` });
        const expectedContent = buildContent(testSpec?.baseline?.html, testSpec?.baseline?.css, testSpec?.baseline?.js);
        const ok = await safeSetContent(expectedContent, `Rendering expected baseline (${vp.name})`);
        if (ok) {
          await page.screenshot({ path: expectedImgPath, fullPage: true });
          expectedReady = true;
        }
      }

      // Render student submission
      const studentContent = buildContent(htmlCode, cssCode, jsCode);
      // STEP 1 — Capture student screenshot (disable animations + wait for stability)
      const studentOk = await safeSetContent(studentContent, `Rendering student submission (${vp.name})`);
      if (!studentOk) {
        visualArtifacts.push({
          viewport: vp.name,
          status: 'failed',
          expected: expectedReady ? `/artifacts/${runIdStr}/expected_${vp.name}.png` : null,
          actual: null,
          diff: null,
          diffPercent: null,
          visualScore: 0,
          hotspots: []
        });
        continue;
      }

      // Run interactions if specified
      if (testSpec?.tests?.interactions) {
        if (job) await job.updateProgress({ stage: `Running interaction tests (${vp.name})` });
        await executeInteractions(page, testSpec.tests.interactions);
      }

      // Run DOM & CSS assertions on first viewport only
      if (i === 0) {
        if (testSpec?.tests?.dom) {
          if (job) await job.updateProgress({ stage: 'Running DOM tests' });
          domResults = await executeDomTests(page, testSpec.tests.dom);
        }
        if (testSpec?.tests?.css) {
          if (job) await job.updateProgress({ stage: 'Running CSS tests' });
          cssResults = await executeCssTests(page, testSpec.tests.css);
        }

        // ====== CSS LAYOUT ERROR HEURISTICS ======
        layoutHints = await page.evaluate(() => {
          const hints = [];
          const containers = Array.from(document.querySelectorAll('div, section, article, main, header, footer, nav, aside.container, .wrap, .wrapper'));
          
          containers.forEach(c => {
             const style = window.getComputedStyle(c);
             // Detect missing flexbox on explicit row-like items
             if (style.display === 'block' && c.children.length > 1) {
                let isRow = true;
                let prevTop = -1;
                for (let child of c.children) {
                   const bounds = child.getBoundingClientRect();
                   if (prevTop === -1) prevTop = bounds.top;
                   else if (Math.abs(bounds.top - prevTop) > 10) { isRow = false; break; }
                }
                if (isRow && c.children.length > 1 && !style.className?.includes('flex')) {
                   hints.push(`Potential missing 'display: flex' on element masquerading as a row: <${c.tagName.toLowerCase()} class="${c.className}">`);
                }
             }
             // Overflow issues
             if (c.scrollHeight > c.clientHeight && style.overflow === 'visible') {
                hints.push(`Content overflows container without scrolling context: <${c.tagName.toLowerCase()} class="${c.className}">`);
             }
          });
          return hints;
        });
      }

      // Capture actual screenshot
      if (job) await job.updateProgress({ stage: `Capturing screenshots (${vp.name})` });
      const actualImgName = `actual_${vp.name}.png`;
      const actualImgPath = path.join(artifactsPath, actualImgName);
      await page.screenshot({ path: actualImgPath, fullPage: true });

      // Visual Diff
      // Only score visual diff when an expected baseline exists; otherwise leave as null.
      let diffPercentage = null;
      let diffHotspots = [];
      let visualStatus = 'passed';
      let diffImgName = null;
      if (expectedReady && fs.existsSync(expectedImgPath)) {
        if (job) await job.updateProgress({ stage: `Computing visual diff (${vp.name})` });
        diffImgName = `diff_${vp.name}.png`;
        const diffImgPath = path.join(artifactsPath, diffImgName);
        try {
          const diffRes = await generateVisualDiff(expectedImgPath, actualImgPath, diffImgPath);
          diffPercentage = diffRes.diffPercentage;
          // Convert pixel hotspots to percentages for the existing UI overlay.
          if (Array.isArray(diffRes.hotspots) && diffRes.width && diffRes.height) {
            diffHotspots = diffRes.hotspots.map(b => ({
              x: (b.x / diffRes.width) * 100,
              y: (b.y / diffRes.height) * 100,
              width: (b.width / diffRes.width) * 100,
              height: (b.height / diffRes.height) * 100
            }));
          } else {
            diffHotspots = [];
          }
        } catch (e) {
          visualStatus = 'failed';
          consoleErrors.push('Visual comparison could not be generated.');
          consoleErrors.push(e.message);
        }
      } else {
        visualStatus = 'failed';
      }
      
      const vpScore = calculatePartialScores([], [], diffPercentage, testSpec?.rubric).visual;
      aggregatedVisualScore += vpScore;

      visualArtifacts.push({
        viewport: vp.name,
        status: visualStatus,
        expected: expectedReady ? `/artifacts/${runIdStr}/expected_${vp.name}.png` : null,
        actual: `/artifacts/${runIdStr}/${actualImgName}`,
        diff: diffImgName ? `/artifacts/${runIdStr}/${diffImgName}` : null,
        diffPercent: diffPercentage,
        visualScore: vpScore,
        hotspots: diffHotspots
      });
    }

    if (job) await job.updateProgress({ stage: `Calculating score` });
    const avgVisualScore = viewports.length > 0 ? aggregatedVisualScore / viewports.length : testSpec?.rubric?.visual || 10;
    const finalScores = calculatePartialScores(domResults, cssResults, null, testSpec?.rubric);
    finalScores.visual = avgVisualScore;

    const failedTests = [...domResults, ...cssResults].filter(r => !r.passed);

    // Optional DOM Snapshot on failure
    if (failedTests.length > 0 || avgVisualScore < (testSpec?.rubric?.visual || 10)) {
      const htmlDump = await page.evaluate(() => document.documentElement.outerHTML);
      fs.writeFileSync(path.join(artifactsPath, 'dom_snapshot.html'), htmlDump);
    }

    // ====== Generate PDF Report ======
    if (job) await job.updateProgress({ stage: `Generating PDF Report` });
    const totalScoreCalc = finalScores.html + finalScores.css + finalScores.js + finalScores.visual;
    const reportHtml = `
      <html><head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111827; } 
        h1 { color: #4f46e5; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; } 
        h2 { margin-top: 30px; color: #374151; }
        .score { font-size: 56px; font-weight: 900; color: ${totalScoreCalc >= 80 ? '#10b981' : '#f97316'}; }
        .metrics { display: flex; gap: 20px; font-weight: bold; margin-top: 10px; color: #4b5563; }
        ul { background: #f9fafb; padding: 20px 40px; border-radius: 8px; border: 1px solid #e5e7eb; list-style-type: square; }
        li { margin-bottom: 8px; font-family: monospace; color: #b91c1c; }
      </style>
      </head>
      <body>
        <h1>Assessment Evaluation Report</h1>
        <p>Submission ID: ${submissionId}</p>
        <div style="margin: 40px 0;">
          <span style="font-size: 14px; text-transform: uppercase; font-weight: bold; color: #6b7280;">Total Score</span><br/>
          <span class="score">${totalScoreCalc}</span> <span style="font-size: 24px; color: #9ca3af; font-weight: bold;">/ 100</span>
          <div class="metrics">
            <span>HTML: ${finalScores.html}/20</span>
            <span>CSS: ${finalScores.css}/35</span>
            <span>JS: ${finalScores.js}/35</span>
            <span>Visual: ${finalScores.visual}/10</span>
          </div>
        </div>
        
        <h2>Failed Assertions & Errors</h2>
        ${failedTests.length === 0 && consoleErrors.length === 0 && layoutHints.length === 0 ? '<p style="color: #10b981; font-weight: bold;">Perfect execution. No errors detected.</p>' : ''}
        
        ${failedTests.length > 0 ? `<h3>Failed Tests</h3><ul>${failedTests.map(t => `<li>${t.hint || t.selector}</li>`).join('')}</ul>` : ''}
        ${consoleErrors.length > 0 ? `<h3>Console Errors</h3><ul>${consoleErrors.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
        ${layoutHints.length > 0 ? `<h3>Layout Heuristics</h3><ul>${layoutHints.map(h => `<li style="color: #c2410c;">${h}</li>`).join('')}</ul>` : ''}
      </body>
      </html>
    `;
    await page.setContent(reportHtml, { waitUntil: 'load' });
    await page.pdf({ path: path.join(artifactsPath, 'report.pdf'), format: 'A4', printBackground: true });

    const execTime = Date.now() - startTime;
    return {
      scores: finalScores,
      failedTests,
      consoleErrors,
      layoutHints,
      visualArtifacts,
      timings: { puppeteer_eval: `${execTime}ms` }
    };
  } catch (error) {
    consoleErrors.push(error.name === 'TimeoutError' ? 'Timeout Exceeded' : error.message);
    const fallbackRubric = testSpec?.rubric || { html: 20, css: 35, js: 35, visual: 10 };
    return { 
      scores: { html: 0, css: 0, js: 0, visual: 0 }, 
      failedTests: [], 
      consoleErrors,
      layoutHints: [],
      visualArtifacts: [], 
      timings: {} 
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

module.exports = { evaluateSubmission };
