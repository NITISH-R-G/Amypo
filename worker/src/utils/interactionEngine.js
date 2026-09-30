/**
 * Executes interaction steps strictly through Puppeteer layer to mimic real user input.
 */
async function executeInteractions(page, interactionSpec) {
  if (!Array.isArray(interactionSpec) || interactionSpec.length === 0) return;

  const pause = async (delay) => {
    const ms = Number(delay);
    if (!Number.isFinite(ms) || ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  };

  const handleTypeAction = async (step, selector) => {
    const valueToType = String(step?.value || '');
    if (step?.clear) {
      await page.click(selector, { clickCount: 3 });
      await page.keyboard.press('Backspace');
    }
    await page.type(selector, valueToType, { delay: Number(step?.typingDelay) > 0 ? Number(step.typingDelay) : 10 });
  };

  const handleScrollAction = async (selector) => {
    await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (el) el.scrollIntoView({ block: 'center', inline: 'center' });
    }, selector);
  };

  const handleSelectAction = async (step, selector) => {
    const values = Array.isArray(step?.value) ? step.value.map((item) => String(item)) : [String(step?.value || '')];
    await page.select(selector, ...values);
  };

  const handleAction = async (action, step, selector, timeout) => {
    if (action === 'click') {
        await page.click(selector);
      } else if (action === 'hover') {
        await page.hover(selector);
      } else if (action === 'type') {
        await handleTypeAction(step, selector);
      } else if (action === 'scroll') {
        await handleScrollAction(selector);
      } else if (action === 'keypress') {
        await page.keyboard.press(String(step?.key || 'Enter'));
      } else if (action === 'focus') {
        await page.focus(selector);
      } else if (action === 'select') {
        await handleSelectAction(step, selector);
      } else if (action === 'check') {
        await page.check(selector);
      } else if (action === 'uncheck') {
        await page.uncheck(selector);
      } else if (action === 'wait') {
        await pause(step?.delay ?? step?.value ?? 150);
      } else if (action === 'waitforselector') {
        await page.waitForSelector(selector, {
          visible: Boolean(step?.waitForVisible),
          timeout
        });
      } else {
        console.warn(`Unsupported interaction action: ${action}`);
      }
  };

  for (const step of interactionSpec) {
    try {
      const action = String(step?.action || '').trim().toLowerCase();
      const selector = typeof step?.selector === 'string' ? step.selector : '';
      const timeout = Number(step?.timeout) > 0 ? Number(step.timeout) : 2000;

      if (selector && step?.waitForVisible) {
        await page.waitForSelector(selector, { visible: true, timeout });
      } else if (selector && step?.waitForSelector) {
        await page.waitForSelector(selector, { timeout });
      }

      await handleAction(action, step, selector, timeout);

      if (step?.waitForNavigation) {
        try {
          await page.waitForNavigation({ waitUntil: 'networkidle0', timeout });
        } catch (err) {
          console.warn(`waitForNavigation timed out for step: ${JSON.stringify(step)}`, err.message);
        }
      }

      await pause(step?.delay ?? 50);
    } catch (err) {
      console.warn(`Interaction failed for step ${JSON.stringify(step)}:`, err.message);
    }
  }
}

module.exports = { executeInteractions };
