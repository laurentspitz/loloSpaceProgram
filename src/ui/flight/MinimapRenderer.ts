import { Body } from '../../core/Body';
import { Vector2 } from '../../core/Vector2';
import { createSlidingPanel } from '../components/SlidingPanel';

export interface MinimapRendererOptions {
    /** If true, panel is embedded in a tabbed container */
    embedded?: boolean;
}

/**
 * Minimap Renderer - Renders a 2D minimap of the solar system
 */
export class MinimapRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private container: HTMLDivElement | null = null;
    private content: HTMLDivElement | null = null;
    private scale: number = 1.0;
    private renderer: any;
    private embedded: boolean = false;

    constructor(renderer: any, options: MinimapRendererOptions = {}) {
        this.renderer = renderer;
        this.embedded = options.embedded || false;
        this.canvas = document.createElement('canvas');
        this.canvas.width = 200;
        this.canvas.height = 200;
        this.ctx = this.canvas.getContext('2d')!;
        this.create();
    }

    private create(): void {
        const mapContent = document.createElement('div');
        mapContent.style.position = 'relative';
        mapContent.style.width = '200px';
        mapContent.style.height = '200px';

        this.canvas.style.backgroundColor = 'black';
        this.canvas.style.borderRadius = '3px';
        mapContent.appendChild(this.canvas);

        // Controls
        const controls = document.createElement('div');
        controls.style.position = 'absolute';
        controls.style.top = '5px';
        controls.style.right = '5px';
        controls.style.display = 'flex';
        controls.style.gap = '2px';

        const plusBtn = document.createElement('button');
        plusBtn.innerText = '+';
        plusBtn.className = 'game-btn game-btn-icon';
        plusBtn.style.width = '20px';
        plusBtn.style.height = '20px';
        plusBtn.style.lineHeight = '18px';
        plusBtn.onclick = () => { this.scale *= 1.5; };

        const minusBtn = document.createElement('button');
        minusBtn.innerText = '-';
        minusBtn.className = 'game-btn game-btn-icon';
        minusBtn.style.width = '20px';
        minusBtn.style.height = '20px';
        minusBtn.style.lineHeight = '18px';
        minusBtn.onclick = () => { this.scale /= 1.5; };

        controls.appendChild(plusBtn);
        controls.appendChild(minusBtn);
        mapContent.appendChild(controls);

        // Store content for embedded mode
        this.content = mapContent;

        // In embedded mode, don't create sliding wrapper
        if (this.embedded) {
            return;
        }

        // Create Sliding Panel (slides down, bottom position)
        const { container } = createSlidingPanel({
            title: '',
            content: mapContent,
            direction: 'bottom',
            width: '220px',
            startOpen: false
        });
        container.style.bottom = '10px';
        container.style.right = '10px';
        container.id = 'minimap-container';

        document.body.appendChild(container);
        this.container = container;
    }

    render(bodies: Body[]): void {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Background
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        // Base scale: 60 AU width
        const baseScale = width / (60 * 149.6e9);
        const scale = baseScale * this.scale;

        const cameraCenter = this.renderer.getCenter();
        const minimapCenter = new Vector2(width / 2, height / 2);

        // Draw Orbits
        if (this.renderer.showOrbits) {
            ctx.lineWidth = 1;
            bodies.forEach(body => {
                if (!body.parent || !body.orbit) return;

                const orbit = body.orbit;
                const orbitCenter = body.parent.position.add(orbit.focusOffset);

                const relPos = orbitCenter.sub(cameraCenter);
                const pos = relPos.scale(scale).add(minimapCenter);

                const radiusX = orbit.a * scale;
                const radiusY = orbit.b * scale;

                if (radiusX < 1) return;

                ctx.strokeStyle = body.color;
                ctx.beginPath();
                ctx.ellipse(pos.x, pos.y, radiusX, radiusY, orbit.omega, 0, 2 * Math.PI);
                ctx.stroke();
            });
        }

        // Draw Bodies
        bodies.forEach(body => {
            const relPos = body.position.sub(cameraCenter);
            const pos = relPos.scale(scale).add(minimapCenter);

            ctx.fillStyle = body.color;
            ctx.beginPath();
            const radius = body.name === "Sun" ? 3 : 1.5;
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw camera view rectangle
        const viewWidth = (this.renderer.width / this.renderer.scale) * scale;
        const viewHeight = (this.renderer.height / this.renderer.scale) * scale;

        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
            minimapCenter.x - viewWidth / 2,
            minimapCenter.y - viewHeight / 2,
            viewWidth,
            viewHeight
        );
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
