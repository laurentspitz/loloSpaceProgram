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
    private wrapper: HTMLDivElement | null = null;
    private rcsBtn: HTMLButtonElement | null = null;
    private sasBtn: HTMLButtonElement | null = null;
    private onAutopilotChange?: (mode: AutopilotMode) => void;
    private isCollapsed: boolean = false;

    constructor(options: NavballUIOptions = {}) {
        this.onAutopilotChange = options.onAutopilotChange;
        this.initialize();
    }

    private initialize(): void {
        // Try both IDs - original 'navball' and renamed 'navball-canvas'
        let canvas = document.getElementById('navball') as HTMLCanvasElement;
        if (!canvas) {
            canvas = document.getElementById('navball-canvas') as HTMLCanvasElement;
        }

        if (canvas) {
            canvas.style.display = 'block';
            canvas.id = 'navball-canvas';
            this.navballRenderer = new NavballRenderer(canvas);

            // Create wrapper and setup collapse
            this.createNavballWrapper(canvas);
            this.createAutopilotButtons();
        } else {
            console.warn('Navball canvas not found (tried both navball and navball-canvas)');
        }
    }

    private createNavballWrapper(canvas: HTMLCanvasElement): void {
        // Create wrapper that holds everything
        this.wrapper = document.createElement('div');
        this.wrapper.id = 'navball-wrapper';
        this.wrapper.style.position = 'absolute';
        this.wrapper.style.bottom = '0';
        this.wrapper.style.left = '50%';
        this.wrapper.style.transform = 'translateX(-50%)';
        this.wrapper.style.display = 'flex';
        this.wrapper.style.flexDirection = 'column';
        this.wrapper.style.alignItems = 'center';
        this.wrapper.style.zIndex = '200';
        this.wrapper.style.transition = 'transform 0.3s ease';
        this.wrapper.style.paddingBottom = '10px';

        // Create toggle button (at the top of the wrapper)
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'navball-toggle';
        toggleBtn.innerHTML = '▼';
        toggleBtn.style.width = '50px';
        toggleBtn.style.height = '24px';
        toggleBtn.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';
        toggleBtn.style.border = '1px solid #444';
        toggleBtn.style.borderRadius = '8px 8px 0 0';
        toggleBtn.style.color = '#fff';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.fontSize = '12px';
        toggleBtn.style.marginBottom = '-1px';
        toggleBtn.title = 'Toggle Navball';
        toggleBtn.onclick = () => this.toggleCollapse();

        // Create content row for canvas and buttons
        const contentRow = document.createElement('div');
        contentRow.id = 'navball-content-row';
        contentRow.style.display = 'flex';
        contentRow.style.flexDirection = 'row';
        contentRow.style.alignItems = 'center';
        contentRow.style.gap = '10px'; // Space between navball and buttons

        // Move canvas into content row
        canvas.style.position = 'relative';
        canvas.style.bottom = 'auto';
        canvas.style.left = 'auto';
        canvas.style.transform = 'none';

        contentRow.appendChild(canvas);
        this.wrapper.appendChild(toggleBtn);
        this.wrapper.appendChild(contentRow);
        document.body.appendChild(this.wrapper);
    }

    addLeftContent(element: HTMLElement): void {
        const contentRow = document.getElementById('navball-content-row');
        if (contentRow && element) {
            // Insert at beginning of row
            if (contentRow.firstChild) {
                contentRow.insertBefore(element, contentRow.firstChild);
            } else {
                contentRow.appendChild(element);
            }
        }
    }

    private toggleCollapse(): void {
        this.isCollapsed = !this.isCollapsed;
        const toggleBtn = document.getElementById('navball-toggle');

        if (this.wrapper) {
            if (this.isCollapsed) {
                // Slide down - hide navball, keep toggle visible
                // Calculate height to slide: total wrapper height - toggle button height
                // This ensures the toggle button sits exactly at the bottom of the screen
                const wrapperHeight = this.wrapper.offsetHeight;
                const toggleHeight = toggleBtn?.offsetHeight || 24;
                const slideHeight = wrapperHeight - toggleHeight;

                this.wrapper.style.transform = `translateX(-50%) translateY(${slideHeight}px)`;
                if (toggleBtn) toggleBtn.innerHTML = '▲';
            } else {
                // Slide up - show navball
                this.wrapper.style.transform = 'translateX(-50%)';
                if (toggleBtn) toggleBtn.innerHTML = '▼';
            }
        }
    }

    private createAutopilotButtons(): void {
        const container = document.createElement('div');
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(2, 36px)';
        container.style.gap = '8px';
        container.style.marginLeft = '0px'; // Reset margin
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
        maneuverBtn.style.width = '100%'; // Full width for grid
        maneuverBtn.style.gridColumn = '1 / -1'; // Span all columns

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

        // Separator
        const separator = document.createElement('div');
        separator.style.height = '1px';
        separator.style.backgroundColor = '#444';
        separator.style.margin = '4px 0';
        separator.style.width = '100%';
        separator.style.gridColumn = '1 / -1'; // Span all columns
        container.appendChild(separator);

        container.appendChild(progradeBtn);
        container.appendChild(retroBtn);
        container.appendChild(targetBtn);
        container.appendChild(antiTargetBtn);
        container.appendChild(maneuverBtn);



        // Append to content row if in wrapper, else body
        const contentRow = document.getElementById('navball-content-row');
        if (this.wrapper && contentRow) {
            contentRow.appendChild(container);
        } else if (this.wrapper) {
            this.wrapper.appendChild(container);
        } else {
            document.body.appendChild(container);
        }
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
        // Canvas was renamed to 'navball-canvas' in initialize()
        const canvas = document.getElementById('navball-canvas');
        if (canvas) {
            canvas.style.display = 'none';
            // Restore original ID for next initialization
            canvas.id = 'navball';
            // Move canvas back to body if it was in wrapper
            if (canvas.parentNode && canvas.parentNode !== document.body) {
                document.body.appendChild(canvas);
            }
        }

        // Remove wrapper which contains toggle and buttons
        if (this.wrapper && this.wrapper.parentNode) {
            this.wrapper.parentNode.removeChild(this.wrapper);
        }

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
