/**
 * Executes interaction steps strictly through Puppeteer layer to mimic real user input.
 */
async function executeInteractions(page, interactionSpec) {
  if (!interactionSpec || !interactionSpec.length) return;

  for (const step of interactionSpec) {
    try {
      if (step.action === 'click') {
        // Wait for it to be visible if requested
        if (step.waitForVisible) {
          await page.waitForSelector(step.selector, { visible: true, timeout: 2000 });
        }
        await page.click(step.selector);
      } 
      else if (step.action === 'hover') {
        if (step.waitForVisible) {
          await page.waitForSelector(step.selector, { visible: true, timeout: 2000 });
        }
        await page.hover(step.selector);
      }
      else if (step.action === 'type') {
        const valueToType = step.value || '';
        await page.type(step.selector, valueToType, { delay: 10 }); // Typing delay simulates human
      } 
      else if (step.action === 'scroll') {
        await page.evaluate((s) => { 
          const el = document.querySelector(s);
          if (el) el.scrollIntoView(); 
        }, step.selector);
      } 
      else if (step.action === 'keypress') {
        await page.keyboard.press(step.key);
      }
      
      // Implicit or explicit network/JS idle waits
      const delay = parseInt(step.delay) || 50;
      await new Promise(r => setTimeout(r, delay));
      
    } catch (err) {
      console.warn(`Interaction failed for step ${JSON.stringify(step)}:`, err.message);
      // We don't throw here to allow remaining evaluation to proceed, 
      // but structural evaluation might fail later due to missed state changes.
    }
  }
}

module.exports = { executeInteractions };
