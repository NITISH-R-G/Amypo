import puppeteer, { Browser, Page } from 'puppeteer';
import { NetworkManager } from './NetworkManager';
import { SpecRunner, SpecAction } from './SpecRunner';

export interface EvaluationConfig {
  targetUrl: string;
  actions: SpecAction[];
}

export class Evaluator {
  private globalTimeoutMs = 60000; // 60 seconds absolute max
  private navigationTimeoutMs = 15000; // 15 seconds page load max
  
  public async evaluate(config: EvaluationConfig): Promise<{ score: number; feedback: string }> {
    let browser: Browser | null = null;
    
    // Create a global timeout promise to strictly enforce limits
    const globalTimeoutPromise = new Promise<{ score: number; feedback: string }>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Global evaluation timeout exceeded (${this.globalTimeoutMs}ms). Probable infinite loop or unresponsive page.`));
      }, this.globalTimeoutMs);
    });

    const evaluatePromise = async () => {
      try {
        browser = await puppeteer.launch({
          headless: true,
          // MUST use --no-sandbox here because we run the whole container inside gVisor
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        });

        const page = await browser.newPage();
        
        // 1. Enforce Resource Limits
        page.setDefaultNavigationTimeout(this.navigationTimeoutMs);
        page.setDefaultTimeout(5000); // 5 seconds default for finding selectors

        // 2. Setup Network Interception
        const networkManager = new NetworkManager(config.targetUrl);
        await networkManager.setupInterception(page);

        // 3. Navigate to target
        await page.goto(config.targetUrl, { waitUntil: 'networkidle2' });

        // 4. Run the Sandbox Spec
        const runner = new SpecRunner(page);
        const result = await runner.runSpec(config.actions);

        return {
          score: result.score,
          feedback: result.feedback.join('\n'),
        };
      } finally {
        if (browser) await browser.close();
      }
    };

    // Race the actual evaluation against the strict global timeout
    try {
      return await Promise.race([evaluatePromise(), globalTimeoutPromise]);
    } catch (error) {
       console.error(`Evaluation forcefully terminated:`, error);
       // Ensure browser is closed if the timeout won the race but the browser process is still open
       if (browser) await browser.close();
       
       return {
         score: 0,
         feedback: `Security or Timeout Error: ${(error as Error).message}`
       };
    }
  }
}
