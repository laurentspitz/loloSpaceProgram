import { World } from '@cucumber/cucumber';
import type { Browser, Page } from '@playwright/test';

export interface CustomWorld extends World {
    browser: Browser;
    page: Page;
}
