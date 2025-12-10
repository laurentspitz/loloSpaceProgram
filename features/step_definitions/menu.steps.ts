import { Then, Given } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';

Given('I am on the Hub Screen', async function (this: CustomWorld) {
    // Navigate to main menu first if not there
    await this.page.goto('http://localhost:5174');
    await expect(this.page.locator('#main-menu')).toBeVisible();

    // Click New Game to get to Hub (simplest way to enforce Hub state without side effects if we just want UI presence)
    // Or we could have a hidden way, but UI interaction is best.
    await this.page.getByRole('button', { name: 'New Game' }).click();

    // Verify we are there
    await expect(this.page.locator('#main-menu')).toHaveAttribute('data-screen', 'hub');
});

Then('I should see the {string} button', async function (this: CustomWorld, buttonName: string) {
    await expect(this.page.getByRole('button', { name: buttonName })).toBeVisible();
});

Then('I should NOT see the {string} button', async function (this: CustomWorld, buttonName: string) {
    await expect(this.page.getByRole('button', { name: buttonName })).not.toBeVisible();
});

Then('I should be on the Hub Screen', async function (this: CustomWorld) {
    // We expect the container to have a data attribute or class indicating the screen
    // Or we expect specific elements. Let's rely on the data attribute we will implement.
    await expect(this.page.locator('#main-menu')).toHaveAttribute('data-screen', 'hub');
});

Then('I should be on the Main Menu', async function (this: CustomWorld) {
    await expect(this.page.locator('#main-menu')).toHaveAttribute('data-screen', 'home');
});
