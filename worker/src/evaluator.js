const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { executeDomTests } = require('./domTestEngine');
const { executeCssTests } = require('./cssTestEngine');
const { executeInteractions } = require('./interactionEngine');
const { generateVisualDiff } = require('./visualDiffEngine');
const { calculatePartialScores } = require('./scoringEngine');

/**
 * Runs the student code in a sandboxed Puppeteer environment.
 */
async function evaluateSubmission(submissionId, htmlCode, cssCode, jsCode, testSpec, baselines, allowedDomains = [], job = null) {
  const startTime = Date.now();
  const consoleErrors = [];
  const artifactsPath = path.join(__dirname, '../../../artifacts', submissionId); // Store artifacts here
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

  try {
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>${cssCode}</style>
      </head>
      <body>
        ${htmlCode}
        <script>
          try { ${jsCode} } catch (e) { console.error(e); }
        </script>
      </body>
      </html>
    `;

    const viewports = testSpec?.viewports || [{ name: 'desktop', width: 1366, height: 768 }];
    
    let domResults = [];
    let cssResults = [];
    let layoutHints = [];
    const visualArtifacts = [];
    let aggregatedVisualScore = 0;

    for (let i = 0; i < viewports.length; i++) {
      const vp = viewports[i];
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.setContent(content, { timeout: 5000, waitUntil: 'load' });

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
      let diffPercentage = 0;
      let diffHotspots = [];
      const baseline = baselines?.find(b => b.viewport === vp.name);
      
      let diffImgName = null;
      if (baseline && fs.existsSync(baseline.reference_image_path)) {
        if (job) await job.updateProgress({ stage: `Computing visual diff (${vp.name})` });
        diffImgName = `diff_${vp.name}.png`;
        const diffImgPath = path.join(artifactsPath, diffImgName);
        const diffRes = await generateVisualDiff(baseline.reference_image_path, actualImgPath, diffImgPath);
        diffPercentage = diffRes.diffPercentage;
        diffHotspots = diffRes.hotspots || [];
      }
      
      const vpScore = calculatePartialScores([], [], diffPercentage, testSpec?.rubric).visual;
      aggregatedVisualScore += vpScore;

      visualArtifacts.push({
        viewport: vp.name,
        expected: baseline ? baseline.reference_image_path : null,
        actual: actualImgPath,
        diff: diffImgName ? path.join(artifactsPath, diffImgName) : null,
        diffPercentage,
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
