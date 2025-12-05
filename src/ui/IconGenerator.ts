/**
 * IconGenerator - Centralized icon generation for the game
 * All icons (autopilot, maneuver, etc.) are created here for consistency
 */
export class IconGenerator {
    /**
     * Create maneuver node icon (target/crosshair style)
     */
    static createManeuverIcon(size: number, color: string = '#ffffff'): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const center = size / 2;

        ctx.clearRect(0, 0, size, size);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;

        // Outer ring
        ctx.lineWidth = size * 0.09; // Proportional to size
        ctx.beginPath();
        ctx.arc(center, center, size * 0.4, 0, Math.PI * 2);
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(center, center, size * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Crosshair
        ctx.lineWidth = size * 0.06; // Proportional to size
        ctx.beginPath();
        ctx.moveTo(center - size * 0.5, center);
        ctx.lineTo(center - size * 0.25, center);
        ctx.moveTo(center + size * 0.25, center);
        ctx.lineTo(center + size * 0.5, center);
        ctx.moveTo(center, center - size * 0.5);
        ctx.lineTo(center, center - size * 0.25);
        ctx.moveTo(center, center + size * 0.25);
        ctx.lineTo(center, center + size * 0.5);
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
     * Create target icon (circle with center dot - magenta)
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

        return canvas;
    }

    /**
     * Create anti-target icon (circle with X - magenta)
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
}
