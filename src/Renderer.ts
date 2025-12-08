import { Body } from './core/Body';
import { Vector2 } from './core/Vector2';


export class Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number = 0;
    height: number = 0;

    // Camera
    scale: number = 1e-9; // Meters to pixels
    offset: Vector2 = new Vector2(0, 0); // Center of screen in world coordinates
    followedBody: Body | null = null;

    showOrbits: boolean = true;

    backgroundCanvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.backgroundCanvas = document.createElement('canvas');

        // Initial resize to set up background
        this.resize(window.innerWidth, window.innerHeight);

        // Handle window resize
        window.addEventListener('resize', () => {
            this.resize(window.innerWidth, window.innerHeight);
        });

        // Mouse events (Zoom/Pan/Select)
        // ... (kept as is, but not shown in this snippet)
        this.setupInputHandlers();
    }

    setupInputHandlers() {
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSpeed = 0.1;
            if (e.deltaY < 0) {
                this.scale *= (1 + zoomSpeed);
            } else {
                this.scale /= (1 + zoomSpeed);
            }
        });

        let isDragging = false;
        let lastX = 0;
        let lastY = 0;

        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;

            // Check for click on body
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const clickedBody = this.selectBodyAt(new Vector2(x, y), this.currentBodies || []);
            if (clickedBody) {
                this.followedBody = clickedBody;
            } else {
                // If dragging background, stop following
                // actually we might want to drag to pan.
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const dx = e.clientX - lastX;
                const dy = e.clientY - lastY;
                lastX = e.clientX;
                lastY = e.clientY;

                if (this.followedBody) {
                    this.followedBody = null; // Stop following if panning
                }
                this.offset = this.offset.sub(new Vector2(dx / this.scale, dy / this.scale));
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // Store current bodies for selection
    currentBodies: Body[] = [];

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;

        // Resize background cache
        this.backgroundCanvas.width = width;
        this.backgroundCanvas.height = height;
        this.createBackground();
    }

    createBackground() {
        const ctx = this.backgroundCanvas.getContext('2d')!;

        // Deep Space Gradient
        const bgGrad = ctx.createRadialGradient(this.width / 2, this.height / 2, 0, this.width / 2, this.height / 2, this.width);
        bgGrad.addColorStop(0, "#0B1026"); // Deep Blue/Black center
        bgGrad.addColorStop(1, "#000000"); // Black edge
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Stars (Static)
        ctx.fillStyle = "white";
        for (let i = 0; i < 200; i++) {
            const sx = Math.random() * this.width;
            const sy = Math.random() * this.height;
            const size = Math.random() * 1.5;
            ctx.globalAlpha = Math.random() * 0.8 + 0.2;
            ctx.fillRect(sx, sy, size, size);
        }
        ctx.globalAlpha = 1.0;
    }

    getCenter(): Vector2 {
        if (this.followedBody) {
            return this.followedBody.position;
        }
        return this.offset;
    }

    worldToScreen(pos: Vector2): Vector2 {
        const center = this.getCenter();
        return new Vector2(
            (pos.x - center.x) * this.scale + this.width / 2,
            (pos.y - center.y) * this.scale + this.height / 2
        );
    }

    screenToWorld(pos: Vector2): Vector2 {
        const center = this.getCenter();
        return new Vector2(
            (pos.x - this.width / 2) / this.scale + center.x,
            (pos.y - this.height / 2) / this.scale + center.y
        );
    }

    render(bodies: Body[], time: number = 0) {
        this.currentBodies = bodies;

        // Draw cached background
        this.ctx.drawImage(this.backgroundCanvas, 0, 0);

        // Update camera
        if (this.followedBody) {
            this.offset = this.followedBody.position;
        }

        // Draw Orbits (Solid Lines - Optimized)
        if (this.showOrbits) {
            this.ctx.lineWidth = 1;
            // Removed setLineDash for performance

            bodies.forEach(body => {
                if (!body.parent || !body.orbit) return;

                const orbit = body.orbit;
                const orbitCenter = body.parent.position.add(orbit.focusOffset);
                const screenCenter = this.worldToScreen(orbitCenter);
                const radiusX = orbit.a * this.scale;
                const radiusY = orbit.b * this.scale;

                if (radiusX < 1) return;

                // Visibility check
                if (screenCenter.x + radiusX < 0 || screenCenter.x - radiusX > this.width ||
                    screenCenter.y + radiusX < 0 || screenCenter.y - radiusX > this.height) {
                    // Skip
                }

                this.ctx.strokeStyle = "rgba(255, 255, 255, 0.15)"; // Faint white solid
                this.ctx.beginPath();
                this.ctx.ellipse(
                    screenCenter.x,
                    screenCenter.y,
                    radiusX,
                    radiusY,
                    orbit.omega,
                    0,
                    2 * Math.PI
                );
                this.ctx.stroke();
            });
        }

        // Draw bodies
        bodies.forEach(body => {
            const screenPos = this.worldToScreen(body.position);
            const x = screenPos.x;
            const y = screenPos.y;
            const radius = body.radius * this.scale;

            if (x < -radius || x > this.width + radius || y < -radius || y > this.height + radius) {
                return;
            }

            this.drawBody(this.ctx, body, x, y, radius, time);
        });
    }

    drawBody(ctx: CanvasRenderingContext2D, body: Body, x: number, y: number, radius: number, time: number) {
        // Minimum visible size (1px)
        if (radius < 0.5) {
            ctx.fillStyle = body.color;
            ctx.fillRect(x, y, 1, 1);
            return;
        }

        // 1. Draw Back Rings (Behind body) - Top half (PI to 2PI)
        if (body.ringColor && body.ringInnerRadius && body.ringOuterRadius) {
            this.drawRingHalf(ctx, body, x, y, true);
        }

        // 2. Draw Atmosphere (Hard Edge Glow)
        if (body.atmosphereColor) {
            const atmoRadius = radius * 1.1; // Thinner, harder edge
            ctx.fillStyle = body.atmosphereColor;
            ctx.beginPath();
            ctx.arc(x, y, atmoRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Draw Body Surface
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.clip(); // Clip everything to the body sphere

        if (body.name === "Earth" || body.name === "Venus") {
            this.drawTerrestrial(ctx, x, y, radius, time, body);
        } else if (body.name === "Jupiter" || body.name === "Saturn" || body.name === "Uranus" || body.name === "Neptune") {
            this.drawGasGiant(ctx, x, y, radius, time, body);
        } else if (body.type === 'moon') {
            this.drawMoon(ctx, x, y, radius, body);
        } else {
            this.drawGenericBody(ctx, x, y, radius, body);
        }

        // 4. Cel Shading
        // No shadows drawn here.

        ctx.restore();

        // 5. Draw Front Rings (In front of body) - Bottom half (0 to PI)
        if (body.ringColor && body.ringInnerRadius && body.ringOuterRadius) {
            this.drawRingHalf(ctx, body, x, y, false);
        }

        // Label
        if (radius > 5) {
            this.ctx.fillStyle = "#FFF";
            this.ctx.font = "bold 11px Arial"; // Bolder font
            this.ctx.fillText(body.name, x + radius + 4, y);
        }
    }

    drawRingHalf(ctx: CanvasRenderingContext2D, body: Body, x: number, y: number, isBack: boolean) {
        const innerR = body.ringInnerRadius! * this.scale;
        const outerR = body.ringOuterRadius! * this.scale;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, 0.3); // Tilt

        ctx.beginPath();
        // Draw the arc for the specified half
        // Back: PI to 2PI (Top)
        // Front: 0 to PI (Bottom)
        const startAngle = isBack ? Math.PI : 0;
        const endAngle = isBack ? Math.PI * 2 : Math.PI;

        ctx.arc(0, 0, outerR, startAngle, endAngle);
        ctx.arc(0, 0, innerR, endAngle, startAngle, true); // Reverse for hole
        ctx.closePath();

        ctx.fillStyle = body.ringColor!;
        ctx.fill();

        ctx.restore();
    }

    drawGenericBody(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, body: Body) {
        ctx.fillStyle = body.color;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    drawTerrestrial(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, time: number, body: Body) {
        // Base Color (Ocean or Surface)
        ctx.fillStyle = body.name === "Earth" ? "#1E90FF" : body.color;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

        // Continents (Earth only for now) - Organic Shapes
        if (body.name === "Earth") {
            ctx.fillStyle = "#2ECC71"; // Emerald Green

            // America-ish
            ctx.beginPath();
            ctx.moveTo(x - radius * 0.5, y - radius * 0.6);
            ctx.bezierCurveTo(x - radius * 0.2, y - radius * 0.6, x - radius * 0.1, y - radius * 0.3, x - radius * 0.3, y);
            ctx.bezierCurveTo(x - radius * 0.1, y + radius * 0.3, x - radius * 0.3, y + radius * 0.6, x - radius * 0.4, y + radius * 0.5);
            ctx.bezierCurveTo(x - radius * 0.7, y + radius * 0.3, x - radius * 0.8, y - radius * 0.2, x - radius * 0.5, y - radius * 0.6);
            ctx.fill();

            // Eurasia/Africa-ish
            ctx.beginPath();
            ctx.moveTo(x + radius * 0.1, y - radius * 0.5);
            ctx.bezierCurveTo(x + radius * 0.5, y - radius * 0.6, x + radius * 0.8, y - radius * 0.3, x + radius * 0.7, y);
            ctx.bezierCurveTo(x + radius * 0.8, y + radius * 0.4, x + radius * 0.4, y + radius * 0.6, x + radius * 0.2, y + radius * 0.3);
            ctx.bezierCurveTo(x + radius * 0.0, y + radius * 0.1, x - radius * 0.1, y - radius * 0.2, x + radius * 0.1, y - radius * 0.5);
            ctx.fill();
        }

        // Clouds (Organic Blobs)
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        if (body.clouds) {
            body.clouds.forEach(cloud => {
                // Rotate cloud based on time
                const angleOffset = time * cloud.speed * 0.0001;

                // Rotate position around center
                const cx = cloud.x * radius;
                const cy = cloud.y * radius;

                const rx = x + cx * Math.cos(angleOffset) - cy * Math.sin(angleOffset);
                const ry = y + cx * Math.sin(angleOffset) + cy * Math.cos(angleOffset);
                const r = cloud.r * radius;

                // Draw a "puff" of 3 circles instead of one perfect circle
                ctx.beginPath();
                ctx.arc(rx, ry, r, 0, Math.PI * 2);
                ctx.arc(rx + r * 0.5, ry + r * 0.2, r * 0.7, 0, Math.PI * 2);
                ctx.arc(rx - r * 0.4, ry - r * 0.1, r * 0.6, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }

    drawGasGiant(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, time: number, body: Body) {
        // Base
        ctx.fillStyle = body.color;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

        // Bands
        const bands = 7;
        const bandHeight = (radius * 2) / bands;

        for (let i = 0; i < bands; i++) {
            if (i % 2 === 0) continue; // Skip every other band for stripes

            // Darker shade of body color (Flat)
            ctx.fillStyle = "rgba(0, 0, 0, 0.15)";

            // Animate band position slightly?
            const offset = Math.sin(time * 0.0005 + i) * radius * 0.05;

            ctx.fillRect(x - radius + offset, y - radius + i * bandHeight, radius * 2, bandHeight);
        }

        // Great Red Spot (Jupiter only) - Static
        if (body.hasStorms) {
            const spotY = y + radius * 0.2;
            const spotX = x + radius * 0.3; // Static position

            ctx.fillStyle = "rgba(178, 34, 34, 0.8)"; // FireBrick
            ctx.beginPath();
            ctx.ellipse(spotX, spotY, radius * 0.25, radius * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, body: Body) {
        // Base
        ctx.fillStyle = body.color;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

        // Craters
        if (body.craters) {
            body.craters.forEach(crater => {
                const cx = x + crater.x * radius;
                const cy = y + crater.y * radius;
                const cr = crater.r * radius;

                // Simple crater: Dark circle
                ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
                ctx.beginPath();
                ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }

    selectBodyAt(screenPos: Vector2, bodies: Body[]): Body | null {
        // Find body closest to click
        let closest: Body | null = null;
        let minDist = Infinity;

        bodies.forEach(body => {
            const pos = this.worldToScreen(body.position);
            const dist = pos.distanceTo(screenPos);

            // Hitbox size: max(10, radius) to make it easier to click small planets
            const radius = Math.max(10, body.radius * this.scale);

            if (dist < radius && dist < minDist) {
                minDist = dist;
                closest = body;
            }
        });

        return closest;
    }
}
