import { Rocket } from '../entities/Rocket';
import { Vector2 } from '../core/Vector2';

/**
 * NavballRenderer - Renders a KSP-style navball with integrated fuel gauge
 */
export class NavballRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private size: number = 200; // Canvas size
    private centerX: number;
    private centerY: number;
    private radius: number = 80; // Navball sphere radius

    private currentRocket: Rocket | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.centerX = this.size / 2;
        this.centerY = this.size / 2;

        this.setupInteraction();
    }

    setRocket(rocket: Rocket) {
        this.currentRocket = rocket;
    }

    /**
     * Setup interaction for throttle control
     */
    private setupInteraction() {
        let isDragging = false;

        const updateThrottleFromEvent = (e: MouseEvent) => {
            if (!this.currentRocket) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left - this.centerX;
            const y = e.clientY - rect.top - this.centerY;

            // Calculate angle from center
            let angle = Math.atan2(y, x);

            // Convert to gauge space (same logic as before)
            let deg = angle * 180 / Math.PI;

            // Shift so -135 is 0
            let shifted = deg + 135;

            // Clamp to valid range
            if (shifted < 0) shifted = 0;
            if (shifted > 270) shifted = 270;

            // Calculate percentage
            const percent = shifted / 270;

            // Set throttle
            if (this.currentRocket.controls) {
                this.currentRocket.controls.setThrottle(percent);
            }
        };

        this.canvas.addEventListener('mousedown', (e) => {
            // Check if click is near gauge ring
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left - this.centerX;
            const y = e.clientY - rect.top - this.centerY;
            const dist = Math.sqrt(x * x + y * y);

            // Gauge radius is radius + 15, width 8
            // Allow some tolerance
            if (dist > this.radius && dist < this.radius + 30) {
                isDragging = true;
                updateThrottleFromEvent(e);
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                updateThrottleFromEvent(e);
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    /**
     * Main render method
     */
    render(rocket: Rocket, velocityVector: Vector2, nearestBody: any) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.size, this.size);

        // Save context state
        this.ctx.save();

        // Translate to center
        this.ctx.translate(this.centerX, this.centerY);

        // Rotate entire navball based on rocket rotation
        // Rocket rotation is in radians, 0 = pointing right
        // Navball should show "up" when rocket points up (PI/2)
        // So we rotate by -(rotation - PI/2) to make PI/2 point up
        const navballRotation = -(rocket.rotation - Math.PI / 2);
        this.ctx.rotate(navballRotation);

        // Draw background circle (relative to center)
        this.drawBackground();

        // Draw throttle gauge (behind navball, not rotated)
        this.ctx.save();
        this.ctx.rotate(-navballRotation); // Undo rotation for gauge
        // Use throttle value instead of fuel
        const throttlePercent = rocket.controls ? rocket.controls.throttle : 0;
        this.drawThrottleGauge(throttlePercent);
        this.ctx.restore();

        // Draw navball sphere with fixed grid
        this.drawSphere();

        // Draw horizon (now rotates with sphere)
        this.drawHorizon();

        // Draw directional markers (prograde/retrograde)
        // We keep the rotation so we draw in "Rocket Space" (Up = Forward)
        this.drawMarkers(rocket, velocityVector, nearestBody, navballRotation);

        // Draw central crosshair (not rotated - screen space)
        this.ctx.save();
        this.ctx.rotate(-navballRotation);
        this.drawCrosshair();
        this.ctx.restore();

        // Restore context
        this.ctx.restore();
    }

    /**
     * Draw semi-transparent background
     */
    private drawBackground() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.radius + 20, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Draw the navball sphere with fixed grid pattern
     */
    private drawSphere() {
        // Draw main sphere gradient
        const gradient = this.ctx.createRadialGradient(
            -20, -20, 10,
            0, 0, this.radius
        );
        gradient.addColorStop(0, 'rgba(100, 150, 200, 0.4)');
        gradient.addColorStop(1, 'rgba(50, 80, 120, 0.6)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw fixed grid lines (latitude/longitude style)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;

        // Horizontal latitude lines (fixed on sphere)
        for (let lat = -60; lat <= 60; lat += 30) {
            const y = (lat / 90) * this.radius * 0.8;
            const radiusAtLat = Math.sqrt(this.radius * this.radius - y * y);

            this.ctx.beginPath();
            this.ctx.ellipse(0, y, radiusAtLat, radiusAtLat * 0.3, 0, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Vertical longitude lines (fixed on sphere)
        for (let lon = 0; lon < 360; lon += 45) {
            const angle = (lon / 180) * Math.PI;

            this.ctx.beginPath();
            this.ctx.save();
            this.ctx.rotate(angle);
            this.ctx.ellipse(0, 0, this.radius * 0.25, this.radius, 0, 0, Math.PI * 2);
            this.ctx.restore();
            this.ctx.stroke();
        }
    }

    /**
     * Draw horizon line (blue sky / brown ground)
     * Now this rotates with the sphere automatically
     */
    private drawHorizon() {
        // Draw blue (sky) on upper half
        this.ctx.fillStyle = 'rgba(135, 206, 250, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.radius, 0, Math.PI, true);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw brown (ground) on lower half
        this.ctx.fillStyle = 'rgba(139, 90, 43, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.radius, 0, Math.PI);
        this.ctx.closePath();
        this.ctx.fill();

        // Horizon line
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-this.radius, 0);
        this.ctx.lineTo(this.radius, 0);
        this.ctx.stroke();
    }

    /**
     * Draw directional markers (prograde, retrograde, etc.)
     */
    private drawMarkers(rocket: Rocket, velocityVector: Vector2, _nearestBody: any, _navballRotation: number) {
        // Calculate prograde direction (normalized velocity)
        const speed = Math.sqrt(velocityVector.x * velocityVector.x + velocityVector.y * velocityVector.y);

        if (speed > 0.1) {
            // Calculate angle difference between velocity and rocket heading
            const velocityAngle = Math.atan2(velocityVector.y, velocityVector.x);
            const rocketAngle = rocket.rotation;

            // Relative angle in [-PI, PI]
            let relativeAngle = velocityAngle - rocketAngle;
            while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
            while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;

            // In 2D, we project this angle onto the horizontal axis of the navball
            // Center (0,0) = Forward (relativeAngle = 0)
            // Right Edge (R,0) = Right (relativeAngle = -PI/2)
            // Left Edge (-R,0) = Left (relativeAngle = PI/2)

            // Note: Canvas rotation makes Up (-Y) = Forward.
            // So Right (+X) is Right.
            // relativeAngle is positive for Left turn (CCW).
            // So x should be -sin(relativeAngle)?
            // Let's check: Rocket=0 (Right). Vel=PI/2 (Down/Right? No Down is +Y).
            // Vel=(0,1). Angle=PI/2.
            // Rel = PI/2 - 0 = PI/2.
            // Rocket Right is Down. Vel is Down. So Vel is Right of Rocket.
            // So Marker should be Right (+X).
            // If Rel=PI/2 -> sin(PI/2)=1. We want +X.
            // So x = R * sin(relAngle) works.

            // Prograde Marker
            if (Math.abs(relativeAngle) < Math.PI / 2) {
                // Front hemisphere
                const x = Math.sin(relativeAngle) * this.radius;
                const y = 0; // Constrained to horizontal line in 2D

                this.drawProgradeMarker(x, y);

                this.ctx.fillStyle = '#FFD700';
                this.ctx.font = 'bold 10px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('PRO', x, y + 20);
            }

            // Retrograde Marker (Opposite)
            // Retro angle is relativeAngle + PI
            let retroAngle = relativeAngle + Math.PI;
            while (retroAngle > Math.PI) retroAngle -= Math.PI * 2;
            while (retroAngle < -Math.PI) retroAngle += Math.PI * 2;

            if (Math.abs(retroAngle) < Math.PI / 2) {
                // Front hemisphere (Retrograde is in front)
                const x = Math.sin(retroAngle) * this.radius;
                const y = 0;

                this.drawRetrogradeMarker(x, y);

                this.ctx.fillStyle = '#FFD700';
                this.ctx.font = 'bold 10px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('RETRO', x, y + 20);
            }
        }
    }



    /**
     * Draw prograde marker (yellow circle)
     */
    private drawProgradeMarker(x: number, y: number) {
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 10, 0, Math.PI * 2);
        this.ctx.stroke();

        // Inner dot
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Draw retrograde marker (yellow circle with X)
     */
    private drawRetrogradeMarker(x: number, y: number) {
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 10, 0, Math.PI * 2);
        this.ctx.stroke();

        // X through circle
        this.ctx.beginPath();
        this.ctx.moveTo(x - 7, y - 7);
        this.ctx.lineTo(x + 7, y + 7);
        this.ctx.moveTo(x + 7, y - 7);
        this.ctx.lineTo(x - 7, y + 7);
        this.ctx.stroke();
    }

    /**
     * Draw central crosshair
     */
    private drawCrosshair() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;

        // Horizontal line
        this.ctx.beginPath();
        this.ctx.moveTo(-15, 0);
        this.ctx.lineTo(-5, 0);
        this.ctx.moveTo(5, 0);
        this.ctx.lineTo(15, 0);
        this.ctx.stroke();

        // Vertical line
        this.ctx.beginPath();
        this.ctx.moveTo(0, -15);
        this.ctx.lineTo(0, -5);
        this.ctx.moveTo(0, 5);
        this.ctx.lineTo(0, 15);
        this.ctx.stroke();
    }

    /**
     * Draw circular throttle gauge around navball
     */
    private drawThrottleGauge(throttlePercent: number) {
        const gaugeRadius = this.radius + 15;
        const gaugeWidth = 8;

        // Background arc (zero throttle)
        this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        this.ctx.lineWidth = gaugeWidth;
        this.ctx.beginPath();
        this.ctx.arc(
            0, 0, gaugeRadius,
            -Math.PI * 0.75, // Start at bottom-left
            Math.PI * 0.75,  // End at bottom-right (270° arc)
            false
        );
        this.ctx.stroke();

        // Throttle arc (colored based on power)
        // Green -> Yellow -> Red
        const throttleColor = throttlePercent > 0.8 ? '#FF0000' :
            throttlePercent > 0.5 ? '#FFFF00' : '#00FF00';

        this.ctx.strokeStyle = throttleColor;
        this.ctx.lineWidth = gaugeWidth;
        this.ctx.beginPath();
        this.ctx.arc(
            0, 0, gaugeRadius,
            -Math.PI * 0.75, // Start
            -Math.PI * 0.75 + (Math.PI * 1.5 * throttlePercent), // End based on throttle %
            false
        );
        this.ctx.stroke();

        // Tick marks
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const angle = -Math.PI * 0.75 + (Math.PI * 1.5 * i / 4);
            const x1 = Math.cos(angle) * (gaugeRadius - gaugeWidth / 2);
            const y1 = Math.sin(angle) * (gaugeRadius - gaugeWidth / 2);
            const x2 = Math.cos(angle) * (gaugeRadius + gaugeWidth / 2);
            const y2 = Math.sin(angle) * (gaugeRadius + gaugeWidth / 2);

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }

        // Draw handle at current throttle position
        const handleAngle = -Math.PI * 0.75 + (Math.PI * 1.5 * throttlePercent);
        const handleX = Math.cos(handleAngle) * gaugeRadius;
        const handleY = Math.sin(handleAngle) * gaugeRadius;

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(handleX, handleY, 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Label
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('THROTTLE', 0, gaugeRadius + 20);
        this.ctx.fillText(`${(throttlePercent * 100).toFixed(0)}%`, 0, gaugeRadius + 32);
    }


}

