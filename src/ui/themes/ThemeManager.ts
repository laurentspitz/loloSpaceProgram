import type { CockpitTheme } from '../types';
import type { UI } from '../UI';
import { ThemeRegistry } from '../ThemeRegistry';

/**
 * Theme Manager - handles cockpit theme switching and legacy overlays
 */
export class ThemeManager {
    private currentTheme: string = 'standard';
    private activeTheme: CockpitTheme | null = null;
    private scifiOverlay: HTMLElement | null = null;
    private apolloOverlay: HTMLElement | null = null;

    getCurrentTheme(): string {
        return this.currentTheme;
    }

    getActiveTheme(): CockpitTheme | null {
        return this.activeTheme;
    }

    setTheme(themeId: string, ui: UI): void {
        this.currentTheme = themeId;

        // Clean up classes
        document.body.className = document.body.className.replace(/theme-\w+/g, '').trim();
        document.body.classList.add(`theme-${themeId}`);

        // Cleanup current modular theme
        if (this.activeTheme) {
            this.activeTheme.cleanup(ui);
            this.activeTheme = null;
        }

        // Hide legacy overlays
        if (this.scifiOverlay) this.scifiOverlay.style.display = 'none';
        if (this.apolloOverlay) this.apolloOverlay.style.display = 'none';

        const restoreToBody = (id: string, top?: string, bottom?: string, left?: string, right?: string) => {
            const el = document.getElementById(id);
            if (el) {
                if (el.parentElement !== document.body) {
                    document.body.appendChild(el);
                }
                el.style.position = 'absolute';
                el.style.display = 'block';
                el.style.transform = 'none';
                el.style.top = top || '';
                el.style.bottom = bottom || '';
                el.style.left = left || '';
                el.style.right = right || '';
            }
        };

        // Check Registry first
        const cockpit = ThemeRegistry.get(themeId);
        if (cockpit) {
            this.activeTheme = cockpit;
            cockpit.setup(ui);
            return;
        }

        // Legacy Fallbacks
        if (themeId === 'scifi') {
            restoreToBody('mission-controls-panel', '10px', undefined, '10px');
            restoreToBody('rocket-info-panel', undefined, '10px', '10px');
            restoreToBody('time-controls-panel', '10px', undefined, undefined, '10px');
            restoreToBody('celestial-bodies-panel', '170px', undefined, undefined, '10px');

            if (!this.scifiOverlay) this.createScifiOverlay();
            if (this.scifiOverlay) this.scifiOverlay.style.display = 'block';

        } else if (themeId === 'apollo') {
            restoreToBody('mission-controls-panel', '10px', undefined, '10px');
            restoreToBody('rocket-info-panel', undefined, '10px', '10px');
            restoreToBody('time-controls-panel', '10px', undefined, undefined, '10px');
            restoreToBody('celestial-bodies-panel', '170px', undefined, undefined, '10px');

            if (this.apolloOverlay) this.apolloOverlay.style.display = 'flex';

            const navContainer = document.getElementById('apollo-navball-container');
            const navCanvas = document.getElementById('navball-canvas');
            if (navContainer && navCanvas) {
                navContainer.appendChild(navCanvas);
                navCanvas.style.position = 'static';
                navCanvas.style.transform = 'none';
            }

        } else {
            // STANDARD / DEFAULT
            restoreToBody('mission-controls-panel', '10px', undefined, '10px');
            restoreToBody('rocket-info-panel', undefined, '10px', '10px');
            restoreToBody('time-controls-panel', '10px', undefined, undefined, '10px');
            restoreToBody('celestial-bodies-panel', '170px', undefined, undefined, '10px');

            const navWrapper = document.getElementById('navball-wrapper');
            const navContentRow = document.getElementById('navball-content-row');
            const navCanvas = document.getElementById('navball-canvas');
            const navButtons = document.getElementById('navball-autopilot-buttons');

            // If we have a wrapper (new collapsible UI), ensure canvas and buttons are inside it
            if (navWrapper && navCanvas && navContentRow) {
                if (navCanvas.parentElement !== navContentRow) {
                    navContentRow.appendChild(navCanvas);
                }
                // Reset canvas styles to flow within wrapper
                navCanvas.style.position = 'relative';
                navCanvas.style.bottom = 'auto';
                navCanvas.style.left = 'auto';
                navCanvas.style.transform = 'none';

                if (navButtons && navButtons.parentElement !== navContentRow) {
                    navContentRow.appendChild(navButtons);
                }
                // Buttons grid style
                if (navButtons) {
                    navButtons.style.display = 'grid';
                    navButtons.style.position = 'static'; // Flow in flex container
                    navButtons.style.transform = 'none';
                    navButtons.style.marginTop = '0px'; // Reset margins
                }
            }
            // Legacy behavior (no wrapper)
            else if (navCanvas) {
                document.body.appendChild(navCanvas);
                navCanvas.style.position = 'absolute';
                navCanvas.style.bottom = '10px';
                navCanvas.style.left = '50%';
                navCanvas.style.transform = 'translateX(-50%)';

                if (navButtons) {
                    document.body.appendChild(navButtons);
                    navButtons.style.display = 'grid';
                    navButtons.style.position = 'absolute';
                    navButtons.style.left = '50%';
                    navButtons.style.bottom = '20px';
                    navButtons.style.transform = 'translateX(-180px)';
                }
            }
        }
    }

    private createScifiOverlay(): void {
        if (this.scifiOverlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'cockpit-overlay';

        const frame = document.createElement('img');
        frame.id = 'cockpit-frame';
        frame.src = 'cockpit_frame.png';
        frame.alt = "Cockpit Dashboard";
        overlay.appendChild(frame);

        const createSlot = (id: string, defaultText: string) => {
            const slot = document.createElement('div');
            slot.id = id;
            slot.className = 'cockpit-data';
            slot.innerText = defaultText;
            return slot;
        };

        overlay.appendChild(createSlot('cockpit-speed', 'SPD: 0 m/s'));
        overlay.appendChild(createSlot('cockpit-alt', 'ALT: 0 m'));
        overlay.appendChild(createSlot('cockpit-fuel', 'FUEL: 100%'));
        overlay.appendChild(createSlot('cockpit-throt', 'THR: 0%'));

        document.body.appendChild(overlay);
        this.scifiOverlay = overlay;
    }

    update(rocket: any, bodies: any[]): void {
        if (this.activeTheme?.update) {
            this.activeTheme.update(0);
        }

        if (this.currentTheme === 'scifi' && rocket) {
            const fuelPct = rocket.getTotalFuelPercent();
            const speed = rocket.body.velocity.mag();

            let alt = 0;
            let dominantBody = null;
            let maxG = -1;
            for (const b of bodies) {
                const dist = rocket.body.position.distanceTo(b.position);
                const g = b.mass / (dist * dist);
                if (g > maxG) { maxG = g; dominantBody = b; }
            }
            if (dominantBody) {
                const dist = rocket.body.position.distanceTo(dominantBody.position);
                alt = Math.max(0, dist - dominantBody.radius);
            }

            const speedEl = document.getElementById('cockpit-speed');
            if (speedEl) speedEl.innerText = `SPD: ${speed.toFixed(1)} m/s`;

            const altEl = document.getElementById('cockpit-alt');
            if (altEl) altEl.innerText = `ALT: ${(alt / 1000).toFixed(1)} km`;

            const fuelEl = document.getElementById('cockpit-fuel');
            if (fuelEl) fuelEl.innerText = `FUEL: ${fuelPct.toFixed(0)}%`;
        }
    }
}
