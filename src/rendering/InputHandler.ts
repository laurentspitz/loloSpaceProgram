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
    private hasMoved: boolean = false;
    private lastX: number = 0;
    private lastY: number = 0;
    private startX: number = 0;
    private startY: number = 0;

    public enabled: boolean = true; // Can be disabled during maneuver node operations

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
        }, { passive: false });

        // Mouse Events
        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.enabled) return;
            this.handleStart(e.clientX, e.clientY);

            // Add window listeners for drag
            window.addEventListener('mousemove', this.handleMouseMove);
            window.addEventListener('mouseup', this.handleMouseUp);
        });

        // Touch Events
        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.enabled) return;
            if (e.touches.length === 1) {
                e.preventDefault(); // Prevent scrolling
                this.handleStart(e.touches[0].clientX, e.touches[0].clientY);

                // Add window listeners for drag
                window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
                window.addEventListener('touchend', this.handleTouchEnd);
            }
        }, { passive: false });
    }

    private handleStart(clientX: number, clientY: number) {
        this.isDragging = true;
        this.hasMoved = false;
        this.lastX = clientX;
        this.lastY = clientY;
        this.startX = clientX;
        this.startY = clientY;
    }

    private handleMouseMove = (e: MouseEvent) => {
        if (!this.enabled || !this.isDragging) return;
        this.handleMove(e.clientX, e.clientY);
    }

    private handleTouchMove = (e: TouchEvent) => {
        if (!this.enabled || !this.isDragging) return;
        if (e.touches.length === 1) {
            e.preventDefault();
            this.handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }

    private handleMove(clientX: number, clientY: number) {
        const dx = clientX - this.lastX;
        const dy = clientY - this.lastY;
        this.lastX = clientX;
        this.lastY = clientY;

        // Threshold to detect drag vs click
        // Accumulate movement to determine if it's a drag
        if (Math.abs(clientX - this.startX) > 5 || Math.abs(clientY - this.startY) > 5) {
            this.hasMoved = true;
        }

        if (this.hasMoved) {
            // If following a body, DO NOT PAN (to avoid losing focus)
            if (this.renderer.followedBody) {
                return;
            }

            // Update offset directly
            // Use a safety clamp to prevent massive jumps if scale is tiny (though scale should be handled by zoom)
            this.renderer.offset = this.renderer.offset.sub(new Vector2(dx / this.renderer.scale, dy / this.renderer.scale));
        }
    }

    private handleMouseUp = (e: MouseEvent) => {
        this.handleEnd(e.clientX, e.clientY);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);
    }

    private handleTouchEnd = (e: TouchEvent) => {
        // For touch end, we might not have clientX/Y of the lifted finger
        // But we don't need it for click detection if we track hasMoved
        this.handleEnd(this.lastX, this.lastY);
        window.removeEventListener('touchmove', this.handleTouchMove);
        window.removeEventListener('touchend', this.handleTouchEnd);
    }

    private handleEnd(clientX: number, clientY: number) {
        this.isDragging = false;

        // If we haven't moved significantly, treat it as a click
        if (!this.hasMoved) {
            this.handleClick(clientX, clientY);
        }
    }

    private handleClick(clientX: number, clientY: number) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const clickedBody = this.renderer.selectBodyAt(new Vector2(x, y));
        if (clickedBody) {
            // Only switch if we are not already following this body
            if (this.renderer.followedBody !== clickedBody) {
                this.renderer.followedBody = clickedBody;
                this.renderer.autoZoomToBody(clickedBody); // Optional: auto zoom when selecting
            }
        }
    }
}
