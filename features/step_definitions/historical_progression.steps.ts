import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';

Then('the Game Date Year should be {int}', async function (this: CustomWorld, year: number) {
    const dateElement = this.page.locator('#game-date-val');
    await expect(dateElement).toBeVisible();
    const dateText = await dateElement.innerText();
    // expected format YYYY-MM-DD
    const gameYear = parseInt(dateText.split('-')[0], 10);
    expect(gameYear).toBe(year);
});

Then('I should see {string} in the parts list', async function (this: CustomWorld, partName: string) {
    // Determine selector for part in palette
    // Assuming HangarUI creates elements that contain the text.
    // We scope it to #hangar-ui to avoid falsely matching other UI elements
    const part = this.page.locator('#hangar-ui').getByText(partName);
    await expect(part).toBeVisible();
});

Then('I should not see {string} in the parts list', async function (this: CustomWorld, partName: string) {
    const part = this.page.locator('#hangar-ui').getByText(partName);
    await expect(part).not.toBeVisible();
});

Then('I should see the Chronology Timeline', async function (this: CustomWorld) {
    // Check for the header title - ChronologyMenu uses i18next.t('chronology.title') which is "SPACE CONQUEST"
    await expect(this.page.getByText(/SPACE CONQUEST/)).toBeVisible({ timeout: 10000 });
});

Then('I should see {string} in the timeline', async function (this: CustomWorld, eventName: string) {
    // The timeline detail area shows event title in an h3 - use first() to avoid strict mode issues
    await expect(this.page.getByText(eventName).first()).toBeVisible({ timeout: 5000 });
});

When('I click the {string} timeline node', async function (this: CustomWorld, year: string) {
    // Click on the timeline item for the specified year
    const yearNode = this.page.locator('.timeline-item').filter({ hasText: year });
    await yearNode.click();
    // Wait for details to load
    await this.page.waitForTimeout(500);
});

When('I close the Chronology Menu', async function (this: CustomWorld) {
    // ChronologyMenu has a close button with class 'game-btn' that's inside the chronology overlay
    // Use locator that filters to the chronology container (z-index 4000)
    const closeBtn = this.page.locator('div').filter({ hasText: /SPACE CONQUEST/ }).first().getByRole('button', { name: /Back/ });
    await closeBtn.click();
});
