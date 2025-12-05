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
                const event = new CustomEvent('launch-game', {
                    detail: { assembly: this.assembly }
                });
                window.dispatchEvent(event);
            },
            (name) => {
                // Save callback
                try {
                    RocketSaveManager.save(this.assembly, name);
                    alert(`Rocket "${name}" saved successfully!`);
                } catch (error) {
                    if (error instanceof Error) {
                        alert(`Failed to save rocket: ${error.message}`);
                    }
                }
            },
            (loadedAssembly) => {
                // Load callback
                this.assembly.parts = loadedAssembly.parts;
                this.assembly.rootPartId = loadedAssembly.rootPartId;
                this.scene.update();
                this.ui.updateStats();
                alert('Rocket loaded successfully!');
            },
            () => {
                // Back callback
                window.dispatchEvent(new CustomEvent('navigate-menu'));
            }
        );

        // Auto-load the most recent rocket if one exists
        const latestRocket = RocketSaveManager.getLatest();
        if (latestRocket) {
            this.assembly.parts = latestRocket.parts;
            this.assembly.rootPartId = latestRocket.rootPartId;
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
