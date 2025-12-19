import { ThreeRenderer } from '../../rendering/ThreeRenderer';
import { Renderer } from '../../Renderer';
import { GameTimeManager } from '../../managers/GameTimeManager';
import { createSlidingPanel } from '../components/SlidingPanel';
import { TextureGenerator } from '../../rendering/TextureGenerator';

export interface DebugPanelOptions {
    renderer: Renderer | ThreeRenderer;
    onYearChange?: (seconds: number) => void;
    /** If true, panel is embedded in a tabbed container */
    embedded?: boolean;
}

/**
 * Debug Panel - debug tools and toggles
 */
export class DebugPanel {
    private container: HTMLDivElement | null = null;
    private content: HTMLDivElement | null = null;
    private renderer: Renderer | ThreeRenderer;
    private onYearChange?: (seconds: number) => void;
    private embedded: boolean = false;

    constructor(options: DebugPanelOptions) {
        this.renderer = options.renderer;
        this.onYearChange = options.onYearChange;
        this.embedded = options.embedded || false;
        this.create();
    }

    private create(): void {
        const debugContent = document.createElement('div');
        debugContent.style.display = 'flex';
        debugContent.style.flexDirection = 'column';
        debugContent.style.gap = '5px';

        // Infinite Fuel Checkbox
        const fuelContainer = document.createElement('div');
        fuelContainer.style.display = 'flex';
        fuelContainer.style.alignItems = 'center';
        fuelContainer.style.gap = '5px';

        const fuelCheck = document.createElement('input');
        fuelCheck.type = 'checkbox';
        fuelCheck.id = 'debug-infinite-fuel';
        fuelCheck.onchange = (e) => {
            if (this.renderer instanceof ThreeRenderer && this.renderer.currentRocket) {
                this.renderer.currentRocket.engine.infiniteFuel = (e.target as HTMLInputElement).checked;
            }
        };

        const fuelLabel = document.createElement('label');
        fuelLabel.htmlFor = 'debug-infinite-fuel';
        fuelLabel.innerText = 'Infinite Fuel';
        fuelLabel.style.cursor = 'pointer';
        fuelLabel.style.fontSize = '12px';
        fuelLabel.style.color = 'white';
        fuelLabel.style.fontFamily = 'monospace';

        fuelContainer.appendChild(fuelCheck);
        fuelContainer.appendChild(fuelLabel);
        debugContent.appendChild(fuelContainer);

        // Show Colliders Toggle
        const colliderContainer = document.createElement('div');
        colliderContainer.style.display = 'flex';
        colliderContainer.style.alignItems = 'center';
        colliderContainer.style.gap = '5px';

        const colliderCheck = document.createElement('input');
        colliderCheck.type = 'checkbox';
        colliderCheck.id = 'debug-colliders';
        colliderCheck.checked = false;
        colliderCheck.onchange = (e) => {
            if (this.renderer instanceof ThreeRenderer) {
                this.renderer.showColliders = (e.target as HTMLInputElement).checked;
            }
        };

        const colliderLabel = document.createElement('label');
        colliderLabel.htmlFor = 'debug-colliders';
        colliderLabel.innerText = 'Show Colliders';
        colliderLabel.style.cursor = 'pointer';
        colliderLabel.style.fontSize = '12px';
        colliderLabel.style.color = 'white';
        colliderLabel.style.fontFamily = 'monospace';

        colliderContainer.appendChild(colliderCheck);
        colliderContainer.appendChild(colliderLabel);
        debugContent.appendChild(colliderContainer);

        // Show CoG Toggle
        const cogContainer = document.createElement('div');
        cogContainer.style.display = 'flex';
        cogContainer.style.alignItems = 'center';
        cogContainer.style.gap = '5px';

        const cogCheck = document.createElement('input');
        cogCheck.type = 'checkbox';
        cogCheck.id = 'debug-cog';
        cogCheck.checked = false;
        cogCheck.onchange = (e) => {
            if (this.renderer instanceof ThreeRenderer) {
                this.renderer.showCoG = (e.target as HTMLInputElement).checked;
            }
        };

        const cogLabel = document.createElement('label');
        cogLabel.htmlFor = 'debug-cog';
        cogLabel.innerText = 'Show CoG';
        cogLabel.style.cursor = 'pointer';
        cogLabel.style.fontSize = '12px';
        cogLabel.style.color = 'white';
        cogLabel.style.fontFamily = 'monospace';

        cogContainer.appendChild(cogCheck);
        cogContainer.appendChild(cogLabel);
        debugContent.appendChild(cogContainer);

        // Time Control
        const timeContainer = document.createElement('div');
        timeContainer.style.marginTop = '10px';
        timeContainer.style.borderTop = '1px solid #444';
        timeContainer.style.paddingTop = '10px';

        const yearLabel = document.createElement('div');
        yearLabel.id = 'debug-year-label';
        yearLabel.textContent = 'Game Year: 1957';
        yearLabel.style.color = '#ccc';
        yearLabel.style.fontSize = '12px';
        yearLabel.style.marginBottom = '5px';

        const yearSlider = document.createElement('input');
        yearSlider.type = 'range';
        yearSlider.min = '1957';
        yearSlider.max = '2050';
        yearSlider.value = '1957';
        yearSlider.style.width = '100%';
        yearSlider.oninput = (e) => {
            const year = parseInt((e.target as HTMLInputElement).value);
            yearLabel.textContent = `Game Year: ${year}`;

            const seconds = GameTimeManager.getSecondsFromYear(year);
            if (this.onYearChange) {
                this.onYearChange(seconds);
            }
        };

        timeContainer.appendChild(yearLabel);
        timeContainer.appendChild(yearSlider);
        debugContent.appendChild(timeContainer);

        // Earth Longitude Control
        const longitudeContainer = document.createElement('div');
        longitudeContainer.style.marginTop = '10px';
        longitudeContainer.style.borderTop = '1px solid #444';
        longitudeContainer.style.paddingTop = '10px';

        const longitudeLabel = document.createElement('div');
        longitudeLabel.id = 'debug-longitude-label';
        longitudeLabel.textContent = 'Earth Longitude: 0°';
        longitudeLabel.style.color = '#ccc';
        longitudeLabel.style.fontSize = '12px';
        longitudeLabel.style.marginBottom = '5px';

        const longitudeSlider = document.createElement('input');
        longitudeSlider.type = 'range';
        longitudeSlider.min = '0';
        longitudeSlider.max = '360';
        longitudeSlider.value = '0';
        longitudeSlider.style.width = '100%';
        longitudeSlider.oninput = (e) => {
            const longitude = parseInt((e.target as HTMLInputElement).value);
            longitudeLabel.textContent = `Earth Longitude: ${longitude}°`;

            // Update the debug longitude offset
            TextureGenerator.debugLongitudeOffset = longitude;

            // Force texture regeneration by invalidating the cache on Earth
            if (this.renderer instanceof ThreeRenderer) {
                this.renderer.invalidateEarthTexture();
            }
        };

        longitudeContainer.appendChild(longitudeLabel);
        longitudeContainer.appendChild(longitudeSlider);
        debugContent.appendChild(longitudeContainer);

        // FPS Counter
        const fpsContainer = document.createElement('div');
        fpsContainer.style.display = 'flex';
        fpsContainer.style.alignItems = 'center';
        fpsContainer.style.gap = '5px';
        fpsContainer.style.borderTop = '1px solid #555';
        fpsContainer.style.paddingTop = '5px';
        fpsContainer.style.marginTop = '5px';

        const fpsLabel = document.createElement('span');
        fpsLabel.innerText = 'FPS: --';
        fpsLabel.style.color = '#00C851';
        fpsLabel.style.fontSize = '12px';
        fpsLabel.style.fontFamily = 'monospace';
        fpsContainer.appendChild(fpsLabel);
        debugContent.appendChild(fpsContainer);

        // FPS Calculation Loop
        let lastTime = performance.now();
        let frames = 0;
        const updateFPS = () => {
            const now = performance.now();
            frames++;
            if (now >= lastTime + 1000) {
                const fps = frames;
                fpsLabel.innerText = `FPS: ${fps}`;

                if (fps < 30) fpsLabel.style.color = '#ff4444';
                else if (fps < 50) fpsLabel.style.color = '#ffbb33';
                else fpsLabel.style.color = '#00C851';

                frames = 0;
                lastTime = now;
            }
            requestAnimationFrame(updateFPS);
        };
        requestAnimationFrame(updateFPS);

        // Store content for embedded mode
        this.content = debugContent;

        // In embedded mode, don't create sliding wrapper
        if (this.embedded) {
            return;
        }

        // Create Sliding Panel (slides left, bottom position)
        const { container } = createSlidingPanel({
            title: 'DEBUG TOOLS',
            content: debugContent,
            direction: 'left',
            width: '200px',
            startOpen: false
        });
        container.style.bottom = '10px';
        container.style.left = '10px';

        document.body.appendChild(container);
        this.container = container;
    }

    /** Get the content element (for embedded mode) */
    getContent(): HTMLDivElement | null {
        return this.content;
    }

    dispose(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
