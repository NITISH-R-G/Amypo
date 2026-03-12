import { Page } from 'puppeteer';

export type SpecActionType = 'click' | 'type' | 'assertDOM' | 'assertStyle';

export interface SpecAction {
  type: SpecActionType;
  selector: string;
  value?: string;       // For 'type' or expected value for 'assertDOM'/'assertStyle'
  property?: string;    // For 'assertStyle'
}

export class SpecRunner {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }

  public async prepareDOMForSnapshot(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
          caret-color: transparent !important;
          font-family: system-ui, -apple-system, sans-serif !important;
        }
      `
    });
  }

  public async runSpec(actions: SpecAction[]): Promise<{ success: boolean; score: number; feedback: string[] }> {
    const feedback: string[] = [];
    let score = 0;
    const scorePerAction = 100 / (actions.filter(a => a.type.startsWith('assert')).length || 1);

    await this.prepareDOMForSnapshot();

    for (const action of actions) {
      try {
        switch (action.type) {
          // INTERACTION SIMULATION
          case 'click':
            await this.page.waitForSelector(action.selector, { timeout: 2000 });
            await this.page.click(action.selector);
            feedback.push(`Successfully clicked '${action.selector}'.`);
            break;

          case 'type':
            await this.page.waitForSelector(action.selector, { timeout: 2000 });
            if (action.value) {
              await this.page.type(action.selector, action.value);
              feedback.push(`Successfully typed into '${action.selector}'.`);
            }
            break;

          // TESTING HARNESS
          case 'assertDOM':
            const innerText = await this.page.$eval(action.selector, (el) => el.textContent?.trim());
            if (action.value && innerText !== action.value) {
              feedback.push(`DOM Assetion Failed for '${action.selector}': Expected '${action.value}', found '${innerText}'.`);
            } else {
              score += scorePerAction;
              feedback.push(`DOM Assertion Passed for '${action.selector}'.`);
            }
            break;

          case 'assertStyle':
            if (!action.property || !action.value) throw new Error("assertStyle requires 'property' and 'value'.");
            const styleValue = await this.page.$eval(
              action.selector, 
              (el, prop) => window.getComputedStyle(el).getPropertyValue(prop as string), 
              action.property
            );
            if (styleValue !== action.value) {
               feedback.push(`Style Assertion Failed for '${action.selector}': Expected '${action.property}: ${action.value}', found '${styleValue}'.`);
            } else {
               score += scorePerAction;
               feedback.push(`Style Assertion Passed for '${action.selector}'.`);
            }
            break;
            
          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }
      } catch (err) {
        feedback.push(`Error executing '${action.type}' on '${action.selector}': ${(err as Error).message}`);
      }
    }

    return {
      success: score === 100,
      score: Math.min(Math.ceil(score), 100),
      feedback
    };
  }
}
