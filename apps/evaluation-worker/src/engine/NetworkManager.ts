import { Page, HTTPRequest } from 'puppeteer';

export class NetworkManager {
  private allowedDomains: string[];
  private targetHostname: string;

  constructor(targetUrl: string, extraAllowedDomains: string[] = []) {
    this.targetHostname = new URL(targetUrl).hostname;
    this.allowedDomains = [
      this.targetHostname,
      'cdnjs.cloudflare.com',
      'unpkg.com',
      ...extraAllowedDomains
    ];
  }

  public async setupInterception(page: Page): Promise<void> {
    await page.setRequestInterception(true);

    page.on('request', (request: HTTPRequest) => {
      const requestUrl = request.url();

      // Allow data URIs or blob URIs generally used natively
      if (requestUrl.startsWith('data:') || requestUrl.startsWith('blob:')) {
        return request.continue();
      }

      try {
        const urlObj = new URL(requestUrl);
        const host = urlObj.hostname;

        // Check if the host ends with any of the allowed domains (to allow subdomains if needed)
        const isAllowed = this.allowedDomains.some((domain) => 
          host === domain || host.endsWith('.' + domain)
        );

        if (isAllowed) {
          request.continue();
        } else {
          console.log(`[NetworkManager] Blocked outbound request to: ${requestUrl}`);
          request.abort('accessdenied');
        }
      } catch (e) {
        // If it's not a valid URL, abort it safely
        request.abort();
      }
    });
  }
}
