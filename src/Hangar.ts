import { HangarScene } from './hangar/HangarScene';
import { HangarUI } from './hangar/HangarUI';
import { RocketAssembly } from './hangar/RocketAssembly';
import { DragDropManager } from './hangar/DragDropManager';

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
            }
        );

        // Back Button (Temporary, should be in UI)
        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Menu';
        backButton.style.position = 'absolute';
        backButton.style.top = '20px';
        backButton.style.right = '20px';
        backButton.style.padding = '10px 20px';
        backButton.style.zIndex = '1000';
        backButton.onclick = () => {
            window.dispatchEvent(new CustomEvent('navigate-menu'));
        };
        this.container.appendChild(backButton);
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
