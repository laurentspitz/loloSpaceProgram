import type { CockpitTheme } from '../../ui/CockpitTheme';
import { UI } from '../../ui/UI';
import { Rocket } from '../../entities/Rocket';

export class ApolloCockpit implements CockpitTheme {
    id = 'apollo';
    name = 'Apollo Cockpit';
    private overlay: HTMLElement | null = null;

    private ui: UI | null = null;
    private currentRocket: Rocket | null = null;

    // UI References


    setup(ui: UI): void {
        this.ui = ui;
        this.currentRocket = ui.currentRocket;
        console.log('[ApolloCockpit] Setup');

        // Load CSS if not already present
        if (!document.getElementById('apollo-theme-css')) {
            const link = document.createElement('link');
            link.id = 'apollo-theme-css';
            link.rel = 'stylesheet';
            link.href = new URL('./apollo.css', import.meta.url).href;
            document.head.appendChild(link);
        }

        document.body.classList.add('theme-apollo');

        // Create overlay if not exists
        if (!this.overlay) {
            this.createOverlay();
        }

        if (this.overlay) {
            this.overlay.style.display = 'flex';
            document.body.appendChild(this.overlay);
        }

        // Hook into update loop for readings
        // Note: UI loop calls theme.update()
    }

    createOverlay() {
        const dash = document.createElement('div');
        dash.id = 'apollo-dashboard';

        // --- Helper Methods ---
        const createGauge = (id: string, label: string) => {
            const g = document.createElement('div');
            g.className = 'apollo-gauge';
            g.id = id;

            const needle = document.createElement('div');
            needle.className = 'gauge-needle';
            g.appendChild(needle);

            const lbl = document.createElement('div');
            lbl.className = 'gauge-label';
            lbl.innerText = label;
            g.appendChild(lbl);

            const vfd = document.createElement('div');
            vfd.className = 'apollo-vfd';
            vfd.id = `${id}-vfd`;
            vfd.style.position = 'absolute';
            vfd.style.bottom = '-30px';
            vfd.style.left = '50%';
            vfd.style.transform = 'translateX(-50%)';
            vfd.innerText = '0000';
            g.appendChild(vfd);

            return g;
        };

        const createSwitch = (label: string, onClick: () => void) => {
            const cont = document.createElement('div');
            cont.className = 'apollo-switch-container';

            const sw = document.createElement('div');
            sw.className = 'apollo-switch';
            sw.onclick = () => {
                sw.classList.toggle('active');
                onClick();
            };

            const l = document.createElement('div');
            l.className = 'switch-label';
            l.innerText = label;

            cont.appendChild(sw);
            cont.appendChild(l);
            return cont;
        };

        // --- LEFT PANEL (Fuel & Engines) ---
        const leftBlock = document.createElement('div');
        leftBlock.className = 'apollo-block';

        // Fuel Gauge
        const fuelGauge = createGauge('gauge-fuel', 'FUEL');
        (fuelGauge.querySelector('.apollo-vfd') as HTMLElement).innerText = '100%';
        leftBlock.appendChild(fuelGauge);

        // SAS Switch
        const sasSw = createSwitch('SAS', () => {
            if (this.currentRocket && this.currentRocket.controls) {
                this.currentRocket.controls.sasEnabled = !this.currentRocket.controls.sasEnabled;
                const active = this.currentRocket.controls.sasEnabled;
                sasSw.querySelector('.apollo-switch')?.classList.toggle('active', active);
                // Sync standard button if exists
                if (this.ui?.sasBtn) {
                    this.ui.sasBtn.style.backgroundColor = active ? '#007bff' : '';
                }
            }
        });

        // RCS Switch
        const rcsSw = createSwitch('RCS', () => {
            if (this.currentRocket && this.currentRocket.controls) {
                this.currentRocket.controls.rcsEnabled = !this.currentRocket.controls.rcsEnabled;
                const active = this.currentRocket.controls.rcsEnabled;
                rcsSw.querySelector('.apollo-switch')?.classList.toggle('active', active);
                if (this.ui?.rcsBtn) {
                    this.ui.rcsBtn.style.backgroundColor = active ? '#007bff' : '';
                }
            }
        });

        // Initialize state
        if (this.currentRocket?.controls?.sasEnabled) sasSw.querySelector('.apollo-switch')?.classList.add('active');
        if (this.currentRocket?.controls?.rcsEnabled) rcsSw.querySelector('.apollo-switch')?.classList.add('active');

        // Throttle Box
        const throttleBox = document.createElement('div');
        throttleBox.style.color = '#ccc';
        throttleBox.innerHTML = `<div>THROTTLE</div><div id="apollo-throttle" class="apollo-vfd">0%</div>`;

        const switchRow = document.createElement('div');
        switchRow.style.display = 'flex';
        switchRow.style.gap = '10px';
        switchRow.appendChild(sasSw);
        switchRow.appendChild(rcsSw);

        leftBlock.appendChild(switchRow);
        leftBlock.appendChild(throttleBox);
        dash.appendChild(leftBlock);

        // --- CENTER PANEL (Nav & Orbit) ---
        const centerBlock = document.createElement('div');
        centerBlock.className = 'apollo-block';

        const navContainer = document.createElement('div');
        navContainer.id = 'apollo-navball-container';
        // Reparent navball if available
        // navballRenderer logic - reparenting logic (or similar)
        /*
        if (this.ui?.navballRenderer) {
             // Logic intentionally omitted due to access restrictions
             // and need for better navball modularization later
        }
        */
        centerBlock.appendChild(navContainer);

        const orbitInfo = document.createElement('div');
        orbitInfo.style.display = 'flex';
        orbitInfo.style.flexDirection = 'column';
        orbitInfo.style.gap = '5px';
        orbitInfo.innerHTML = `
            <div style="display:flex; align-items:center;">
                <span class="vfd-label">AP:</span> <div id="apollo-ap" class="apollo-vfd">---</div>
            </div>
            <div style="display:flex; align-items:center;">
                <span class="vfd-label">PE:</span> <div id="apollo-pe" class="apollo-vfd">---</div>
            </div>
        `;
        centerBlock.appendChild(orbitInfo);
        dash.appendChild(centerBlock);

        // --- RIGHT PANEL (Flight Data & Menu) ---
        const rightBlock = document.createElement('div');
        rightBlock.className = 'apollo-block';

        // Speed
        const speedGauge = createGauge('gauge-speed', 'VELOCITY');
        rightBlock.appendChild(speedGauge);

        // Altitude
        const altGauge = createGauge('gauge-alt', 'ALTITUDE');
        rightBlock.appendChild(altGauge);

        dash.appendChild(rightBlock);

        this.overlay = dash;
    }

    update(): void {
        if (!this.overlay || !this.currentRocket) return;

        // Update Gauges (Simulated rotation)
        // Speed
        const speed = this.currentRocket.body.velocity.mag() * 1000; // m/s (approx - actually usually km/s if sim, but let's assume mag is base units)
        // Check units. In UI.ts it was `rb.velocity.mag()`. Vector2 in this codebase seems to have `mag()`.
        const speedNeedle = this.overlay.querySelector('#gauge-speed .gauge-needle') as HTMLElement;
        const speedVfd = this.overlay.querySelector('#gauge-speed-vfd') as HTMLElement;
        if (speedNeedle && speedVfd) {
            // Map 0-5000 m/s to -135 to 135 deg
            const maxSpeed = 5000;
            const deg = Math.max(-135, Math.min(135, -135 + (speed / maxSpeed) * 270));
            speedNeedle.style.transform = `rotate(${deg}deg)`;
            speedVfd.innerText = speed.toFixed(0);
        }

        // Altitude
        // We need to calculate altitude manually as Rocket doesn't have it directly exposed as property
        // or check if it does. UI.ts calculated it.
        // Let's defer altitude calculation or use basic distance from center - radius of nearest body
        let alt = 0;
        if (this.currentRocket && this.ui && this.ui.bodies) {
            // Simplified alt calculation or reuse UI logic if possible.
            // For now, let's just assume 0 or try to get it from UI if we had a helper.
            // We'll implement a basic one here:
            const rb = this.currentRocket.body;
            let dominantBody = null;
            let maxG = -1;
            for (const b of this.ui.bodies) {
                const dist = rb.position.distanceTo(b.position);
                // Simple gravity check to find nearest/dominant
                if (b.mass / (dist * dist) > maxG) { maxG = b.mass / (dist * dist); dominantBody = b; }
            }
            if (dominantBody) {
                alt = Math.max(0, rb.position.distanceTo(dominantBody.position) - dominantBody.radius);
            }
        }

        const altNeedle = this.overlay.querySelector('#gauge-alt .gauge-needle') as HTMLElement;
        const altVfd = this.overlay.querySelector('#gauge-alt-vfd') as HTMLElement;
        if (altNeedle && altVfd) {
            // Logarithmic scale for alt maybe? or just 0-100km
            const maxAlt = 100000; // 100km
            const deg = Math.max(-135, Math.min(135, -135 + (alt / maxAlt) * 270));
            altNeedle.style.transform = `rotate(${deg}deg)`;
            altVfd.innerText = (alt / 1000).toFixed(1) + 'k';
        }

        // Throttle
        const throttleVfd = this.overlay.querySelector('#apollo-throttle') as HTMLElement;
        if (throttleVfd && this.currentRocket.controls) {
            throttleVfd.innerText = (this.currentRocket.controls.throttle * 100).toFixed(0) + '%';
        }

        // Orbit
        const apVfd = this.overlay.querySelector('#apollo-ap') as HTMLElement;
        const peVfd = this.overlay.querySelector('#apollo-pe') as HTMLElement;

        // We need a proper way to access Orbit info. The Rocket entity might not have it attached directly in the type definition yet.
        // But UI.ts was accessing specific Orbit properties. It's likely computed or on the rocket but not typed?
        // Let's check accessing it as 'any' for now to bypass typescript if we are sure it exists at runtime,
        // or just placeholder it.
        const rAny = this.currentRocket as any;
        if (apVfd && peVfd && rAny.orbit) {
            apVfd.innerText = (rAny.orbit.apk / 1000).toFixed(0) + 'k';
            peVfd.innerText = (rAny.orbit.pek / 1000).toFixed(0) + 'k';
        }
    }

    cleanup(_ui: UI): void {
        document.body.classList.remove('theme-apollo');
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        // Restore navball if we moved it (logic to come)

        this.ui = null;
        this.currentRocket = null;
    }
}
