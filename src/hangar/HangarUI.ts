import { PartRegistry } from './PartRegistry';
import { RocketAssembly } from './RocketAssembly';
import type { PartDefinition } from './PartDefinition';


export class HangarUI {
    container: HTMLDivElement;
    palette: HTMLDivElement;
    statsPanel: HTMLDivElement;
    assembly: RocketAssembly;
    onPartSelected: (partId: string) => void;
    onLaunch: () => void;

    // Stat value elements
    massValue!: HTMLSpanElement;
    costValue!: HTMLSpanElement;
    deltaVValue!: HTMLSpanElement;
    twrValue!: HTMLSpanElement;

    constructor(assembly: RocketAssembly, onPartSelected: (partId: string) => void, onLaunch: () => void) {
        this.assembly = assembly;
        this.onPartSelected = onPartSelected;
        this.onLaunch = onLaunch;

        this.container = document.createElement('div');
        this.container.id = 'hangar-ui';
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none'; // Let clicks pass through to canvas

        this.palette = this.createPalette();
        this.statsPanel = this.createStatsPanel();

        this.container.appendChild(this.palette);
        this.container.appendChild(this.statsPanel);
        document.body.appendChild(this.container);

        // Initial stats update
        this.updateStats();
    }

    private createPalette(): HTMLDivElement {
        const palette = document.createElement('div');
        palette.style.position = 'absolute';
        palette.style.top = '20px';
        palette.style.left = '20px';
        palette.style.width = '200px';
        palette.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';
        palette.style.border = '1px solid #444';
        palette.style.borderRadius = '8px';
        palette.style.padding = '10px';
        palette.style.pointerEvents = 'auto'; // Re-enable clicks
        palette.style.display = 'flex';
        palette.style.flexDirection = 'column';
        palette.style.gap = '10px';

        const title = document.createElement('h3');
        title.textContent = 'Parts';
        title.style.color = '#fff';
        title.style.margin = '0 0 10px 0';
        title.style.textAlign = 'center';
        palette.appendChild(title);

        const parts = PartRegistry.getAll();
        parts.forEach(part => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '10px';
            item.style.padding = '8px';
            item.style.backgroundColor = '#2a2a2a';
            item.style.borderRadius = '4px';
            item.style.cursor = 'pointer';
            item.style.transition = 'background 0.2s';

            item.onmouseover = () => item.style.backgroundColor = '#3a3a3a';
            item.onmouseout = () => item.style.backgroundColor = '#2a2a2a';

            // Icon (using texture)
            const icon = document.createElement('img');
            icon.src = part.texture;
            icon.style.width = '30px';
            icon.style.height = '30px';
            icon.style.objectFit = 'contain';
            item.appendChild(icon);

            // Name
            const name = document.createElement('span');
            name.textContent = part.name;
            name.style.color = '#ddd';
            name.style.fontSize = '14px';
            item.appendChild(name);

            // Use mousedown for drag-and-hold
            item.onmousedown = (e) => {
                e.preventDefault(); // Prevent text selection
                this.onPartSelected(part.id);
            };

            // Add tooltip on hover
            const tooltip = this.createTooltip(part);
            item.onmouseenter = () => {
                item.style.backgroundColor = '#3a3a3a';
                document.body.appendChild(tooltip);

                // Position tooltip next to palette
                const rect = item.getBoundingClientRect();
                tooltip.style.left = `${rect.right + 10}px`;
                tooltip.style.top = `${rect.top}px`;
            };
            item.onmouseleave = () => {
                item.style.backgroundColor = '#2a2a2a';
                if (tooltip.parentElement) {
                    document.body.removeChild(tooltip);
                }
            };

            palette.appendChild(item);
        });

        // Trash Zone
        const trash = document.createElement('div');
        trash.id = 'hangar-trash';
        trash.style.marginTop = '20px';
        trash.style.padding = '15px';
        trash.style.border = '2px dashed #ff4444';
        trash.style.borderRadius = '4px';
        trash.style.color = '#ff4444';
        trash.style.textAlign = 'center';
        trash.style.fontWeight = 'bold';
        trash.textContent = '🗑️ Drop here to Delete';
        palette.appendChild(trash);

        return palette;
    }

    createTooltip(part: PartDefinition): HTMLDivElement {
        const tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = '#1a1a1a';
        tooltip.style.border = '2px solid #444';
        tooltip.style.borderRadius = '4px';
        tooltip.style.padding = '10px';
        tooltip.style.color = '#ddd';
        tooltip.style.fontSize = '12px';
        tooltip.style.zIndex = '10000';
        tooltip.style.minWidth = '200px';
        tooltip.style.pointerEvents = 'none';

        let content = `<strong>${part.name}</strong><br>`;
        content += `<em>${part.description}</em><br><br>`;

        if (part.stats.mass !== undefined) {
            content += `Mass: ${part.stats.mass} kg<br>`;
        }
        if (part.stats.fuel !== undefined) {
            content += `Fuel: ${part.stats.fuel} kg<br>`;
        }
        if (part.stats.thrust !== undefined) {
            content += `Thrust: ${(part.stats.thrust / 1000).toFixed(0)} kN<br>`;
        }
        if (part.stats.isp !== undefined) {
            content += `ISP: ${part.stats.isp}s<br>`;
        }
        if (part.stats.cost !== undefined) {
            content += `Cost: $${part.stats.cost}<br>`;
        }

        tooltip.innerHTML = content;
        return tooltip;
    }

    isOverPalette(x: number, y: number): boolean {
        const rect = this.palette.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }

    private createStatsPanel(): HTMLDivElement {
        const panel = document.createElement('div');
        panel.style.position = 'absolute';
        panel.style.bottom = '20px';
        panel.style.right = '20px';
        panel.style.width = '250px';
        panel.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';
        panel.style.border = '1px solid #444';
        panel.style.borderRadius = '8px';
        panel.style.padding = '15px';
        panel.style.pointerEvents = 'auto';
        panel.style.color = '#fff';
        panel.style.fontFamily = 'monospace';

        const createStatRow = (label: string, valueSpan: HTMLSpanElement, color?: string) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            row.appendChild(labelSpan);
            if (color) {
                valueSpan.style.color = color;
            }
            row.appendChild(valueSpan);
            return row;
        };

        const title = document.createElement('h3');
        title.style.margin = '0 0 10px 0';
        title.style.textAlign = 'center';
        title.style.color = '#00aaff';
        title.textContent = 'Rocket Stats';
        panel.appendChild(title);

        this.massValue = document.createElement('span');
        panel.appendChild(createStatRow('Mass:', this.massValue));

        this.costValue = document.createElement('span');
        panel.appendChild(createStatRow('Cost:', this.costValue));

        this.deltaVValue = document.createElement('span');
        panel.appendChild(createStatRow('Delta V:', this.deltaVValue, '#00ff00'));

        this.twrValue = document.createElement('span');
        panel.appendChild(createStatRow('TWR (Earth):', this.twrValue));

        const launchButton = document.createElement('button');
        launchButton.id = 'launch-btn';
        launchButton.style.marginTop = '15px';
        launchButton.style.width = '100%';
        launchButton.style.padding = '10px';
        launchButton.style.backgroundColor = '#00aaff';
        launchButton.style.color = 'white';
        launchButton.style.border = 'none';
        launchButton.style.borderRadius = '4px';
        launchButton.style.cursor = 'pointer';
        launchButton.style.fontWeight = 'bold';
        launchButton.style.fontSize = '16px';
        launchButton.textContent = 'LAUNCH';
        launchButton.onclick = () => this.onLaunch();
        panel.appendChild(launchButton);

        return panel;
    }

    updateStats() {
        const stats = this.assembly.getStats();
        const deltaV = this.assembly.calculateDeltaV();
        const dryMass = stats.mass - (stats.fuel || 0);
        const twr = stats.thrust && stats.mass > 0 ? stats.thrust / (stats.mass * 9.81) : 0;

        this.massValue.textContent = `${stats.mass.toFixed(0)} kg`;
        this.costValue.textContent = `$${stats.cost.toFixed(0)}`;
        this.deltaVValue.textContent = `${deltaV.toFixed(0)} m/s`;
        this.twrValue.textContent = twr.toFixed(2);

        // Update mass breakdown tooltip
        this.massValue.title = `Dry Mass: ${dryMass.toFixed(0)} kg\nFuel: ${(stats.fuel || 0).toFixed(0)} kg\nTotal: ${stats.mass.toFixed(0)} kg`;
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
