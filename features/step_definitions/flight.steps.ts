import { When, Then, Given } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';

// Reuse "I have launched a rocket" by combining steps?
// Or just define a unified step here?
// Better to reuse existing steps if possible, but "Given I have launched a rocket" is a composite.
// Let's implement it as a composite step calling other steps? BDD usually avoids this.
// We will just implement the actions directly in the step.

Given('I have launched a rocket', async function (this: CustomWorld) {
    // 1. Go to Hangar
    await this.page.goto('http://localhost:5174');
    await this.page.getByText('Build Rocket (Hangar)').click();
    await expect(this.page.locator('#hangar-ui')).toBeVisible();

    // 2. Add Part (Mk1 Pod + Engine for control?)
    // Need an engine for throttle to matter? Not strictly for the UI to update, but realistic.
    // Let's just add a capsule. The Throttle UI typically initializes anyway.
    // Wait, if no engine, maxThrottle might be 0? 
    // UI just shows 0% -> 100% of "available". 
    // Let's add full stack for realism: Pod + Tank + Engine.

    // Add Pod
    await this.page.mouse.move(100, 200); // Palette
    await this.page.mouse.down();
    const centerX = this.page.viewportSize()!.width / 2;
    const centerY = this.page.viewportSize()!.height / 2;
    await this.page.mouse.move(centerX, centerY - 100);
    await this.page.mouse.up();

    // Launch
    await this.page.getByRole('button', { name: 'LAUNCH' }).click();
    await expect(this.page.locator('canvas#gameCanvas')).toBeVisible();

    // Wait for UI and Click for Focus
    await expect(this.page.locator('#rocket-info-panel')).toBeVisible();
    await this.page.locator('canvas#gameCanvas').click();
});

When('I press the {string} key', async function (this: CustomWorld, key: string) {
    await this.page.keyboard.press(key);
    // Wait for game loop to process input
    await this.page.waitForTimeout(100);
});

Then('the Throttle should be greater than {int}%', async function (this: CustomWorld, value: number) {
    const throttleText = await this.page.locator('#rocket-throttle').innerText();
    // "50%" -> 50
    const throttleVal = parseInt(throttleText.replace('%', ''), 10);
    expect(throttleVal).toBeGreaterThan(value);
});

Then('the {string} indicator should be active', async function (this: CustomWorld, name: string) {
    // SAS and RCS buttons are in 'navball-autopilot-buttons' or similar container.
    // They are buttons with text 'SAS' or 'RCS'.
    // Active state: computed style color is rgb(0, 200, 81) or box-shadow is set.
    // Let's check color for green-ish.

    const btn = this.page.getByRole('button', { name: name, exact: true });
    await expect(btn).toBeVisible();

    // Check style
    // We can expect the color to be the green we saw earlier (#00C851 -> rgb(0, 200, 81))
    await expect(btn).toHaveCSS('color', 'rgb(0, 200, 81)');
});

Then('the {string} indicator should be inactive', async function (this: CustomWorld, name: string) {
    const btn = this.page.getByRole('button', { name: name, exact: true });
    await expect(btn).toBeVisible();

    // Check style for inactive (#ccc -> rgb(204, 204, 204))
    await expect(btn).toHaveCSS('color', 'rgb(204, 204, 204)');
});
