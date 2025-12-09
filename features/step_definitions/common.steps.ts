import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';

// --- GIVEN ---

Given('I am on the Main Menu', async function (this: CustomWorld) {
    // Navigate to the app (using port 5174 as configured in hooks)
    await this.page.goto('http://localhost:5174');

    // Ensure we are fully loaded by checking main menu exist
    await expect(this.page.locator('#main-menu')).toBeVisible();
});

// --- WHEN ---

When('I open Settings', async function (this: CustomWorld) {
    await this.page.getByText('Settings').click();
    await expect(this.page.getByText('SETTINGS & CONTROLS')).toBeVisible();
});

When('I type {string} into the nickname field', async function (this: CustomWorld, nickname: string) {
    const input = this.page.getByPlaceholder('Enter your callsign...');
    await expect(input).toBeVisible();
    await input.fill(nickname);
});

When('I click {string}', async function (this: CustomWorld, buttonName: string) {
    await this.page.getByRole('button', { name: buttonName }).click();
});

When('I confirm the save', async function (this: CustomWorld) {
    await expect(this.page.getByText('Save settings?')).toBeVisible();
    await this.page.getByRole('button', { name: 'Save', exact: true }).click();
});

// --- THEN ---

Then('I should see a success notification {string}', async function (this: CustomWorld, message: string) {
    await expect(this.page.getByText(new RegExp(message))).toBeVisible();
});

Then('the nickname field should still contain {string}', async function (this: CustomWorld, expectedValue: string) {
    const input = this.page.getByPlaceholder('Enter your callsign...');
    await expect(input).toHaveValue(expectedValue);
});

// --- SMOKE TEST STEPS ---

Then('I should see the Main Menu container', async function (this: CustomWorld) {
    await expect(this.page.locator('#main-menu')).toBeVisible();
});

Then('the page title should contain {string}', async function (this: CustomWorld, titlePart: string) {
    await expect(this.page).toHaveTitle(new RegExp(titlePart));
});

Then('I should see the Game Canvas', async function (this: CustomWorld) {
    // Note: The game canvas #gameCanvas might be obscured by the menu but should exist/be attached
    await expect(this.page.locator('#gameCanvas')).toBeAttached();
});

Then('I should see the Navball', async function (this: CustomWorld) {
    // The navball #navball is also part of the UI
    await expect(this.page.locator('#navball')).toBeAttached();
});
