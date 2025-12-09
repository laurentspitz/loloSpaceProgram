import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';

Then('I should see the Hangar UI', async function (this: CustomWorld) {
    await expect(this.page.locator('#hangar-ui')).toBeVisible();
    await expect(this.page.getByText('Parts')).toBeVisible();
});

When('I add a {string} to the assembly', async function (this: CustomWorld, partName: string) {
    // In HangarUI, parts are in a palette. We can click them to select (and dragging is handled by DragDropManager).
    // The palette items have a span with the text.
    // NOTE: Simulating drag and drop is complex. 
    // HangarUI.ts line 249: item.onmousedown calls onPartSelected. 
    // This starts the drag.
    // To actually place it, we need to click on the canvas or release mouse.

    // Let's try to just click it to 'select' it (start dragging) 
    // and then click the center of the screen to place it.

    const partItem = this.page.locator('#hangar-ui').getByText(partName, { exact: true });
    await expect(partItem).toBeVisible();

    // Get Element Position
    const box = await partItem.boundingBox();
    if (!box) throw new Error('Part item not found');

    // 1. Hover and Mousedown on Palette Item
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.mouse.down();

    // 2. Move to Center of Canvas (simulating drag)
    const viewportSize = this.page.viewportSize();
    if (!viewportSize) throw new Error('No viewport size');

    // Stack parts vertically to form valid rocket
    // Pod (Top) -> Tank (Mid) -> Engine (Bottom)
    // Canvas Y increases downwards.

    let yOffset = 0;
    if (partName.includes('Command Pod')) yOffset = -100;
    else if (partName.includes('Fuel Tank')) yOffset = 0;
    else if (partName.includes('Engine')) yOffset = 100;

    const centerX = viewportSize.width / 2;
    const centerY = viewportSize.height / 2 + yOffset;

    // Move in steps to ensure events fire
    await this.page.mouse.move(centerX, centerY, { steps: 5 });

    // 3. Release to Place
    await this.page.mouse.up();

    // Small delay for UI update
    await this.page.waitForTimeout(100);
});

Then('I am in the Hangar', async function (this: CustomWorld) {
    await this.page.goto('http://localhost:5174');
    await this.page.getByText('Build Rocket (Hangar)').click();
    await expect(this.page.locator('#hangar-ui')).toBeVisible();
});

Then('the rocket mass should be greater than {int}', async function (this: CustomWorld, mass: number) {
    // Stats panel: "Mass: X kg"
    // HangarUI.ts line 377: massValue span
    // We can find the text "Mass:" and get the sibling span or specific text content.
    const massText = await this.page.locator('#hangar-ui').getByText('Mass:').locator('xpath=..').innerText();
    // Expected format: "Mass: 1540 kg"
    const massVal = parseInt(massText.replace(/[^0-9]/g, ''), 10);
    expect(massVal).toBeGreaterThan(mass);
});

Then('the rocket mass should be {int}', async function (this: CustomWorld, Mass: number) {
    const massText = await this.page.locator('#hangar-ui').getByText('Mass:').locator('xpath=..').innerText();
    const massVal = parseInt(massText.replace(/[^0-9]/g, ''), 10);
    expect(massVal).toBe(Mass);
});

When('I click the {string} button', async function (this: CustomWorld, buttonName: string) {
    // Use regex (case-insensitive) to match button name, ignoring emojis
    await this.page.getByRole('button', { name: new RegExp(buttonName, 'i') }).click();
});

When('I enter {string} into the active input', async function (this: CustomWorld, text: string) {
    const input = this.page.locator('input:visible').last(); // Usually the dialog input is last
    await expect(input).toBeVisible();
    await input.fill(text);
});

When('I click {string} in the dialog', async function (this: CustomWorld, buttonName: string) {
    // Buttons in dialogs (Save, Confirm, Cancel, Close)
    // We target visible buttons with high certainty
    const btn = this.page.getByRole('button', { name: buttonName, exact: true }).filter({ hasText: buttonName });
    // Ensure we click the visible one (incase multiple exist behind overlays, though usually overlays hide interaction)
    await expect(btn.last()).toBeVisible();
    await btn.last().click();
});

// Notification step removed (using common.steps.ts version)

When('I select {string} from the list', async function (this: CustomWorld, rocketName: string) {
    const dialog = this.page.locator('#load-dialog');
    const item = dialog.getByText(rocketName);
    await expect(item).toBeVisible();
    await item.click();
});

When('I delete {string} from the list', async function (this: CustomWorld, rocketName: string) {
    // The load dialog has items with a delete button (trash icon/text)
    // Hierarchy: Item -> Info + Delete Button
    // We find the item by text, then find the button inside/next to it
    // The text 'Test Rocket' is inside 'name' div, which is inside 'info' div, which is inside 'item' div.
    // Let's rely on the delete button ('🗑️') inside the item row

    // Better strategy: Find the row containing text
    const row = this.page.locator('#load-dialog div').filter({ hasText: rocketName }).first();
    const deleteBtn = row.getByText('🗑️');
    await deleteBtn.click();

    // Confirm delete dialog
    await this.page.getByText('Confirm').click();
});

Then('{string} should not be in the load list', async function (this: CustomWorld, rocketName: string) {
    await expect(this.page.locator('#load-dialog').getByText(rocketName)).not.toBeVisible();
});
