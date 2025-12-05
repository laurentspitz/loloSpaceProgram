import { PartRegistry } from './PartRegistry';
import { RocketAssembly } from './RocketAssembly';
import type { PartDefinition } from './PartDefinition';
import { RocketSaveManager } from './RocketSaveManager';


export class HangarUI {
    container: HTMLDivElement;
    palette: HTMLDivElement;
    statsPanel: HTMLDivElement;
    assembly: RocketAssembly;
    onPartSelected: (partId: string) => void;
    onLaunch: () => void;
    onSave: (name: string) => void;
    onLoad: (assembly: RocketAssembly) => void;
    onBack: () => void;

    // Stat value elements
    massValue!: HTMLSpanElement;
    costValue!: HTMLSpanElement;
    deltaVValue!: HTMLSpanElement;
    twrValue!: HTMLSpanElement;

    constructor(
        assembly: RocketAssembly,
        onPartSelected: (partId: string) => void,
        onLaunch: () => void,
        onSave: (name: string) => void,
        onLoad: (assembly: RocketAssembly) => void,
        onBack: () => void
    ) {
        this.assembly = assembly;
        this.onPartSelected = onPartSelected;
        this.onLaunch = onLaunch;
        this.onSave = onSave;
        this.onLoad = onLoad;
        this.onBack = onBack;

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
        this.container.appendChild(this.createBackButton());

        document.body.appendChild(this.container);

        // Initial stats update
        this.updateStats();
    }

    private createBackButton(): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.innerHTML = '⬅️';
        btn.style.position = 'absolute';
        btn.style.top = '20px';
        btn.style.right = '20px';
        btn.style.padding = '10px 20px';
        btn.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';
        btn.style.color = '#fff';
        btn.style.border = '1px solid #444';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';
        btn.style.pointerEvents = 'auto';
        btn.style.fontWeight = 'bold';
        btn.style.fontSize = '14px';

        btn.onmouseover = () => btn.style.backgroundColor = '#3a3a3a';
        btn.onmouseout = () => btn.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';

        btn.onclick = () => this.onBack();
        return btn;
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

        // Load Button
        const loadButton = document.createElement('button');
        loadButton.style.marginTop = '15px';
        loadButton.style.width = '100%';
        loadButton.style.padding = '8px';
        loadButton.style.backgroundColor = '#4a9eff';
        loadButton.style.color = 'white';
        loadButton.style.border = 'none';
        loadButton.style.borderRadius = '4px';
        loadButton.style.cursor = 'pointer';
        loadButton.style.fontWeight = 'bold';
        loadButton.textContent = '📂 LOAD';
        loadButton.onclick = () => this.showLoadDialog();
        panel.appendChild(loadButton);

        // Save Button
        const saveButton = document.createElement('button');
        saveButton.style.marginTop = '8px';
        saveButton.style.width = '100%';
        saveButton.style.padding = '8px';
        saveButton.style.backgroundColor = '#5a5a5a';
        saveButton.style.color = 'white';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '4px';
        saveButton.style.cursor = 'pointer';
        saveButton.style.fontWeight = 'bold';
        saveButton.textContent = '💾 SAVE';
        saveButton.onclick = () => this.showSaveDialog();
        panel.appendChild(saveButton);

        const launchButton = document.createElement('button');
        launchButton.id = 'launch-btn';
        launchButton.style.marginTop = '8px';
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

    showSaveDialog() {
        const existingDialog = document.getElementById('save-dialog');
        if (existingDialog && existingDialog.parentElement && existingDialog.parentElement.parentElement) {
            existingDialog.parentElement.parentElement.removeChild(existingDialog.parentElement);
        }

        const overlay = this.createDialogOverlay();
        const dialog = document.createElement('div');
        dialog.id = 'save-dialog';
        dialog.style.backgroundColor = '#2a2a2a';
        dialog.style.border = '2px solid #444';
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '20px';
        dialog.style.minWidth = '300px';
        dialog.style.maxWidth = '400px';

        const title = document.createElement('h3');
        title.textContent = 'Save Rocket';
        title.style.color = '#fff';
        title.style.margin = '0 0 15px 0';
        dialog.appendChild(title);

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter rocket name...';
        input.style.width = '100%';
        input.style.padding = '8px';
        input.style.marginBottom = '15px';
        input.style.backgroundColor = '#1a1a1a';
        input.style.color = '#fff';
        input.style.border = '1px solid #444';
        input.style.borderRadius = '4px';
        input.style.fontSize = '14px';
        input.style.boxSizing = 'border-box';
        dialog.appendChild(input);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.style.flex = '1';
        saveBtn.style.padding = '8px';
        saveBtn.style.backgroundColor = '#00aaff';
        saveBtn.style.color = 'white';
        saveBtn.style.border = 'none';
        saveBtn.style.borderRadius = '4px';
        saveBtn.style.cursor = 'pointer';
        saveBtn.style.fontWeight = 'bold';
        saveBtn.onclick = () => {
            const name = input.value.trim();
            if (!name) {
                alert('Please enter a name for your rocket');
                return;
            }

            // Check if rocket already exists
            if (RocketSaveManager.exists(name)) {
                this.showConfirmDialog(
                    `Override "${name}"?`,
                    () => {
                        this.onSave(name);
                        overlay.remove();
                    }
                );
            } else {
                this.onSave(name);
                overlay.remove();
            }
        };
        buttonContainer.appendChild(saveBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.flex = '1';
        cancelBtn.style.padding = '8px';
        cancelBtn.style.backgroundColor = '#5a5a5a';
        cancelBtn.style.color = 'white';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '4px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.onclick = () => overlay.remove();
        buttonContainer.appendChild(cancelBtn);

        dialog.appendChild(buttonContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Focus input and select on enter
        input.focus();
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveBtn.click();
        });
    }

    showLoadDialog() {
        const existingDialog = document.getElementById('load-dialog');
        if (existingDialog && existingDialog.parentElement && existingDialog.parentElement.parentElement) {
            existingDialog.parentElement.parentElement.removeChild(existingDialog.parentElement);
        }

        const savedRockets = RocketSaveManager.list();

        const overlay = this.createDialogOverlay();
        const dialog = document.createElement('div');
        dialog.id = 'load-dialog';
        dialog.style.backgroundColor = '#2a2a2a';
        dialog.style.border = '2px solid #444';
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '20px';
        dialog.style.minWidth = '400px';
        dialog.style.maxWidth = '500px';
        dialog.style.maxHeight = '70vh';
        dialog.style.overflowY = 'auto';

        const title = document.createElement('h3');
        title.textContent = 'Load Rocket';
        title.style.color = '#fff';
        title.style.margin = '0 0 15px 0';
        dialog.appendChild(title);

        if (savedRockets.length === 0) {
            const empty = document.createElement('p');
            empty.textContent = 'No saved rockets found';
            empty.style.color = '#999';
            empty.style.textAlign = 'center';
            empty.style.padding = '20px';
            dialog.appendChild(empty);
        } else {
            savedRockets.forEach(rocket => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.padding = '10px';
                item.style.marginBottom = '8px';
                item.style.backgroundColor = '#1a1a1a';
                item.style.borderRadius = '4px';
                item.style.cursor = 'pointer';
                item.style.transition = 'background 0.2s';

                const info = document.createElement('div');
                info.style.flex = '1';

                const name = document.createElement('div');
                name.textContent = rocket.name;
                name.style.color = '#fff';
                name.style.fontWeight = 'bold';
                name.style.marginBottom = '4px';
                info.appendChild(name);

                const details = document.createElement('div');
                details.style.color = '#999';
                details.style.fontSize = '12px';
                const date = new Date(rocket.savedAt).toLocaleString();
                details.textContent = `${rocket.partCount} parts • ${date}`;
                info.appendChild(details);

                item.appendChild(info);

                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.style.padding = '5px 10px';
                deleteBtn.style.backgroundColor = '#ff4444';
                deleteBtn.style.color = 'white';
                deleteBtn.style.border = 'none';
                deleteBtn.style.borderRadius = '4px';
                deleteBtn.style.cursor = 'pointer';
                deleteBtn.style.marginLeft = '10px';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.showConfirmDialog(
                        `Delete "${rocket.name}"?`,
                        () => {
                            RocketSaveManager.delete(rocket.name);
                            this.showLoadDialog(); // Refresh list
                        }
                    );
                };
                item.appendChild(deleteBtn);

                item.onmouseover = () => item.style.backgroundColor = '#3a3a3a';
                item.onmouseout = () => item.style.backgroundColor = '#1a1a1a';
                item.onclick = () => {
                    const loaded = RocketSaveManager.load(rocket.name);
                    if (loaded) {
                        this.onLoad(loaded);
                        overlay.remove();
                    } else {
                        alert(`Failed to load "${rocket.name}"`);
                    }
                };

                dialog.appendChild(item);
            });
        }

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.marginTop = '15px';
        closeBtn.style.width = '100%';
        closeBtn.style.padding = '8px';
        closeBtn.style.backgroundColor = '#5a5a5a';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => overlay.remove();
        dialog.appendChild(closeBtn);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    showConfirmDialog(message: string, onConfirm: () => void, onCancel?: () => void) {
        const overlay = this.createDialogOverlay();
        // Higher z-index to be on top of load dialog
        overlay.style.zIndex = '20000';

        const dialog = document.createElement('div');
        dialog.style.backgroundColor = '#2a2a2a';
        dialog.style.border = '2px solid #ff4444'; // Red border for danger
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '20px';
        dialog.style.minWidth = '300px';
        dialog.style.maxWidth = '400px';
        dialog.style.textAlign = 'center';

        const text = document.createElement('p');
        text.textContent = message;
        text.style.color = '#fff';
        text.style.marginBottom = '20px';
        text.style.fontSize = '16px';
        dialog.appendChild(text);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.justifyContent = 'center';

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirm';
        confirmBtn.style.padding = '8px 20px';
        confirmBtn.style.backgroundColor = '#ff4444';
        confirmBtn.style.color = 'white';
        confirmBtn.style.border = 'none';
        confirmBtn.style.borderRadius = '4px';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.style.fontWeight = 'bold';
        confirmBtn.onclick = () => {
            onConfirm();
            overlay.remove();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.padding = '8px 20px';
        cancelBtn.style.backgroundColor = '#5a5a5a';
        cancelBtn.style.color = 'white';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '4px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.onclick = () => {
            if (onCancel) onCancel();
            overlay.remove();
        };

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);
        dialog.appendChild(buttonContainer);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    private createDialogOverlay(): HTMLDivElement {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '10000';
        overlay.style.pointerEvents = 'auto';
        return overlay;
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
