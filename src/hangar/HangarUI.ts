import { PartRegistry } from './PartRegistry';
import { RocketAssembly } from './RocketAssembly';


export class HangarUI {
    container: HTMLDivElement;
    palette: HTMLDivElement;
    statsPanel: HTMLDivElement;
    assembly: RocketAssembly;
    onPartSelected: (partId: string) => void;
    onLaunch: () => void;

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

        return panel;
    }

    updateStats() {
        const stats = this.assembly.getStats();
        const deltaV = this.assembly.calculateDeltaV();

        this.statsPanel.innerHTML = `
            <h3 style="margin: 0 0 10px 0; text-align: center; color: #00aaff;">Rocket Stats</h3>
            <div style="display: flex; justify-content: space-between;">
                <span>Mass:</span>
                <span>${(stats.mass / 1000).toFixed(1)} t</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Cost:</span>
                <span>$${stats.cost}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Delta V:</span>
                <span style="color: #00ff00;">${deltaV.toFixed(0)} m/s</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>TWR (Earth):</span>
                <span>${(stats.thrust ? (stats.thrust / (stats.mass * 9.81)).toFixed(2) : '0.00')}</span>
            </div>
            <button id="launch-btn" style="
                margin-top: 15px;
                width: 100%;
                padding: 10px;
                background-color: #00aaff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                font-size: 16px;
            ">LAUNCH</button>
        `;

        const btn = this.statsPanel.querySelector('#launch-btn') as HTMLButtonElement;
        if (btn) {
            btn.onclick = () => this.onLaunch();
        }
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
