/**
 * RocketControls - Handles keyboard input for rocket control
 * Controls: Q/D for rotation, Z for thrust, S for retrograde
 */
export interface RocketInput {
    throttle: number;   // 0 to 1
    rotation: number;   // -1 (left) to 1 (right)
    stage: boolean;     // True if spacebar is pressed
}

export class RocketControls {
    private keys: Set<string> = new Set();
    private throttle: number = 0;
    private rotationSpeed: number = 1.5; // radians per second
    private stagePressed: boolean = false; // Track previous state to trigger once per press

    constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys.add(e.key.toLowerCase());
            if (e.code === 'Space') {
                this.keys.add('space');
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.key.toLowerCase());
            if (e.code === 'Space') {
                this.keys.delete('space');
                this.stagePressed = false; // Reset latch
            }
        });
    }

    /**
     * Get current input state from keyboard
     */
    getInput(): RocketInput {
        let rotation = 0;

        // Rotation controls (Q = left, D = right)
        if (this.keys.has('q')) rotation -= 1;
        if (this.keys.has('d')) rotation += 1;

        // Throttle controls
        if (this.keys.has('z')) {
            // Z = full thrust
            this.throttle = 1.0;
        } else if (this.keys.has('s')) {
            // S = cut engines
            this.throttle = 0;
        } else if (this.keys.has('shift')) {
            // Shift = increase throttle gradually
            this.throttle = Math.min(1.0, this.throttle + 0.02);
        } else if (this.keys.has('control')) {
            // Ctrl = decrease throttle gradually
            this.throttle = Math.max(0, this.throttle - 0.02);
        }

        // Staging control (Spacebar)
        // Only return true on the rising edge (first frame pressed)
        let stage = false;
        if (this.keys.has('space') || this.keys.has(' ')) {
            if (!this.stagePressed) {
                stage = true;
                this.stagePressed = true;
            }
        }

        return {
            throttle: this.throttle,
            rotation: rotation * this.rotationSpeed,
            stage: stage
        };
    }

    /**
     * Get current throttle setting (for UI display)
     */
    getThrottle(): number {
        return this.throttle;
    }

    /**
     * Manually set throttle (for UI controls)
     */
    setThrottle(value: number) {
        this.throttle = Math.max(0, Math.min(1, value));
    }

    /**
     * Clean up event listeners
     */
    dispose() {
        this.keys.clear();
    }
}
