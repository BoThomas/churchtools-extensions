/**
 * Detect if the browser is Chromium-based
 * Chromium-based browsers include Chrome, Edge, Brave, Opera, Vivaldi, etc.
 * @returns true if the browser is Chromium-based, false otherwise
 */
export function isChromiumBrowser(): boolean {
  // Check for Chrome in user agent
  const userAgent = navigator.userAgent.toLowerCase();
  const hasChrome = userAgent.includes('chrome');
  
  // Check for specific non-Chromium browsers that might have 'chrome' in UA
  const isFirefox = userAgent.includes('firefox');
  const isSafari = userAgent.includes('safari') && !hasChrome;
  
  // Check for window.chrome object (exists in Chromium-based browsers)
  const hasWindowChrome = typeof (window as any).chrome !== 'undefined';
  
  // A browser is Chromium-based if:
  // - It has 'chrome' in user agent AND it's not Firefox or Safari, OR
  // - It has the window.chrome object
  return (hasChrome && !isFirefox && !isSafari) || hasWindowChrome;
}
