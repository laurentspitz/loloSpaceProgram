import { HangarScene } from './hangar/HangarScene';
import { HangarUI } from './hangar/HangarUI';
import { RocketAssembly } from './hangar/RocketAssembly';
import { DragDropManager } from './hangar/DragDropManager';
import { RocketSaveManager } from './hangar/RocketSaveManager';

/**
 * Hangar - Main class for the rocket building scene
 */
export class Hangar {
    container: HTMLDivElement;
    scene: HangarScene;
    ui: HangarUI;
    assembly: RocketAssembly;
    dragDropManager: DragDropManager;

    private isDirty: boolean = false;

    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'hangar-container';
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        document.body.appendChild(this.container);

        // Initialize Assembly
        this.assembly = new RocketAssembly();

        // Initialize Scene
        this.scene = new HangarScene(this.container, this.assembly);

        // Initialize UI first to reference it in callbacks
        this.ui = new HangarUI(
            this.assembly,
            (partId) => this.dragDropManager.startDraggingNewPart(partId),
            async () => {
                // Launch Callback
                // Force Save before launching
                const { FirebaseService } = await import('./services/firebase');
                const { NotificationManager } = await import('./ui/NotificationManager');
                const { RocketSaveManager } = await import('./hangar/RocketSaveManager');

                const user = FirebaseService.auth.currentUser;
                const name = this.assembly.name;

                // Validate Name
                if (!name || name.trim() === 'Untitled Rocket' || name.trim() === '') {
                    NotificationManager.show('⚠️ Please name your rocket before launching!', 'warning');
                    if (this.ui.rocketNameInput) this.ui.rocketNameInput.focus();
                    return;
                }

                try {
                    // Force Save or Auto-Save logic
                    // If dirty or just generally, we want to ensure latest version is saved.
                    await RocketSaveManager.save(this.assembly, name, user?.uid);
                    this.isDirty = false; // Clear dirty flag on success

                    if (!user) {
                        NotificationManager.show(`💾 Rocket auto-saved locally`, 'info');
                    }

                    // Dispatch launch event with assembly data
                    const config = this.assembly.getRocketConfig();
                    (config as any).name = this.assembly.name;

                    const event = new CustomEvent('launch-game', {
                        detail: { assembly: config }
                    });
                    window.dispatchEvent(event);

                } catch (error) {
                    if (error instanceof Error) {
                        NotificationManager.show(`Launch aborted. Failed to save: ${error.message}`, 'error');
                    }
                }
            },
            async (name) => {
                // Save callback
                try {
                    const { FirebaseService } = await import('./services/firebase');
                    const { NotificationManager } = await import('./ui/NotificationManager');
                    const user = FirebaseService.auth.currentUser;

                    if (!user) {
                        NotificationManager.show('⚠️ Not logged in - saving to local storage only. Login to save to cloud!', 'warning');
                    }

                    const { RocketSaveManager } = await import('./hangar/RocketSaveManager');
                    await RocketSaveManager.save(this.assembly, name, user?.uid);
                    this.isDirty = false; // Cleared!

                    if (user) {
                        NotificationManager.show(`✅ Rocket "${name}" saved to cloud!`, 'success');
                    } else {
                        NotificationManager.show(`💾 Rocket "${name}" saved locally`, 'info');
                    }
                } catch (error) {
                    const { NotificationManager } = await import('./ui/NotificationManager');
                    if (error instanceof Error) {
                        NotificationManager.show(`Failed to save: ${error.message}`, 'error');
                    }
                }
            },
            async (loadedAssembly) => {
                // Load callback
                this.assembly.parts = loadedAssembly.parts;
                this.assembly.rootPartId = loadedAssembly.rootPartId;
                this.assembly.name = loadedAssembly.name;
                this.assembly.id = loadedAssembly.id;
                this.ui.setRocketName(loadedAssembly.name); // Sync UI Name
                this.isDirty = false; // Reset dirty on load

                this.scene.update();
                this.ui.updateStats();

                const { NotificationManager } = await import('./ui/NotificationManager');
                NotificationManager.show('Rocket loaded successfully!', 'success');
            },
            async () => {
                // Back callback
                if (this.isDirty) {
                    const { ConfirmDialog } = await import('./ui/ConfirmDialog');
                    const i18next = (await import('i18next')).default; // Lazy load i18n if needed or assume available globally 
                    // actually i18next is usually imported at top level in this project context

                    ConfirmDialog.show(
                        "Unsaved Changes", // i18next.t('ui.unsavedChanges')
                        "You have unsaved changes. Do you want to save before exiting?",
                        async () => {
                            // On Confirm (Yes, Save)
                            // Trigger save logic manually
                            const { FirebaseService } = await import('./services/firebase');
                            const user = FirebaseService.auth.currentUser;
                            const { RocketSaveManager } = await import('./hangar/RocketSaveManager');

                            try {
                                await RocketSaveManager.save(this.assembly, this.assembly.name, user?.uid);
                                this.isDirty = false;
                                window.dispatchEvent(new CustomEvent('navigate-menu'));
                            } catch (e) {
                                alert("Failed to save: " + e); // Fallback
                            }
                        },
                        () => {
                            // On Cancel (No, Don't Save ... or just Cancel?)
                            // ConfirmDialog has 2 options. 
                            // If user clicks "No", they likely want to exit without saving.
                            // OR they want to stay. 
                            // Let's use our nested pattern or just strictly "Exit without Save".

                            // If we want "Cancel" to mean "Stay", we need a 3rd option or assume Exit.
                            // Let's assume "Cancel" means "Stay" for safety?
                            // But usually "Do you want to save?" -> No -> Exit.

                            // Let's ask: "Exit without saving?"
                            ConfirmDialog.show(
                                "Exit without saving?",
                                "All unsaved changes will be lost.",
                                () => {
                                    window.dispatchEvent(new CustomEvent('navigate-menu'));
                                }
                            );
                        },
                        "Save & Exit",
                        "Don't Save"
                    );
                } else {
                    window.dispatchEvent(new CustomEvent('navigate-menu'));
                }
            },
            () => {
                // New callback
                this.assembly.parts = [];
                this.assembly.rootPartId = null;
                this.assembly.name = 'Untitled Rocket';
                this.assembly.id = undefined;
                this.ui.setRocketName('Untitled Rocket');
                this.isDirty = false; // Reset

                this.scene.update();
                this.ui.updateStats();
            },
            (active) => { this.dragDropManager.setMirrorMode(active); },
            (active) => { this.scene.showCoG = active; }
        );

        // Initialize Interaction
        this.dragDropManager = new DragDropManager(
            this.scene,
            this.assembly,
            () => {
                // Callback when part placed/removed/moved
                this.ui.updateStats();
                this.isDirty = true; // Mark dirty!
            },
            (x, y) => this.ui.isOverPalette(x, y)
        );

        // Auto-load initialization is done via init()
    }

    /**
     * Initialize and auto-load the latest rocket if available
     */
    async init() {
        // Fix: Import FirebaseService to get current user for Cloud Save loading
        const { FirebaseService } = await import('./services/firebase');
        const user = FirebaseService.auth.currentUser;
        const { RocketSaveManager } = await import('./hangar/RocketSaveManager');

        // Pass user.uid (undefined if guest) to support Cloud or Local auto-load
        const latestRocket = await RocketSaveManager.getLatest(user?.uid);

        if (latestRocket) {
            this.assembly.parts = latestRocket.parts;
            this.assembly.rootPartId = latestRocket.rootPartId;
            this.assembly.name = latestRocket.name;
            // Also update the ID so subsequent saves act as updates
            this.assembly.id = latestRocket.id;

            this.ui.setRocketName(latestRocket.name); // Updates the Input Field!
            this.isDirty = false; // Clean state after load

            this.scene.update();
            this.ui.updateStats();
        }
    }

    dispose() {
        this.scene.dispose();
        this.ui.dispose();
        this.dragDropManager.dispose();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

/**
 * Factory function to create and initialize Hangar
 */
export async function createHangar(): Promise<Hangar> {
    const hangar = new Hangar();
    await hangar.init();
    return hangar;
}
