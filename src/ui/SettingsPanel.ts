import { controls, type ControlConfig } from '../config/Controls';

/**
 * SettingsPanel - UI for configuring keyboard controls
 */
export class SettingsPanel {
    container: HTMLDivElement;
    onClose: () => void;
    private activeBinding: { action: keyof ControlConfig; element: HTMLSpanElement } | null = null;

    constructor(onClose: () => void) {
        this.onClose = onClose;

        // Create overlay container
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        this.container.style.display = 'flex';
        this.container.style.justifyContent = 'center';
        this.container.style.alignItems = 'center';
        this.container.style.zIndex = '2001';
        this.container.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

        // Create panel
        const panel = document.createElement('div');
        panel.style.backgroundColor = '#1a1a1a';
        panel.style.border = '2px solid #00aaff';
        panel.style.borderRadius = '12px';
        panel.style.padding = '30px';
        panel.style.maxWidth = '600px';
        panel.style.maxHeight = '80vh';
        panel.style.overflowY = 'auto';
        panel.style.boxShadow = '0 0 30px rgba(0, 170, 255, 0.5)';
        this.container.appendChild(panel);

        // Title
        const title = document.createElement('h2');
        title.textContent = 'KEYBOARD CONTROLS';
        title.style.color = '#00aaff';
        title.style.margin = '0 0 25px 0';
        title.style.fontSize = '28px';
        title.style.textAlign = 'center';
        title.style.textShadow = '0 0 10px #00aaff';
        panel.appendChild(title);

        // Controls sections
        this.addControlSection(panel, 'Rocket Controls', [
            ['thrust', 'Thrust (Full)'],
            ['cutEngines', 'Cut Engines'],
            ['rotateLeft', 'Rotate Left'],
            ['rotateRight', 'Rotate Right'],
            ['increaseThrottle', 'Increase Throttle'],
            ['decreaseThrottle', 'Decrease Throttle'],
        ]);

        this.addControlSection(panel, 'Time Warp', [
            ['timeWarpIncrease', 'Increase'],
            ['timeWarpDecrease', 'Decrease'],
            ['timeWarpReset', 'Reset'],
        ]);

        this.addControlSection(panel, 'Maneuver Nodes', [
            ['createManeuverNode', 'Create'],
            ['deleteManeuverNode', 'Delete'],
        ]);

        this.addControlSection(panel, 'View Controls', [
            ['toggleTrajectory', 'Toggle Trajectory'],
            ['zoomIn', 'Zoom In'],
            ['zoomOut', 'Zoom Out'],
        ]);

        this.addControlSection(panel, 'Autopilot', [
            ['togglePrograde', 'Prograde'],
            ['toggleRetrograde', 'Retrograde'],
            ['toggleTarget', 'Target'],
            ['toggleAntiTarget', 'Anti-Target'],
            ['toggleManeuver', 'Maneuver'],
        ]);

        // Buttons container
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '15px';
        btnContainer.style.marginTop = '30px';
        btnContainer.style.justifyContent = 'center';
        panel.appendChild(btnContainer);

        // Reset button
        const resetBtn = this.createButton('Reset to Defaults', '#ff8800');
        resetBtn.onclick = () => this.resetControls();
        btnContainer.appendChild(resetBtn);

        // Close button
        const closeBtn = this.createButton('Close', '#00aaff');
        closeBtn.onclick = () => this.close();
        btnContainer.appendChild(closeBtn);

        // Listen for keypresses globally
        this.handleKeyPress = this.handleKeyPress.bind(this);
        document.addEventListener('keydown', this.handleKeyPress);

        document.body.appendChild(this.container);
    }

    private addControlSection(parent: HTMLElement, title: string, controlsList: [keyof ControlConfig, string][]) {
        // Section title
        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = title;
        sectionTitle.style.color = '#aaaaaa';
        sectionTitle.style.fontSize = '18px';
        sectionTitle.style.marginTop = '20px';
        sectionTitle.style.marginBottom = '10px';
        parent.appendChild(sectionTitle);

        // Control rows
        controlsList.forEach(([action, label]) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '8px 0';
            row.style.borderBottom = '1px solid #333';

            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            labelSpan.style.color = '#cccccc';
            labelSpan.style.fontSize = '16px';
            row.appendChild(labelSpan);

            const keySpan = document.createElement('span');
            keySpan.textContent = this.formatKey(controls.getControl(action));
            keySpan.style.color = '#00aaff';
            keySpan.style.fontSize = '16px';
            keySpan.style.padding = '5px 12px';
            keySpan.style.backgroundColor = '#2a2a2a';
            keySpan.style.borderRadius = '4px';
            keySpan.style.cursor = 'pointer';
            keySpan.style.minWidth = '80px';
            keySpan.style.textAlign = 'center';
            keySpan.style.transition = 'all 0.2s ease';

            keySpan.onclick = () => this.startRebinding(action, keySpan);
            keySpan.onmouseover = () => {
                keySpan.style.backgroundColor = '#3a3a3a';
                keySpan.style.boxShadow = '0 0 8px rgba(0, 170, 255, 0.5)';
            };
            keySpan.onmouseout = () => {
                if (this.activeBinding?.element !== keySpan) {
                    keySpan.style.backgroundColor = '#2a2a2a';
                    keySpan.style.boxShadow = 'none';
                }
            };

            row.appendChild(keySpan);
            parent.appendChild(row);
        });
    }

    private formatKey(key: string): string {
        // Capitalize first letter for display
        if (key.length === 1) return key.toUpperCase();
        return key.charAt(0).toUpperCase() + key.slice(1);
    }

    private startRebinding(action: keyof ControlConfig, element: HTMLSpanElement) {
        // Clear previous active binding
        if (this.activeBinding) {
            this.activeBinding.element.style.backgroundColor = '#2a2a2a';
            this.activeBinding.element.style.boxShadow = 'none';
        }

        // Set new active binding
        this.activeBinding = { action, element };
        element.textContent = '...';
        element.style.backgroundColor = '#ff8800';
        element.style.boxShadow = '0 0 12px rgba(255, 136, 0, 0.8)';
    }

    private handleKeyPress(e: KeyboardEvent) {
        if (!this.activeBinding) return;

        e.preventDefault();
        e.stopPropagation();

        const { action, element } = this.activeBinding;

        // Update control
        controls.setControl(action, e.key);

        // Update display
        element.textContent = this.formatKey(e.key);
        element.style.backgroundColor = '#2a2a2a';
        element.style.boxShadow = 'none';

        // Clear active binding
        this.activeBinding = null;
    }

    private resetControls() {
        controls.reset();

        // Update all displayed keys
        const allKeys = this.container.querySelectorAll('span[style*="cursor"]');
        allKeys.forEach((keySpan, index) => {
            const actions: (keyof ControlConfig)[] = [
                'thrust', 'cutEngines', 'rotateLeft', 'rotateRight', 'increaseThrottle', 'decreaseThrottle',
                'timeWarpIncrease', 'timeWarpDecrease', 'timeWarpReset',
                'createManeuverNode', 'deleteManeuverNode',
                'toggleTrajectory', 'zoomIn', 'zoomOut',
                'togglePrograde', 'toggleRetrograde', 'toggleTarget', 'toggleAntiTarget', 'toggleManeuver'
            ];

            if (index < actions.length) {
                (keySpan as HTMLElement).textContent = this.formatKey(controls.getControl(actions[index]));
            }
        });
    }

    private createButton(text: string, color: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.padding = '10px 20px';
        btn.style.fontSize = '16px';
        btn.style.backgroundColor = 'transparent';
        btn.style.color = color;
        btn.style.border = `2px solid ${color}`;
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.3s ease';

        btn.onmouseover = () => {
            btn.style.backgroundColor = color;
            btn.style.color = '#000';
            btn.style.boxShadow = `0 0 12px ${color}`;
        };

        btn.onmouseout = () => {
            btn.style.backgroundColor = 'transparent';
            btn.style.color = color;
            btn.style.boxShadow = 'none';
        };

        return btn;
    }

    private close() {
        document.removeEventListener('keydown', this.handleKeyPress);
        this.onClose();
    }

    dispose() {
        document.removeEventListener('keydown', this.handleKeyPress);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
