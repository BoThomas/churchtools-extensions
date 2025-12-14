import type { Page, BrowserContext } from '@playwright/test';

/**
 * Helper class for managing multiple windows in Playwright tests
 * 
 * Useful for testing multi-window features like the translator's presentation mode
 */
export class MultiWindowHelper {
  private windows: Page[] = [];
  private context: BrowserContext;

  constructor(context: BrowserContext) {
    this.context = context;
    
    // Track all new pages/windows
    context.on('page', (page) => {
      this.windows.push(page);
    });
  }

  /**
   * Get all currently open windows (excluding the main page)
   */
  getWindows(): Page[] {
    return this.windows;
  }

  /**
   * Get a specific window by index
   */
  getWindow(index: number): Page | undefined {
    return this.windows[index];
  }

  /**
   * Get the most recently opened window
   */
  getLastWindow(): Page | undefined {
    return this.windows[this.windows.length - 1];
  }

  /**
   * Wait for a new window to open
   */
  async waitForWindow(timeout = 5000): Promise<Page> {
    const initialCount = this.windows.length;
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.context.off('page', pageHandler);
        reject(new Error(`Timeout waiting for new window after ${timeout}ms`));
      }, timeout);

      const pageHandler = (page: Page) => {
        if (this.windows.length > initialCount) {
          clearTimeout(timeoutId);
          this.context.off('page', pageHandler);
          resolve(page);
        }
      };

      // Check if window already opened
      if (this.windows.length > initialCount) {
        clearTimeout(timeoutId);
        resolve(this.windows[this.windows.length - 1]);
      } else {
        this.context.on('page', pageHandler);
      }
    });
  }

  /**
   * Wait for multiple windows to open
   */
  async waitForWindows(count: number, timeout = 10000): Promise<Page[]> {
    const startTime = Date.now();
    
    while (this.windows.length < count) {
      if (Date.now() - startTime > timeout) {
        throw new Error(
          `Timeout waiting for ${count} windows. Got ${this.windows.length} after ${timeout}ms`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    
    return this.windows;
  }

  /**
   * Wait for a window with a specific URL pattern
   */
  async waitForWindowWithUrl(
    urlPattern: string | RegExp,
    timeout = 5000
  ): Promise<Page> {
    const pattern = typeof urlPattern === 'string' 
      ? new RegExp(urlPattern) 
      : urlPattern;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      for (const window of this.windows) {
        if (pattern.test(window.url())) {
          return window;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    
    throw new Error(`No window found with URL pattern: ${urlPattern}`);
  }

  /**
   * Close all tracked windows
   */
  async closeAll(): Promise<void> {
    await Promise.all(this.windows.map((window) => window.close().catch(() => {})));
    this.windows = [];
  }

  /**
   * Close a specific window by index
   */
  async closeWindow(index: number): Promise<void> {
    const window = this.windows[index];
    if (window) {
      await window.close();
      this.windows.splice(index, 1);
    }
  }

  /**
   * Get window count
   */
  getWindowCount(): number {
    return this.windows.length;
  }

  /**
   * Find windows by title
   */
  async findWindowsByTitle(title: string | RegExp): Promise<Page[]> {
    const pattern = typeof title === 'string' ? new RegExp(title) : title;
    const matchingWindows: Page[] = [];

    for (const window of this.windows) {
      const windowTitle = await window.title();
      if (pattern.test(windowTitle)) {
        matchingWindows.push(window);
      }
    }

    return matchingWindows;
  }

  /**
   * Check if any window is open
   */
  hasWindows(): boolean {
    return this.windows.length > 0;
  }
}
