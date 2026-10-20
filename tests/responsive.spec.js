import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage.js';

// The Conduit layout is a fixed Bootstrap grid: a narrow viewport collapses the
// article list to a single column and reveals the popular-tags sidebar, a wide
// one hides it. These checks pin that behavior (and that nothing overflows) at
// representative widths instead of relying on a specific backend's markup.
const DESKTOP = { width: 1280, height: 900 };
const NARROW = { width: 375, height: 800 };

test.describe('Responsive layout', { tag: '@regression' }, () => {
  test('keeps the home page usable without horizontal overflow at any width', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    for (const size of [DESKTOP, { width: 900, height: 900 }, { width: 600, height: 800 }, NARROW]) {
      await page.setViewportSize(size);
      // The feed heading and its tabs stay on screen after the reflow.
      await expect(homePage.globalFeedTab).toBeVisible();
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(overflows, `horizontal overflow at ${size.width}px`).toBe(false);
    }
  });

  test('reveals the sidebar on narrow screens and hides it on desktop', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await page.setViewportSize(DESKTOP);
    await expect(homePage.sidebarTags.first()).toBeHidden();

    await page.setViewportSize(NARROW);
    await expect(homePage.sidebarTags.first()).toBeVisible();
  });
});
