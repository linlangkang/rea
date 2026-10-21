import type { Page } from '@playwright/test';

/** Follow the same disclosure controls used by people in the compact UI. */
export async function openSection(page: Page, selector: string) {
  const section = page.locator(selector);
  if (await section.getAttribute('open') === null)
    await section.locator(':scope > summary').click();
}
