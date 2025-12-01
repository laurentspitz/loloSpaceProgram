import { Vector2 } from '../core/Vector2';
import { ThreeRenderer } from './ThreeRenderer';

/**
 * InputHandler - Manages user input for the renderer
 * Handles zooming, panning, and selecting bodies
 */
export class InputHandler {
    private renderer: ThreeRenderer;
    private canvas: HTMLCanvasElement;

    private isDragging: boolean = false;
    private lastX: number = 0;
    private lastY: number = 0;

    constructor(renderer: ThreeRenderer, canvas: HTMLCanvasElement) {
        this.renderer = renderer;
        this.canvas = canvas;
        this.setupEventListeners();
    }

    private setupEventListeners() {
        // Zoom with mouse wheel
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSpeed = 0.1;
            if (e.deltaY < 0) {
                this.renderer.scale *= (1 + zoomSpeed);
            } else {
                this.renderer.scale /= (1 + zoomSpeed);
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;

            // Check for click on body
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // We need to access currentBodies from renderer
            // This suggests we might need a better way to access scene state
            const clickedBody = this.renderer.selectBodyAt(new Vector2(x, y));
            if (clickedBody) {
                this.renderer.followedBody = clickedBody;
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.clientX - this.lastX;
                const dy = e.clientY - this.lastY;
                this.lastX = e.clientX;
                this.lastY = e.clientY;

                if (this.renderer.followedBody) {
                    this.renderer.followedBody = null; // Stop following if panning
                }

                // Update offset directly
                this.renderer.offset = this.renderer.offset.sub(new Vector2(dx / this.renderer.scale, dy / this.renderer.scale));
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
    }
}
