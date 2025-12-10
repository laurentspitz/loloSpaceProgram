import { Body } from '../../core/Body';
import { Vector2 } from '../../core/Vector2';
import { Rocket } from '../../entities/Rocket';
import { NavballRenderer } from '../NavballRenderer';
import { IconGenerator } from '../IconGenerator';
import type { AutopilotMode } from '../types';

export interface NavballUIOptions {
    onAutopilotChange?: (mode: AutopilotMode) => void;
}

/**
 * Navball UI - handles navball rendering and autopilot buttons
 */
export class NavballUI {
    private navballRenderer: NavballRenderer | null = null;
    private autopilotMode: AutopilotMode = 'off';
    private container: HTMLDivElement | null = null;
    private rcsBtn: HTMLButtonElement | null = null;
    private sasBtn: HTMLButtonElement | null = null;
    private onAutopilotChange?: (mode: AutopilotMode) => void;

    constructor(options: NavballUIOptions = {}) {
        this.onAutopilotChange = options.onAutopilotChange;
        this.initialize();
    }

    private initialize(): void {
        const canvas = document.getElementById('navball') as HTMLCanvasElement;
        if (canvas) {
            canvas.id = 'navball-canvas';
            this.navballRenderer = new NavballRenderer(canvas);
            this.createAutopilotButtons();
        } else {
            console.warn('Navball canvas not found');
        }
    }

    private createAutopilotButtons(): void {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.bottom = '20px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-180px)';
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(2, 36px)';
        container.style.gap = '8px';
        container.id = 'navball-autopilot-buttons';

        const createIconCanvas = (type: 'prograde' | 'retrograde' | 'target' | 'anti-target' | 'maneuver'): HTMLCanvasElement => {
            const size = 32;
            switch (type) {
                case 'prograde':
                    return IconGenerator.createProgradeIcon(size, '#FFD700');
                case 'retrograde':
                    return IconGenerator.createRetrogradeIcon(size, '#FFD700');
                case 'target':
                    return IconGenerator.createTargetIcon(size, '#C71585');
                case 'anti-target':
                    return IconGenerator.createAntiTargetIcon(size, '#C71585');
                case 'maneuver':
                    return IconGenerator.createManeuverIcon(size);
            }
        };

        const createAutopilotButton = (type: 'prograde' | 'retrograde' | 'target' | 'anti-target' | 'maneuver', title: string) => {
            const btn = document.createElement('button');
            btn.style.width = '32px';
            btn.style.height = '32px';
            btn.style.padding = '0';
            btn.style.cursor = 'pointer';
            btn.style.backgroundColor = 'transparent';
            btn.style.border = 'none';
            btn.style.borderRadius = '0';
            btn.style.transition = 'filter 0.2s ease';
            btn.title = title;
            btn.appendChild(createIconCanvas(type));
            return btn;
        };

        const progradeBtn = createAutopilotButton('prograde', 'Prograde: Auto-align with velocity');
        const retroBtn = createAutopilotButton('retrograde', 'Retrograde: Auto-align opposite to velocity');
        const targetBtn = createAutopilotButton('target', 'Target: Auto-align toward target');
        const antiTargetBtn = createAutopilotButton('anti-target', 'Anti-Target: Auto-align away from target');
        const maneuverBtn = createAutopilotButton('maneuver', 'Maneuver: Auto-align with maneuver node');

        const clearAllGlow = () => {
            progradeBtn.style.boxShadow = 'none';
            retroBtn.style.boxShadow = 'none';
            targetBtn.style.boxShadow = 'none';
            antiTargetBtn.style.boxShadow = 'none';
            maneuverBtn.style.boxShadow = 'none';
        };

        progradeBtn.onclick = () => {
            if (this.autopilotMode === 'prograde') {
                this.autopilotMode = 'off';
                clearAllGlow();
            } else {
                this.autopilotMode = 'prograde';
                clearAllGlow();
                progradeBtn.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.9)';
            }
            this.onAutopilotChange?.(this.autopilotMode);
        };

        retroBtn.onclick = () => {
            if (this.autopilotMode === 'retrograde') {
                this.autopilotMode = 'off';
                clearAllGlow();
            } else {
                this.autopilotMode = 'retrograde';
                clearAllGlow();
                retroBtn.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.9)';
            }
            this.onAutopilotChange?.(this.autopilotMode);
        };

        targetBtn.onclick = () => {
            if (this.autopilotMode === 'target') {
                this.autopilotMode = 'off';
                clearAllGlow();
            } else {
                this.autopilotMode = 'target';
                clearAllGlow();
                targetBtn.style.boxShadow = '0 0 15px rgba(199, 21, 133, 0.9)';
            }
            this.onAutopilotChange?.(this.autopilotMode);
        };

        antiTargetBtn.onclick = () => {
            if (this.autopilotMode === 'anti-target') {
                this.autopilotMode = 'off';
                clearAllGlow();
            } else {
                this.autopilotMode = 'anti-target';
                clearAllGlow();
                antiTargetBtn.style.boxShadow = '0 0 15px rgba(199, 21, 133, 0.9)';
            }
            this.onAutopilotChange?.(this.autopilotMode);
        };

        maneuverBtn.onclick = () => {
            if (this.autopilotMode === 'maneuver') {
                this.autopilotMode = 'off';
                clearAllGlow();
            } else {
                this.autopilotMode = 'maneuver';
                clearAllGlow();
                maneuverBtn.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.9)';
            }
            this.onAutopilotChange?.(this.autopilotMode);
        };

        container.appendChild(progradeBtn);
        container.appendChild(retroBtn);
        container.appendChild(targetBtn);
        container.appendChild(antiTargetBtn);
        container.appendChild(maneuverBtn);

        // RCS Toggle
        const rcsBtn = document.createElement('button');
        rcsBtn.style.width = '32px';
        rcsBtn.style.height = '32px';
        rcsBtn.style.padding = '0';
        rcsBtn.style.cursor = 'pointer';
        rcsBtn.style.backgroundColor = 'transparent';
        rcsBtn.style.border = 'none';
        rcsBtn.textContent = 'RCS';
        rcsBtn.style.fontFamily = 'monospace';
        rcsBtn.style.fontSize = '10px';
        rcsBtn.style.fontWeight = 'bold';
        rcsBtn.style.color = '#ccc';
        rcsBtn.title = 'Toggle RCS System (R)';
        this.rcsBtn = rcsBtn;
        container.appendChild(rcsBtn);

        // SAS Toggle
        const sasBtn = document.createElement('button');
        sasBtn.style.width = '32px';
        sasBtn.style.height = '32px';
        sasBtn.style.padding = '0';
        sasBtn.style.cursor = 'pointer';
        sasBtn.style.backgroundColor = 'transparent';
        sasBtn.style.border = 'none';
        sasBtn.textContent = 'SAS';
        sasBtn.style.fontFamily = 'monospace';
        sasBtn.style.fontSize = '10px';
        sasBtn.style.fontWeight = 'bold';
        sasBtn.style.color = '#ccc';
        sasBtn.title = 'Toggle Stability Assist (T)';
        this.sasBtn = sasBtn;
        container.appendChild(sasBtn);

        document.body.appendChild(container);
        this.container = container;

        // Keyboard listener to disable autopilot on manual rotation
        window.addEventListener('keydown', (e) => {
            if (e.key === 'q' || e.key === 'Q' || e.key === 'd' || e.key === 'D') {
                if (this.autopilotMode !== 'off') {
                    this.autopilotMode = 'off';
                    clearAllGlow();
                    this.onAutopilotChange?.(this.autopilotMode);
                }
            }
        });
    }

    setRocketControls(rocket: Rocket): void {
        if (this.rcsBtn) {
            this.rcsBtn.onclick = () => {
                if (rocket.controls) {
                    rocket.controls.rcsEnabled = !rocket.controls.rcsEnabled;
                }
            };
        }
        if (this.sasBtn) {
            this.sasBtn.onclick = () => {
                if (rocket.controls) {
                    rocket.controls.sasEnabled = !rocket.controls.sasEnabled;
                }
            };
        }
    }

    updateRCSButton(enabled: boolean): void {
        if (this.rcsBtn) {
            if (enabled) {
                this.rcsBtn.style.color = '#00C851';
                this.rcsBtn.style.boxShadow = '0 0 5px rgba(0, 200, 81, 0.5)';
            } else {
                this.rcsBtn.style.color = '#ccc';
                this.rcsBtn.style.boxShadow = 'none';
            }
        }
    }

    updateSASButton(enabled: boolean): void {
        if (this.sasBtn) {
            if (enabled) {
                this.sasBtn.style.color = '#00C851';
                this.sasBtn.style.boxShadow = '0 0 5px rgba(0, 200, 81, 0.5)';
            } else {
                this.sasBtn.style.color = '#ccc';
                this.sasBtn.style.boxShadow = 'none';
            }
        }
    }

    render(rocket: Rocket, velocityVector: Vector2, referenceBody: Body, maneuverNodes?: any[]): void {
        if (this.navballRenderer) {
            this.navballRenderer.setRocket(rocket);
            if (maneuverNodes) {
                this.navballRenderer.setManeuverNodes(maneuverNodes, []);
            }
            this.navballRenderer.render(rocket, velocityVector, referenceBody);
        }
    }

    getAutopilotMode(): AutopilotMode {
        return this.autopilotMode;
    }

    setAutopilotMode(mode: AutopilotMode): void {
        this.autopilotMode = mode;
    }

    getNavballRenderer(): NavballRenderer | null {
        return this.navballRenderer;
    }

    dispose(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
