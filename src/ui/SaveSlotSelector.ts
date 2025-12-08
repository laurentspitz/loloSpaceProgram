/**
 * SaveSlotSelector - UI component for selecting/creating save slots
 */

import { SaveSlotManager, type SaveSlot } from '../services/SaveSlotManager';
import { FirebaseService } from '../services/firebase';

export class SaveSlotSelector {
    private onSlotSelected: (slotId: string, slotData: any) => void;
    private mode: 'save' | 'load';
    private overlay: HTMLDivElement | null = null;

    constructor(mode: 'save' | 'load', onSlotSelected: (slotId: string, slotData?: any) => void) {
        this.mode = mode;
        this.onSlotSelected = onSlotSelected;
    }

    async show() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100%';
        this.overlay.style.height = '100%';
        this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        this.overlay.style.display = 'flex';
        this.overlay.style.justifyContent = 'center';
        this.overlay.style.alignItems = 'center';
        this.overlay.style.zIndex = '3000';
        this.overlay.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.backgroundColor = '#1a1a1a';
        dialog.style.border = '2px solid #00aaff';
        dialog.style.borderRadius = '12px';
        dialog.style.padding = '30px';
        dialog.style.maxWidth = '700px';
        dialog.style.maxHeight = '80vh';
        dialog.style.overflowY = 'auto';
        dialog.style.boxShadow = '0 0 30px rgba(0, 170, 255, 0.5)';

        // Title
        const title = document.createElement('h2');
        title.textContent = this.mode === 'save' ? 'SAVE GAME' : 'LOAD GAME';
        title.style.color = '#00aaff';
        title.style.margin = '0 0 25px 0';
        title.style.fontSize = '28px';
        title.style.textAlign = 'center';
        title.style.textShadow = '0 0 10px #00aaff';
        dialog.appendChild(title);

        // Load slots
        const user = FirebaseService.auth.currentUser;
        const slots = await SaveSlotManager.listSlots(user?.uid);

        // Create new slot button (save mode only)
        if (this.mode === 'save') {
            const newSlotBtn = this.createButton('➕ Create New Slot', '#4CAF50');
            newSlotBtn.style.width = '100%';
            newSlotBtn.style.marginBottom = '20px';
            newSlotBtn.onclick = () => this.showCreateSlotDialog();
            dialog.appendChild(newSlotBtn);
        }

        // Slots list
        if (slots.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = 'No saved games found';
            emptyMsg.style.color = '#999';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.padding = '40px 20px';
            emptyMsg.style.fontSize = '16px';
            dialog.appendChild(emptyMsg);
        } else {
            slots.forEach(slot => {
                const slotItem = this.createSlotItem(slot);
                dialog.appendChild(slotItem);
            });
        }

        // Close button
        const closeBtn = this.createButton('Close', '#ff4444');
        closeBtn.style.width = '100%';
        closeBtn.style.marginTop = '20px';
        closeBtn.onclick = () => this.close();
        dialog.appendChild(closeBtn);

        this.overlay.appendChild(dialog);
        document.body.appendChild(this.overlay);

        // Click outside to close
        this.overlay.onclick = (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        };
    }

    private createSlotItem(slot: SaveSlot): HTMLDivElement {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '15px';
        item.style.marginBottom = '10px';
        item.style.backgroundColor = '#2a2a2a';
        item.style.borderRadius = '8px';
        item.style.cursor = this.mode === 'load' ? 'pointer' : 'default';
        item.style.transition = 'all 0.2s ease';

        if (this.mode === 'load') {
            item.onmouseover = () => {
                item.style.backgroundColor = '#3a3a3a';
                item.style.transform = 'translateX(5px)';
            };
            item.onmouseout = () => {
                item.style.backgroundColor = '#2a2a2a';
                item.style.transform = 'translateX(0)';
            };
            item.onclick = () => {
                this.onSlotSelected(slot.id, slot.data);
                this.close();
            };
        }

        // Info section
        const info = document.createElement('div');
        info.style.flex = '1';

        const nameEl = document.createElement('div');
        nameEl.textContent = slot.name;
        nameEl.style.color = '#00aaff';
        nameEl.style.fontSize = '18px';
        nameEl.style.fontWeight = 'bold';
        nameEl.style.marginBottom = '8px';
        info.appendChild(nameEl);

        const detailsEl = document.createElement('div');
        detailsEl.style.color = '#999';
        detailsEl.style.fontSize = '14px';
        detailsEl.style.lineHeight = '1.6';

        const date = new Date(slot.timestamp).toLocaleString();
        const missionTime = this.formatMissionTime(slot.missionTime);
        detailsEl.innerHTML = `
            <div>🚀 ${slot.rocketName}</div>
            <div>📍 ${slot.location}</div>
            <div>⏱️ Mission Time: ${missionTime}</div>
            <div>💾 Saved: ${date}</div>
        `;
        info.appendChild(detailsEl);

        item.appendChild(info);

        // Buttons section
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '10px';
        btnContainer.style.alignItems = 'center';

        if (this.mode === 'save') {
            const overwriteBtn = this.createButton('Overwrite', '#ff9800');
            overwriteBtn.onclick = (e) => {
                e.stopPropagation();
                this.showConfirmDialog(
                    `Overwrite "${slot.name}"?`,
                    'This will replace the existing save.',
                    () => {
                        this.onSlotSelected(slot.id);
                        this.close();
                    }
                );
            };
            btnContainer.appendChild(overwriteBtn);
        }

        const deleteBtn = this.createButton('🗑️', '#ff4444');
        deleteBtn.style.padding = '8px 16px';
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            this.showConfirmDialog(
                `Delete "${slot.name}"?`,
                'This action cannot be undone.',
                async () => {
                    try {
                        const user = FirebaseService.auth.currentUser;
                        await SaveSlotManager.deleteSlot(slot.id, user?.uid);

                        const { NotificationManager } = await import('./NotificationManager');
                        NotificationManager.show(`Slot "${slot.name}" deleted`, 'success');

                        // Refresh the list
                        this.close();
                        this.show();
                    } catch (error) {
                        const { NotificationManager } = await import('./NotificationManager');
                        NotificationManager.show('Failed to delete slot', 'error');
                    }
                }
            );
        };
        btnContainer.appendChild(deleteBtn);

        item.appendChild(btnContainer);
        return item;
    }

    private showCreateSlotDialog() {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.style.position = 'fixed';
        dialogOverlay.style.top = '0';
        dialogOverlay.style.left = '0';
        dialogOverlay.style.width = '100%';
        dialogOverlay.style.height = '100%';
        dialogOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        dialogOverlay.style.display = 'flex';
        dialogOverlay.style.justifyContent = 'center';
        dialogOverlay.style.alignItems = 'center';
        dialogOverlay.style.zIndex = '3001';

        const dialog = document.createElement('div');
        dialog.style.backgroundColor = '#2a2a2a';
        dialog.style.border = '2px solid #00aaff';
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '25px';
        dialog.style.minWidth = '400px';

        const title = document.createElement('h3');
        title.textContent = 'Enter Save Name';
        title.style.color = '#fff';
        title.style.margin = '0 0 15px 0';
        dialog.appendChild(title);

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'e.g., Mission to Mun';
        input.style.width = '100%';
        input.style.padding = '10px';
        input.style.fontSize = '16px';
        input.style.backgroundColor = '#1a1a1a';
        input.style.color = '#fff';
        input.style.border = '1px solid #00aaff';
        input.style.borderRadius = '4px';
        input.style.marginBottom = '15px';
        input.style.boxSizing = 'border-box';
        dialog.appendChild(input);

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '10px';
        btnContainer.style.justifyContent = 'flex-end';

        const cancelBtn = this.createButton('Cancel', '#555');
        cancelBtn.onclick = () => dialogOverlay.remove();
        btnContainer.appendChild(cancelBtn);

        const saveBtn = this.createButton('Save', '#4CAF50');
        saveBtn.onclick = () => {
            const slotName = input.value.trim();
            if (!slotName) {
                alert('Please enter a name');
                return;
            }
            this.onSlotSelected(slotName);
            dialogOverlay.remove();
            this.close();
        };
        btnContainer.appendChild(saveBtn);

        dialog.appendChild(btnContainer);
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);

        input.focus();
    }

    private showConfirmDialog(title: string, message: string, onConfirm: () => void) {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.style.position = 'fixed';
        dialogOverlay.style.top = '0';
        dialogOverlay.style.left = '0';
        dialogOverlay.style.width = '100%';
        dialogOverlay.style.height = '100%';
        dialogOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        dialogOverlay.style.display = 'flex';
        dialogOverlay.style.justifyContent = 'center';
        dialogOverlay.style.alignItems = 'center';
        dialogOverlay.style.zIndex = '3001';

        const dialog = document.createElement('div');
        dialog.style.backgroundColor = '#2a2a2a';
        dialog.style.border = '2px solid #ff4444';
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '25px';
        dialog.style.minWidth = '400px';

        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        titleEl.style.color = '#fff';
        titleEl.style.margin = '0 0 15px 0';
        dialog.appendChild(titleEl);

        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        messageEl.style.color = '#ccc';
        messageEl.style.margin = '0 0 20px 0';
        dialog.appendChild(messageEl);

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '10px';
        btnContainer.style.justifyContent = 'flex-end';

        const cancelBtn = this.createButton('Cancel', '#555');
        cancelBtn.onclick = () => dialogOverlay.remove();
        btnContainer.appendChild(cancelBtn);

        const confirmBtn = this.createButton('Confirm', '#ff4444');
        confirmBtn.onclick = () => {
            onConfirm();
            dialogOverlay.remove();
        };
        btnContainer.appendChild(confirmBtn);

        dialog.appendChild(btnContainer);
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
    }

    private formatMissionTime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours}h ${minutes}m ${secs}s`;
    }

    private createButton(text: string, color: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.padding = '10px 20px';
        btn.style.fontSize = '14px';
        btn.style.backgroundColor = 'transparent';
        btn.style.color = color;
        btn.style.border = `2px solid ${color}`;
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.3s ease';
        btn.style.fontWeight = 'bold';

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

    close() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
    }
}
