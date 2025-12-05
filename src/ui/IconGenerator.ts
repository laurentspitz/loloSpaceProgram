/**
 * IconGenerator - Centralized icon generation for the game
 * All icons (autopilot, maneuver, etc.) are created here for consistency
 */
export class IconGenerator {
    /**
     * Create maneuver node icon (target/crosshair style)
     * Default color is blue (#4a9eff) to match trajectory nodes
     */
    static createManeuverIcon(size: number, color: string = '#4a9eff'): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const center = size / 2;
        const radius = size * 0.31; // Same as other icons (~10px for 32px)

        ctx.clearRect(0, 0, size, size);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;

        // Outer ring (same size as prograde/retrograde)
        ctx.lineWidth = size * 0.06; // Proportional to size
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner dot (same proportion as prograde)
        ctx.beginPath();
        ctx.arc(center, center, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Crosshair (extends beyond circle)
        ctx.lineWidth = size * 0.05;
        ctx.beginPath();
        ctx.moveTo(center - radius * 1.6, center);
        ctx.lineTo(center - radius * 0.8, center);
        ctx.moveTo(center + radius * 0.8, center);
        ctx.lineTo(center + radius * 1.6, center);
        ctx.moveTo(center, center - radius * 1.6);
        ctx.lineTo(center, center - radius * 0.8);
        ctx.moveTo(center, center + radius * 0.8);
        ctx.lineTo(center, center + radius * 1.6);
        ctx.stroke();

        return canvas;
    }

    /**
     * Create prograde icon (circle with center dot)
     */
    static createProgradeIcon(size: number, color: string = '#FFD700'): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const center = size / 2;
        const radius = size * 0.31; // ~10px for 32px canvas

        ctx.clearRect(0, 0, size, size);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;

        // Outer circle
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(center, center, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        return canvas;
    }

    /**
     * Create retrograde icon (circle with X)
     */
    static createRetrogradeIcon(size: number, color: string = '#FFD700'): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const center = size / 2;
        const radius = size * 0.31; // ~10px for 32px canvas

        ctx.clearRect(0, 0, size, size);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        // Outer circle
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.stroke();

        // X (crossmark)
        const xOffset = radius * 0.6;
        ctx.beginPath();
        ctx.moveTo(center - xOffset, center - xOffset);
        ctx.lineTo(center + xOffset, center + xOffset);
        ctx.moveTo(center + xOffset, center - xOffset);
        ctx.lineTo(center - xOffset, center + xOffset);
        ctx.stroke();

        return canvas;
    }

    /**
     * Create target icon (circle with center dot and inward triangles - magenta)
     */
    static createTargetIcon(size: number, color: string = '#C71585'): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const center = size / 2;
        const radius = size * 0.31; // ~10px for 32px canvas

        ctx.clearRect(0, 0, size, size);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;

        // Outer circle
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(center, center, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Inward triangles (pointing toward center) at cardinal directions
        const triangleSize = radius * 0.4;
        const triangleOffset = radius * 1.3;

        // Top triangle (pointing down)
        ctx.beginPath();
        ctx.moveTo(center, center - triangleOffset - triangleSize);
        ctx.lineTo(center - triangleSize * 0.5, center - triangleOffset);
        ctx.lineTo(center + triangleSize * 0.5, center - triangleOffset);
        ctx.closePath();
        ctx.fill();

        // Bottom triangle (pointing up)
        ctx.beginPath();
        ctx.moveTo(center, center + triangleOffset + triangleSize);
        ctx.lineTo(center - triangleSize * 0.5, center + triangleOffset);
        ctx.lineTo(center + triangleSize * 0.5, center + triangleOffset);
        ctx.closePath();
        ctx.fill();

        // Left triangle (pointing right)
        ctx.beginPath();
        ctx.moveTo(center - triangleOffset - triangleSize, center);
        ctx.lineTo(center - triangleOffset, center - triangleSize * 0.5);
        ctx.lineTo(center - triangleOffset, center + triangleSize * 0.5);
        ctx.closePath();
        ctx.fill();

        // Right triangle (pointing left)
        ctx.beginPath();
        ctx.moveTo(center + triangleOffset + triangleSize, center);
        ctx.lineTo(center + triangleOffset, center - triangleSize * 0.5);
        ctx.lineTo(center + triangleOffset, center + triangleSize * 0.5);
        ctx.closePath();
        ctx.fill();

        return canvas;
    }

    /**
     * Create anti-target icon (circle with X and outward triangles - magenta)
     */
    static createAntiTargetIcon(size: number, color: string = '#C71585'): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const center = size / 2;
        const radius = size * 0.31; // ~10px for 32px canvas

        ctx.clearRect(0, 0, size, size);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;

        // Outer circle
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.stroke();

        // X (crossmark)
        const xOffset = radius * 0.6;
        ctx.beginPath();
        ctx.moveTo(center - xOffset, center - xOffset);
        ctx.lineTo(center + xOffset, center + xOffset);
        ctx.moveTo(center + xOffset, center - xOffset);
        ctx.lineTo(center - xOffset, center + xOffset);
        ctx.stroke();

        // Outward triangles (pointing away from center) at cardinal directions
        const triangleSize = radius * 0.4;
        const triangleOffset = radius * 1.3;

        // Top triangle (pointing up)
        ctx.beginPath();
        ctx.moveTo(center, center - triangleOffset - triangleSize);
        ctx.lineTo(center - triangleSize * 0.5, center - triangleOffset);
        ctx.lineTo(center + triangleSize * 0.5, center - triangleOffset);
        ctx.closePath();
        ctx.fill();

        // Bottom triangle (pointing down)
        ctx.beginPath();
        ctx.moveTo(center, center + triangleOffset + triangleSize);
        ctx.lineTo(center - triangleSize * 0.5, center + triangleOffset);
        ctx.lineTo(center + triangleSize * 0.5, center + triangleOffset);
        ctx.closePath();
        ctx.fill();

        // Left triangle (pointing left)
        ctx.beginPath();
        ctx.moveTo(center - triangleOffset - triangleSize, center);
        ctx.lineTo(center - triangleOffset, center - triangleSize * 0.5);
        ctx.lineTo(center - triangleOffset, center + triangleSize * 0.5);
        ctx.closePath();
        ctx.fill();

        // Right triangle (pointing right)
        ctx.beginPath();
        ctx.moveTo(center + triangleOffset + triangleSize, center);
        ctx.lineTo(center + triangleOffset, center - triangleSize * 0.5);
        ctx.lineTo(center + triangleOffset, center + triangleSize * 0.5);
        ctx.closePath();
        ctx.fill();

        return canvas;
    }

    /**
     * Create rocket icon (simple rocket shape)
     */
    static createRocketIcon(size: number, color: string = '#ffffff'): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const center = size / 2;

        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        // Rocket body (vertical rectangle)
        const bodyWidth = size * 0.3;
        const bodyHeight = size * 0.6;
        const bodyX = center - bodyWidth / 2;
        const bodyY = center - bodyHeight * 0.6;

        ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight);

        // Nose cone (triangle on top)
        ctx.beginPath();
        ctx.moveTo(center, bodyY - bodyWidth * 0.8); // Top point
        ctx.lineTo(bodyX, bodyY); // Left bottom
        ctx.lineTo(bodyX + bodyWidth, bodyY); // Right bottom
        ctx.closePath();
        ctx.fill();

        // Fins (triangles on sides)
        const finHeight = bodyHeight * 0.3;
        const finWidth = bodyWidth * 0.6;
        const finY = bodyY + bodyHeight * 0.7;

        // Left fin
        ctx.beginPath();
        ctx.moveTo(bodyX, finY);
        ctx.lineTo(bodyX - finWidth, finY + finHeight);
        ctx.lineTo(bodyX, finY + finHeight);
        ctx.closePath();
        ctx.fill();

        // Right fin
        ctx.beginPath();
        ctx.moveTo(bodyX + bodyWidth, finY);
        ctx.lineTo(bodyX + bodyWidth + finWidth, finY + finHeight);
        ctx.lineTo(bodyX + bodyWidth, finY + finHeight);
        ctx.closePath();
        ctx.fill();

        // Engine exhaust (trapezoid at bottom)
        const exhaustY = bodyY + bodyHeight;
        const exhaustHeight = size * 0.15;
        ctx.fillStyle = color === '#ffffff' ? '#ffaa00' : color; // Orange if white, else same color
        ctx.beginPath();
        ctx.moveTo(bodyX + bodyWidth * 0.2, exhaustY);
        ctx.lineTo(bodyX + bodyWidth * 0.8, exhaustY);
        ctx.lineTo(bodyX + bodyWidth, exhaustY + exhaustHeight);
        ctx.lineTo(bodyX, exhaustY + exhaustHeight);
        ctx.closePath();
        ctx.fill();

        return canvas;
    }
}
