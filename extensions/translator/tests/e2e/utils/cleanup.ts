import { type Page } from '@playwright/test';

/**
 * ChurchTools E2E Cleanup Utilities
 *
 * Functions to clean up test data from real ChurchTools instance after E2E tests
 */

/**
 * Deletes all categories for the translator-e2e-test module
 *
 * This uses the ChurchTools KV store API to delete all test data
 *
 * @param page - Playwright page object (must be authenticated)
 */
export async function deleteAllCategories(page: Page): Promise<void> {
  const extensionKey = process.env.VITE_KEY || 'translator-e2e-test';

  console.log(`🧹 Cleaning up categories for module: ${extensionKey}`);

  try {
    // Get all modules to find our module ID
    const modulesResponse = await page.request.get(
      '/api/key-value-store/modules',
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (!modulesResponse.ok()) {
      console.warn(
        `⚠️  Failed to fetch modules: ${modulesResponse.status()} ${modulesResponse.statusText()}`,
      );
      return;
    }

    const modules = await modulesResponse.json();
    const ourModule = modules.data?.find((m: any) => m.key === extensionKey);

    if (!ourModule) {
      console.log(`ℹ️  No module found with key: ${extensionKey}`);
      return;
    }

    const moduleId = ourModule.id;

    // Get all categories for this module
    const categoriesResponse = await page.request.get(
      `/api/key-value-store/modules/${moduleId}/categories`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (!categoriesResponse.ok()) {
      console.warn(
        `⚠️  Failed to fetch categories: ${categoriesResponse.status()}`,
      );
      return;
    }

    const categories = await categoriesResponse.json();
    const categoryList = categories.data || [];

    if (categoryList.length === 0) {
      console.log('✅ No categories to clean up');
      return;
    }

    // Delete each category
    for (const category of categoryList) {
      try {
        const deleteResponse = await page.request.delete(
          `/api/key-value-store/modules/${moduleId}/categories/${category.id}`,
          {
            headers: {
              Accept: 'application/json',
            },
          },
        );

        if (deleteResponse.ok()) {
          console.log(`  ✓ Deleted category: ${category.key}`);
        } else {
          console.warn(
            `  ⚠️  Failed to delete category ${category.key}: ${deleteResponse.status()}`,
          );
        }
      } catch (error) {
        console.warn(`  ⚠️  Error deleting category ${category.key}:`, error);
      }
    }

    console.log(`✅ Cleaned up ${categoryList.length} categories`);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

/**
 * Clears localStorage for the extension
 *
 * This removes any client-side data stored by the extension
 *
 * @param page - Playwright page object
 */
export async function clearExtensionLocalStorage(page: Page): Promise<void> {
  const extensionKey = process.env.VITE_KEY || 'translator-e2e-test';

  console.log(`🧹 Clearing localStorage for: ${extensionKey}`);

  try {
    await page.evaluate((key) => {
      // Get all localStorage keys
      const keys = Object.keys(localStorage);

      // Filter keys that belong to this extension
      const extensionKeys = keys.filter((k) => k.startsWith(key));

      // Remove each key
      extensionKeys.forEach((k) => localStorage.removeItem(k));

      return extensionKeys.length;
    }, extensionKey);

    // Also clear sessionStorage
    await page.evaluate(() => {
      sessionStorage.clear();
    });

    console.log('✅ LocalStorage cleared');
  } catch (error) {
    console.error('❌ Error clearing localStorage:', error);
  }
}

/**
 * Complete cleanup function that runs both category deletion and localStorage clearing
 *
 * This should be called in test.afterAll() to clean up after each test file
 *
 * @param page - Playwright page object (must be authenticated)
 */
export async function cleanupE2EData(page: Page): Promise<void> {
  console.log('\n🧹 Running E2E cleanup...\n');

  await deleteAllCategories(page);
  await clearExtensionLocalStorage(page);

  console.log('\n✅ E2E cleanup complete\n');
}
