import { Then } from '@cucumber/cucumber';
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
    // Check for the header title using Regex to be robust against spans/layout
    await expect(this.page.getByText(/SPACE CONQUEST/)).toBeVisible();
    await expect(this.page.getByText(/CHRONOLOGY/)).toBeVisible();
});

Then('I should see {string} in the timeline', async function (this: CustomWorld, eventName: string) {
    // The timeline items contain the event title
    await expect(this.page.getByText(eventName)).toBeVisible();
});
