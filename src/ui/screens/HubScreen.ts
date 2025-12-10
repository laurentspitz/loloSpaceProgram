import i18next from '../../services/i18n';

export class HubScreen {
    container: HTMLDivElement;
    onPlay: (state: any) => void;
    onOpenHangar: () => void;
    onOpenChronology: () => void;
    onBack: () => void;
    private languageChangeListener: (() => void) | null = null;
    private pendingState: any = null;

    constructor(
        onPlay: (state: any) => void,
        onOpenHangar: () => void,
        onOpenChronology: () => void,
        onBack: () => void
    ) {
        this.onPlay = onPlay;
        this.onOpenHangar = onOpenHangar;
        this.onOpenChronology = onOpenChronology;
        this.onBack = onBack;

        this.container = document.createElement('div');
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '20px';
        this.container.style.zIndex = '1';
    }

    setPendingState(state: any) {
        this.pendingState = state;
    }

    mount(parent: HTMLElement) {
        this.cleanup();
        this.render();
        parent.appendChild(this.container);

        // Listen for language changes
        this.languageChangeListener = () => {
            this.render();
        };
        i18next.on('languageChanged', this.languageChangeListener);
    }

    unmount() {
        if (this.languageChangeListener) {
            i18next.off('languageChanged', this.languageChangeListener);
            this.languageChangeListener = null;
        }
        if (this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
    }

    private render() {
        this.container.innerHTML = '';

        // Continue / Play Button
        const solarSystemBtn = this.createButton(i18next.t('menu.continue'), '#00aaff');
        solarSystemBtn.onclick = () => {
            this.onPlay(this.pendingState);
        };
        this.container.appendChild(solarSystemBtn);

        // Build Rocket Button
        const hangarBtn = this.createButton(i18next.t('menu.buildRocket'), '#ffaa00');
        hangarBtn.onclick = () => this.onOpenHangar();
        this.container.appendChild(hangarBtn);

        // Chronology Button
        const chronologyBtn = this.createButton(i18next.t('menu.chronology'), '#aa00ff');
        chronologyBtn.onclick = async () => {
            // Lazy load ChronologyMenu and MissionManager
            const { ChronologyMenu } = await import('../ChronologyMenu');
            const { MissionManager } = await import('../../systems/MissionSystem');

            // Prepare Mission Manager with current state
            const missionManager = new MissionManager();
            if (this.pendingState && this.pendingState.missions) {
                missionManager.deserialize(this.pendingState.missions);
            } else if (this.pendingState && this.pendingState.completedMissionIds) {
                // Handle flat format if exists, or nested
                missionManager.deserialize({ completedIds: this.pendingState.completedMissionIds });
            }

            // Determine current year (aim for 1957 start + mission time)
            const startYear = 1957;
            const yearsElapsed = Math.floor((this.pendingState?.missionTime || 0) / (365 * 24 * 3600 * 1000));
            const currentYear = startYear + yearsElapsed;

            new ChronologyMenu(currentYear, missionManager, () => {
                // On close, do nothing (stay in hub)
            });
        };
        this.container.appendChild(chronologyBtn);

        // Back Button with Save Prompt
        const backBtn = this.createButton(i18next.t('menu.back'), '#ffffff');
        backBtn.style.padding = '10px 20px'; // Smaller override
        backBtn.style.fontSize = '18px';
        backBtn.style.marginTop = '20px';
        backBtn.onclick = async () => {
            const { FirebaseService } = await import('../../services/firebase');
            const user = FirebaseService.auth.currentUser;

            if (user) {
                // Show Prompt using Unified ConfirmDialog
                const { ConfirmDialog } = await import('../ConfirmDialog');

                ConfirmDialog.show(
                    i18next.t('ui.saveProgress'),
                    i18next.t('ui.saveProgressPrompt'),
                    async () => {
                        // On Confirm: Open Save Selector
                        const { SaveSlotSelector } = await import('../SaveSlotSelector');
                        const { SaveSlotManager } = await import('../../services/SaveSlotManager');

                        const selector = new SaveSlotSelector('save', async (slotId) => {
                            try {
                                // We need the state to save. 
                                if (this.pendingState) {
                                    await SaveSlotManager.saveToSlot(slotId, this.pendingState, user.uid);
                                    // Success feedback could also be a nice toast/notification instead of alert.
                                    // But keeping it minimal as requested.
                                    // Let's use a non-blocking notification if possible or just proceed?
                                    // For now, let's just proceed to back logic.
                                    // Or maybe show a quick "Saved!" overlay? 
                                    // UI.ts uses NotificationManager.
                                    const { NotificationManager } = await import('../NotificationManager');
                                    NotificationManager.show(i18next.t('ui.saved'), 'success');

                                    this.onBack();
                                } else {
                                    const { NotificationManager } = await import('../NotificationManager');
                                    NotificationManager.show("No state to save!", 'error');
                                    this.onBack();
                                }
                            } catch (e) {
                                console.error(e);
                                const { NotificationManager } = await import('../NotificationManager');
                                NotificationManager.show(i18next.t('ui.saveFailed', { message: 'Error' }), 'error');
                            }
                        });
                        await selector.show();
                    },
                    () => {
                        // On Cancel (Initial Prompt): Ask if they want to exit without saving?
                        // Or just cancel the whole action?
                        // User expects: "Save?" -> No -> Exit without saving
                        //               "Save?" -> Cancel -> Stay
                        // Our ConfirmDialog has 2 buttons.

                        // Let's do a nested check for safety if "No" is clicked.
                        ConfirmDialog.show(
                            i18next.t('ui.exitNoSave'),
                            i18next.t('ui.exitNoSavePrompt'),
                            () => {
                                // Exit without saving
                                this.onBack();
                            },
                            () => {
                                // Stay in Hub
                            },
                            i18next.t('ui.confirm'), // "Yes, Exit"
                            i18next.t('settings.cancel') // "Cancel, Stay"
                        );
                    },
                    i18next.t('settings.save'), // Confirm Text
                    i18next.t('ui.exitNoSave') // Cancel Text (Abused as "Don't Save"?) 
                    // Actually, let's stick to standard Yes/No for "Do you want to save?"
                );

            } else {
                // Formatting for Guest Mode
                const { ConfirmDialog } = await import('../ConfirmDialog');
                ConfirmDialog.show(
                    i18next.t('ui.exitToMenu'),
                    i18next.t('ui.exitToMenuPrompt'),
                    () => this.onBack(),
                    () => { }, // Stay
                    i18next.t('ui.confirm'),
                    i18next.t('settings.cancel')
                );
            }
        };
        this.container.appendChild(backBtn);
    }

    private cleanup() {
        this.container.innerHTML = '';
    }

    private createButton(text: string, color: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.innerHTML = text;
        btn.style.padding = '15px 30px';
        btn.style.fontSize = '24px';
        btn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        btn.style.color = color;
        btn.style.border = `2px solid ${color}`;
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.3s ease';
        btn.style.minWidth = '300px';
        btn.style.backdropFilter = 'blur(5px)';

        btn.onmouseover = () => {
            btn.style.backgroundColor = color;
            btn.style.color = '#000';
            btn.style.boxShadow = `0 0 15px ${color}`;
        };

        btn.onmouseout = () => {
            btn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            btn.style.color = color;
            btn.style.boxShadow = 'none';
        };

        return btn;
    }
}
