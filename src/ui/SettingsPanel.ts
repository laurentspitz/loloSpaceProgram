import { controls, type ControlConfig } from '../config/Controls';
import i18next from 'i18next';

/**
 * SettingsPanel - UI for configuring keyboard controls
 */
export class SettingsPanel {
    container: HTMLDivElement;
    onClose: () => void;
    private nicknameInput: HTMLInputElement | null = null;
    private activeBinding: { action: keyof ControlConfig; element: HTMLSpanElement } | null = null;
    settings: any = {};
    private languageChangeListener: (() => void) | null = null;

    constructor(onClose: () => void) {
        this.onClose = onClose;
        this.loadSettings(); // Load settings immediately

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

        document.body.appendChild(this.container);

        // Listen for keypresses globally
        this.handleKeyPress = this.handleKeyPress.bind(this);
        document.addEventListener('keydown', this.handleKeyPress);

        // Initial Render
        this.render();

        // Listen for language changes
        this.languageChangeListener = () => {
            // Preserve ongoing nickname input
            if (this.nicknameInput) {
                this.settings.nickname = this.nicknameInput.value;
            }
            this.render();
        };
        i18next.on('languageChanged', this.languageChangeListener);
    }

    private render() {
        this.container.innerHTML = '';

        // Create panel
        const panel = document.createElement('div');
        panel.className = 'game-modal-content';
        panel.style.maxWidth = '600px';
        panel.style.width = '90%';
        panel.style.maxHeight = '85vh';
        panel.style.overflowY = 'auto';
        this.container.appendChild(panel);

        // Title
        const title = document.createElement('h2');
        title.textContent = i18next.t('settings.title');
        title.style.color = '#00aaff';
        title.style.margin = '0 0 25px 0';
        title.style.fontSize = '28px';
        title.style.textAlign = 'center';
        title.style.textShadow = '0 0 10px #00aaff';
        panel.appendChild(title);

        // --- Nickname Section ---
        const nicknameSection = document.createElement('fieldset');
        nicknameSection.style.border = '1px solid #444';
        nicknameSection.style.borderRadius = '8px';
        nicknameSection.style.padding = '15px';
        nicknameSection.style.marginBottom = '20px';
        nicknameSection.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';

        const nicknameLegend = document.createElement('legend');
        nicknameLegend.textContent = i18next.t('settings.astronautProfile');
        nicknameLegend.style.color = '#00aaff';
        nicknameLegend.style.padding = '0 10px';
        nicknameLegend.style.fontWeight = 'bold';
        nicknameSection.appendChild(nicknameLegend);

        const nicknameRow = document.createElement('div');
        nicknameRow.style.display = 'flex';
        nicknameRow.style.justifyContent = 'space-between';
        nicknameRow.style.alignItems = 'center';

        const label = document.createElement('label');
        label.textContent = i18next.t('settings.callsign');
        label.style.color = '#ccc';
        nicknameRow.appendChild(label);

        this.nicknameInput = document.createElement('input');
        this.nicknameInput.type = 'text';
        this.nicknameInput.placeholder = i18next.t('settings.callsignPlaceholder');
        this.nicknameInput.value = this.settings.nickname || '';
        this.nicknameInput.style.backgroundColor = '#333';
        this.nicknameInput.style.border = '1px solid #555';
        this.nicknameInput.style.color = '#fff';
        this.nicknameInput.style.padding = '8px';
        this.nicknameInput.style.borderRadius = '4px';
        this.nicknameInput.style.fontSize = '16px';
        this.nicknameInput.style.width = '200px';
        nicknameRow.appendChild(this.nicknameInput);

        nicknameSection.appendChild(nicknameRow);
        panel.appendChild(nicknameSection);
        // ------------------------

        // Controls sections
        this.addControlSection(panel, i18next.t('settings.rocketControls'), [
            ['thrust', i18next.t('settings.controls.thrust')],
            ['cutEngines', i18next.t('settings.controls.cutEngines')],
            ['rotateLeft', i18next.t('settings.controls.rotateLeft')],
            ['rotateRight', i18next.t('settings.controls.rotateRight')],
            ['increaseThrottle', i18next.t('settings.controls.increaseThrottle')],
            ['decreaseThrottle', i18next.t('settings.controls.decreaseThrottle')],
        ]);

        this.addControlSection(panel, i18next.t('settings.timeWarp'), [
            ['timeWarpIncrease', i18next.t('settings.controls.timeWarpIncrease')],
            ['timeWarpDecrease', i18next.t('settings.controls.timeWarpDecrease')],
            ['timeWarpReset', i18next.t('settings.controls.timeWarpReset')],
        ]);

        this.addControlSection(panel, i18next.t('settings.maneuverNodes'), [
            ['createManeuverNode', i18next.t('settings.controls.createManeuverNode')],
            ['deleteManeuverNode', i18next.t('settings.controls.deleteManeuverNode')],
        ]);

        this.addControlSection(panel, i18next.t('settings.viewControls'), [
            ['toggleTrajectory', i18next.t('settings.controls.toggleTrajectory')],
            ['zoomIn', i18next.t('settings.controls.zoomIn')],
            ['zoomOut', i18next.t('settings.controls.zoomOut')],
        ]);

        this.addControlSection(panel, i18next.t('settings.autopilot'), [
            ['togglePrograde', i18next.t('settings.controls.togglePrograde')],
            ['toggleRetrograde', i18next.t('settings.controls.toggleRetrograde')],
            ['toggleTarget', i18next.t('settings.controls.toggleTarget')],
            ['toggleAntiTarget', i18next.t('settings.controls.toggleAntiTarget')],
            ['toggleManeuver', i18next.t('settings.controls.toggleManeuver')],
        ]);

        // Buttons container
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '15px';
        btnContainer.style.marginTop = '30px';
        btnContainer.style.justifyContent = 'center';
        panel.appendChild(btnContainer);

        // Save button
        const saveBtn = this.createButton(i18next.t('settings.saveSettings'), '#4CAF50');
        saveBtn.onclick = () => this.saveSettings();
        btnContainer.appendChild(saveBtn);

        // Reset button
        const resetBtn = this.createButton(i18next.t('settings.resetDefaults'), '#ff8800');
        resetBtn.onclick = () => this.resetControls();
        btnContainer.appendChild(resetBtn);

        // Close button
        const closeBtn = this.createButton(i18next.t('settings.close'), '#00aaff');
        closeBtn.onclick = () => this.close();
        btnContainer.appendChild(closeBtn);
    }

    private addControlSection(parent: HTMLElement, title: string, controlsList: [keyof ControlConfig, string][]) {
        // Use fieldset for nice grouping
        const fieldset = document.createElement('fieldset');
        fieldset.style.border = '1px solid #444';
        fieldset.style.borderRadius = '8px';
        fieldset.style.padding = '15px';
        fieldset.style.marginBottom = '20px';
        fieldset.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';

        // Legend Title
        const legend = document.createElement('legend');
        legend.textContent = title;
        legend.style.color = '#aaaaaa';
        legend.style.padding = '0 10px';
        legend.style.fontWeight = 'bold';
        fieldset.appendChild(legend);

        // Control rows
        controlsList.forEach(([action, label]) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '6px 0'; // Slightly tighter vertical padding
            row.style.borderBottom = '1px solid #333';
            if (controlsList.indexOf([action, label]) === controlsList.length - 1) {
                row.style.borderBottom = 'none'; // Remove last border
            }

            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            labelSpan.style.color = '#cccccc';
            labelSpan.style.fontSize = '15px';
            row.appendChild(labelSpan);

            const keySpan = document.createElement('span');
            keySpan.textContent = this.formatKey(controls.getControl(action));
            keySpan.style.color = '#00aaff';
            keySpan.style.fontSize = '14px';
            keySpan.style.padding = '4px 10px';
            keySpan.style.backgroundColor = '#2a2a2a';
            keySpan.style.borderRadius = '4px';
            keySpan.style.cursor = 'pointer';
            keySpan.style.minWidth = '80px';
            keySpan.style.textAlign = 'center';
            keySpan.style.transition = 'all 0.2s ease';
            keySpan.style.border = '1px solid #00aaff33'; // Subtle border

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
            fieldset.appendChild(row);
        });

        parent.appendChild(fieldset);
    }

    // Load settings from storage
    private async loadSettings() {
        try {
            // First check local storage for immediate load
            const localData = localStorage.getItem('user_settings');
            if (localData) {
                this.settings = JSON.parse(localData);
            }

            // Then try to fetch from Firebase if logged in (async update)
            const { FirebaseService } = await import('../services/firebase');
            if (FirebaseService.auth.currentUser) {
                const cloudSettings = await FirebaseService.loadUserSettings(FirebaseService.auth.currentUser.uid);
                if (cloudSettings) {
                    this.settings = { ...this.settings, ...cloudSettings };
                    if (this.nicknameInput) {
                        this.nicknameInput.value = this.settings.nickname || '';
                    }
                }
            }
        } catch (e) {
            console.error("Failed to load settings", e);
        }
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

    private async saveSettings() {
        // Show styled confirmation dialog
        this.showConfirmDialog(
            i18next.t('settings.saveConfirmTitle'),
            i18next.t('settings.saveConfirmMsg'),
            async () => {
                try {
                    // Import Firebase and NotificationManager
                    const { FirebaseService } = await import('../services/firebase');
                    const { NotificationManager } = await import('./NotificationManager');
                    const user = FirebaseService.auth.currentUser;

                    // Update settings object
                    this.settings = {
                        ...this.settings,
                        nickname: this.nicknameInput?.value || '',
                        controls: controls.getAllControls(),
                        savedAt: Date.now()
                    };

                    // Save to localStorage always
                    localStorage.setItem('user_settings', JSON.stringify(this.settings));

                    // Dispatch event for instant UI update
                    window.dispatchEvent(new CustomEvent('settings-changed', { detail: this.settings }));

                    if (user) {
                        // Save to Firebase
                        await FirebaseService.saveUserSettings(user.uid, this.settings);
                        NotificationManager.show(i18next.t('settings.savedCloud'), 'success');
                    } else {
                        NotificationManager.show(i18next.t('settings.savedLocal'), 'success');
                    }
                } catch (error) {
                    const { NotificationManager } = await import('./NotificationManager');
                    if (error instanceof Error) {
                        NotificationManager.show(`Failed to save: ${error.message}`, 'error');
                    }
                }
            }
        );
    }

    private showConfirmDialog(title: string, message: string, onConfirm: () => void) {
        // Create overlay
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

        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'game-modal-content';
        dialog.style.minWidth = '400px';
        dialog.style.maxWidth = '500px';

        // Title
        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        titleEl.style.color = '#fff';
        titleEl.style.margin = '0 0 15px 0';
        titleEl.style.fontSize = '18px';
        dialog.appendChild(titleEl);

        // Message
        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        messageEl.style.color = '#ccc';
        messageEl.style.margin = '0 0 20px 0';
        messageEl.style.lineHeight = '1.5';
        dialog.appendChild(messageEl);

        // Buttons container
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '10px';
        btnContainer.style.justifyContent = 'flex-end';

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = i18next.t('settings.cancel');
        cancelBtn.style.padding = '8px 20px';
        cancelBtn.style.backgroundColor = '#555';
        cancelBtn.style.color = '#fff';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '4px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.style.fontSize = '14px';
        cancelBtn.onclick = () => overlay.remove();
        btnContainer.appendChild(cancelBtn);

        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = i18next.t('settings.save');
        confirmBtn.style.padding = '8px 20px';
        confirmBtn.style.backgroundColor = '#4CAF50';
        confirmBtn.style.color = '#fff';
        confirmBtn.style.border = 'none';
        confirmBtn.style.borderRadius = '4px';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.style.fontSize = '14px';
        confirmBtn.style.fontWeight = 'bold';
        confirmBtn.onclick = () => {
            onConfirm();
            overlay.remove();
        };
        btnContainer.appendChild(confirmBtn);

        dialog.appendChild(btnContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Click outside to close
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        };
    }

    private createButton(text: string, color: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = 'game-btn'; // Use global class
        // btn.style.padding = '10px 20px'; // Override if needed
        btn.style.fontSize = '16px';
        btn.style.color = color;
        btn.style.borderColor = color;

        // No manual hover overrides needed as game-btn handles it generally, 
        // but preserving specific color border logic if desired.
        // Let's strip manual hover to rely on class + color.
        // Wait, game-btn hover changes bgcolor to rgba(80,80,80).
        // The specific color logic here was specialized.
        // Let's keep it simple: Use game-btn, set color/border.

        return btn;
    }

    private close() {
        document.removeEventListener('keydown', this.handleKeyPress);
        this.onClose();
    }

    dispose() {
        document.removeEventListener('keydown', this.handleKeyPress);
        if (this.languageChangeListener) {
            i18next.off('languageChanged', this.languageChangeListener);
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
