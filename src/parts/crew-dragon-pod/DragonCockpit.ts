import type { CockpitTheme } from '../../ui/CockpitTheme';
import type { UI } from '../../ui/UI';
import './dragon.css';

/**
 * Crew Dragon Cockpit Logic
 * Implements the modular CockpitTheme interface
 */
export class DragonCockpit implements CockpitTheme {
    id = 'dragon';
    name = 'SpaceX Crew Dragon';

    private overlay: HTMLElement | null = null;
    private ui: UI | null = null;

    setup(ui: UI): void {
        this.ui = ui;
        if (!this.overlay) {
            this.createOverlay();
        }
        if (this.overlay) {
            this.overlay.style.display = 'block';
            this.reparentPanels(true);
        }
    }

    cleanup(_ui: UI): void {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
        this.reparentPanels(false);
        this.ui = null;
    }

    private createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'dragon-overlay';

        // 1. Structure: Window Frame (Pillars)
        const frameLeft = document.createElement('div');
        frameLeft.className = 'dragon-pillar left';
        overlay.appendChild(frameLeft);

        const frameRight = document.createElement('div');
        frameRight.className = 'dragon-pillar right';
        overlay.appendChild(frameRight);

        const frameTop = document.createElement('div');
        frameTop.className = 'dragon-frame-top';
        overlay.appendChild(frameTop);

        // 2. Dashboard Console (Bottom)
        const dashboard = document.createElement('div');
        dashboard.id = 'dragon-dashboard';

        // 3. Screens
        // Left
        const screenLeft = document.createElement('div');
        screenLeft.className = 'dragon-screen';
        const labelLeft = document.createElement('div');
        labelLeft.className = 'screen-label';
        labelLeft.innerText = "SYSTEMS & TELEMETRY";
        screenLeft.appendChild(labelLeft);

        const contentLeft = document.createElement('div');
        contentLeft.className = 'screen-content';
        contentLeft.id = 'dragon-content-left';
        screenLeft.appendChild(contentLeft);
        dashboard.appendChild(screenLeft);

        // Center
        const screenCenter = document.createElement('div');
        screenCenter.className = 'dragon-screen';
        screenCenter.id = 'dragon-screen-center';
        const labelCenter = document.createElement('div');
        labelCenter.className = 'screen-label';
        labelCenter.innerText = "FLIGHT DYNAMICS";
        screenCenter.appendChild(labelCenter);

        const contentCenter = document.createElement('div');
        contentCenter.className = 'screen-content';
        contentCenter.id = 'dragon-content-center';
        screenCenter.appendChild(contentCenter);
        dashboard.appendChild(screenCenter);

        // Right
        const screenRight = document.createElement('div');
        screenRight.className = 'dragon-screen';
        screenRight.id = 'dragon-screen-right';
        const labelRight = document.createElement('div');
        labelRight.className = 'screen-label';
        labelRight.innerText = "NAVIGATION & TIME";
        screenRight.appendChild(labelRight);

        const contentRight = document.createElement('div');
        contentRight.className = 'screen-content';
        contentRight.id = 'dragon-content-right';
        screenRight.appendChild(contentRight);

        dashboard.appendChild(screenRight);

        overlay.appendChild(dashboard);
        document.body.appendChild(overlay);
        this.overlay = overlay;
    }

    private reparentPanels(active: boolean) {
        if (!this.ui) return;

        // IDs of panels we manage
        const panels = {
            mission: 'mission-controls-panel',
            rocket: 'rocket-info-panel',
            navball: 'navball-canvas',
            navBtns: 'navball-autopilot-buttons',
            time: 'time-controls-panel',
            celestial: 'celestial-bodies-panel'
        };

        if (active) {
            // Move into dashboard
            this.moveToScreen(panels.mission, 'dragon-content-left');
            this.moveToScreen(panels.rocket, 'dragon-content-left');

            this.moveNavballToScreen(panels.navball, panels.navBtns, 'dragon-content-center');

            this.moveToScreen(panels.time, 'dragon-content-right');
            this.moveToScreen(panels.celestial, 'dragon-content-right');

            // Specific tweaks
            const celPanel = document.getElementById(panels.celestial);
            if (celPanel) celPanel.style.position = 'static';

        } else {
            // Restore to body
            this.restoreToBody(panels.mission, '10px', undefined, '10px');
            this.restoreToBody(panels.rocket, undefined, '10px', '10px');
            this.restoreToBody(panels.time, '10px', undefined, undefined, '10px');
            this.restoreToBody(panels.celestial, '170px', undefined, undefined, '10px');

            // Restore Navball
            const navCanvas = document.getElementById(panels.navball);
            if (navCanvas) {
                document.body.appendChild(navCanvas);
                navCanvas.style.position = 'absolute';
                navCanvas.style.bottom = '10px';
                navCanvas.style.left = '50%';
                navCanvas.style.transform = 'translateX(-50%)';
            }
            const navButtons = document.getElementById(panels.navBtns);
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

    private moveToScreen(id: string, containerId: string) {
        const el = document.getElementById(id);
        const container = document.getElementById(containerId);
        if (el && container) {
            container.appendChild(el);
            el.style.position = 'static';
            el.style.width = '100%';
            el.style.height = 'auto';
            el.style.display = 'block';
            el.style.top = ''; el.style.bottom = ''; el.style.left = ''; el.style.right = '';
        }
    }

    private moveNavballToScreen(canvasId: string, btnId: string, containerId: string) {
        const navCanvas = document.getElementById(canvasId);
        const navContainer = document.getElementById(containerId);
        const navButtons = document.getElementById(btnId);

        if (navCanvas && navContainer) {
            navContainer.appendChild(navCanvas);
            navCanvas.style.position = 'relative';
            navCanvas.style.left = 'auto';
            navCanvas.style.top = '50%';
            navCanvas.style.transform = 'translateY(-50%) scale(0.8)';
            navCanvas.style.bottom = '';
            navCanvas.style.margin = '0 auto';
        }

        if (navButtons && navContainer) {
            navContainer.appendChild(navButtons);
            navButtons.style.position = 'absolute';
            navButtons.style.bottom = '10px';
            navButtons.style.left = '50%';
            navButtons.style.transform = 'translateX(-50%) scale(0.8)';
        }
    }

    private restoreToBody(id: string, top?: string, bottom?: string, left?: string, right?: string) {
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
    }
}
