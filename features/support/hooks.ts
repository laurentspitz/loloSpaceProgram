import { Before, After, BeforeAll, AfterAll, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium } from '@playwright/test';
import type { Browser } from '@playwright/test';
import type { CustomWorld } from './world';
import { spawn, type ChildProcess } from 'node:child_process';

// Increase timeout for tests
setDefaultTimeout(60 * 1000);

let browser: Browser;
let server: ChildProcess;

BeforeAll(async function () {
    // Start the server
    console.log('Starting Vite server...');
    server = spawn('npm', ['run', 'dev', '--', '--port', '5174'], {
        stdio: 'ignore',
        detached: true,
        shell: true
    });

    // Wait for port 5174 to be ready
    // Simple polling
    const url = 'http://localhost:5174';
    let retries = 20;
    while (retries > 0) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                console.log('Server is ready!');
                break;
            }
        } catch (e) {
            await new Promise(r => setTimeout(r, 1000));
        }
        retries--;
    }
    if (retries === 0) throw new Error('Server failed to start');

    browser = await chromium.launch({ headless: true });
});

AfterAll(async function () {
    await browser.close();
    if (server) {
        // process.kill(-server.pid) if detached group, but standard kill might suffice for now
        // On windows/mac shell behavior differs.
        // Using tree-kill would be safer but let's try standard kill first.
        server.kill();
    }
});

Before(async function (this: CustomWorld) {
    this.browser = browser;
    this.page = await browser.newPage();
});

After(async function (this: CustomWorld) {
    if (this.page) await this.page.close();
});
