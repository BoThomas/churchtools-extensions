import { type Page } from '@playwright/test';

/**
 * ChurchTools E2E Cleanup - Deletes test data from real ChurchTools instance
 */

async function ensurePageContext(page: Page): Promise<void> {
  const url = page.url();
  if (!url || url === 'about:blank' || !url.includes('localhost')) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  }
}

export async function deleteAllCategories(
  page: Page,
  navigateFirst: boolean = false,
): Promise<void> {
  const extensionKey = process.env.VITE_KEY || 'translator-e2e-test';

  try {
    if (navigateFirst) await ensurePageContext(page);

    const result = await page.evaluate(async (extKey) => {
      const modulesResp = await fetch('/api/custommodules');
      if (!modulesResp.ok)
        return { error: `Fetch modules failed: ${modulesResp.status}` };

      const modulesData = await modulesResp.json();
      const modules = Array.isArray(modulesData)
        ? modulesData
        : modulesData.data || [];
      const module = modules.find((m: any) => m.shorty === extKey);
      if (!module) return { notFound: true };

      const catsResp = await fetch(
        `/api/custommodules/${module.id}/customdatacategories`,
      );
      if (!catsResp.ok)
        return { error: `Fetch categories failed: ${catsResp.status}` };

      const catsData = await catsResp.json();
      const categories = Array.isArray(catsData)
        ? catsData
        : catsData.data || [];
      if (categories.length === 0) return { count: 0 };

      const results = await Promise.all(
        categories.map(async (cat: any) => {
          const resp = await fetch(
            `/api/custommodules/${module.id}/customdatacategories/${cat.id}`,
            { method: 'DELETE' },
          );
          return { shorty: cat.shorty, success: resp.ok };
        }),
      );

      return {
        count: results.filter((r) => r.success).length,
        total: categories.length,
      };
    }, extensionKey);

    if ('error' in result) {
      console.warn(`⚠️  Category cleanup: ${result.error}`);
    } else if ('notFound' in result) {
      console.log(`✓ No module found: ${extensionKey}`);
    } else if (result.count === 0) {
      console.log('✓ No categories to clean');
    } else {
      console.log(`✓ Deleted ${result.count}/${result.total} categories`);
    }
  } catch (error) {
    console.error('❌ Category cleanup error:', error);
  }
}

export async function clearExtensionLocalStorage(
  page: Page,
  navigateFirst: boolean = false,
): Promise<void> {
  const extensionKey = process.env.VITE_KEY || 'translator-e2e-test';

  try {
    if (navigateFirst) await ensurePageContext(page);

    const count = await page.evaluate((key) => {
      const lower = key.toLowerCase();
      const toRemove = Object.keys(localStorage).filter(
        (k) =>
          k.toLowerCase().startsWith(lower) ||
          k.toLowerCase().startsWith('translator_') ||
          k.toLowerCase().includes('translator'),
      );
      toRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
      return toRemove.length;
    }, extensionKey);

    if (count > 0) console.log(`✓ Cleared ${count} localStorage keys`);
  } catch (error) {
    console.warn('⚠️  localStorage cleanup failed:', (error as Error).message);
  }
}

export async function cleanupE2EData(
  page: Page,
  navigateFirst: boolean = true,
): Promise<void> {
  console.log('🧹 Cleanup started');
  await deleteAllCategories(page, navigateFirst);
  await clearExtensionLocalStorage(page, navigateFirst);
  console.log('✅ Cleanup complete\n');
}
