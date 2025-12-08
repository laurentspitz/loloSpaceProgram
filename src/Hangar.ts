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

        // Initialize Interaction
        this.dragDropManager = new DragDropManager(
            this.scene,
            this.assembly,
            () => this.ui.updateStats(), // Callback when part placed
            (x, y) => this.ui.isOverPalette(x, y) // Callback to check trash
        );

        // Initialize UI
        this.ui = new HangarUI(
            this.assembly,
            (partId) => this.dragDropManager.startDraggingNewPart(partId),
            () => {
                // Dispatch launch event with assembly data
                const config = this.assembly.getRocketConfig();
                // Attach name to config
                (config as any).name = this.assembly.name;

                const event = new CustomEvent('launch-game', {
                    detail: { assembly: config }
                });
                window.dispatchEvent(event);
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

                    await RocketSaveManager.save(this.assembly, name, user?.uid);

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
                this.scene.update();
                this.ui.updateStats();

                const { NotificationManager } = await import('./ui/NotificationManager');
                NotificationManager.show('Rocket loaded successfully!', 'success');
            },
            () => {
                // Back callback
                window.dispatchEvent(new CustomEvent('navigate-menu'));
            },
            () => {
                // New callback - clear the assembly
                this.assembly.parts = [];
                this.assembly.rootPartId = null;
                this.assembly.name = 'Untitled Rocket';
                this.assembly.id = undefined; // Clear the ID for new rocket
                this.ui.rocketNameInput.value = 'Untitled Rocket';
                this.scene.update();
                this.ui.updateStats();
            },
            (active) => {
                // Toggle Mirror
                this.dragDropManager.setMirrorMode(active);
            },
            (active) => {
                // Toggle CoG
                this.scene.showCoG = active;
            }
        );

        // Auto-load initialization is done via init()
    }

    /**
     * Initialize and auto-load the latest rocket if available
     */
    async init() {
        const latestRocket = await RocketSaveManager.getLatest();
        if (latestRocket) {
            this.assembly.parts = latestRocket.parts;
            this.assembly.rootPartId = latestRocket.rootPartId;
            this.assembly.name = latestRocket.name;
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
