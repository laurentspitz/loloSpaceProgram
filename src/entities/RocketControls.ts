/**
 * RocketControls - Handles keyboard input for rocket control
 * Controls are now configurable via Settings panel
 */
import { controls } from '../config/Controls';

export interface RocketInput {
    throttle: number;   // 0 to 1
    rotation: number;   // -1 (left) to 1 (right)
    stage: boolean;     // True if spacebar is pressed
    rcsEnabled: boolean; // True if RCS is active
    sasEnabled: boolean; // True if Stability Assist is active
    deployParachute: boolean; // True if deployment requested
}

export class RocketControls {
    private keys: Set<string> = new Set();
    public throttle: number = 0;
    public rcsEnabled: boolean = true; // RCS Toggle state
    public sasEnabled: boolean = true; // SAS Toggle state
    private rotationSpeed: number = 1.5; // radians per second
    private stagePressed: boolean = false; // Track previous state to trigger once per press
    private rcsPressed: boolean = false; // Latch for RCS toggle
    private sasPressed: boolean = false; // Latch for SAS toggle
    private parachutePressed: boolean = false; // Latch for Parachute toggle

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
     * Get current input state from keyboard (using configured controls)
     */
    getInput(): RocketInput {
        let rotation = 0;

        // Rotation controls (configurable)
        if (this.keys.has(controls.getControl('rotateLeft').toLowerCase())) rotation -= 1;
        if (this.keys.has(controls.getControl('rotateRight').toLowerCase())) rotation += 1;

        // Throttle controls (configurable)
        if (this.keys.has(controls.getControl('thrust').toLowerCase())) {
            // Full thrust
            this.throttle = 1.0;
        } else if (this.keys.has(controls.getControl('cutEngines').toLowerCase())) {
            // Cut engines
            this.throttle = 0.0;
        } else if (this.keys.has(controls.getControl('increaseThrottle').toLowerCase())) {
            // Increase throttle gradually
            this.throttle = Math.min(1.0, this.throttle + 0.02);
        } else if (this.keys.has(controls.getControl('decreaseThrottle').toLowerCase())) {
            // Decrease throttle gradually
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

        // RCS Toggle (R key)
        if (this.keys.has(controls.getControl('toggleRCS').toLowerCase())) {
            if (!this.rcsPressed) {
                this.rcsEnabled = !this.rcsEnabled;
                this.rcsPressed = true;
            }
        } else {
            this.rcsPressed = false;
        }

        // SAS Toggle (T key)
        if (this.keys.has(controls.getControl('toggleSAS').toLowerCase())) {
            if (!this.sasPressed) {
                this.sasEnabled = !this.sasEnabled;
                this.sasPressed = true;
            }
        } else {
            this.sasPressed = false;
        }

        // Parachute Deploy (P key)
        let deployParachute = false;
        if (this.keys.has('p')) {
            if (!this.parachutePressed) {
                deployParachute = true;
                this.parachutePressed = true;
            }
        } else {
            this.parachutePressed = false;
        }

        return {
            throttle: this.throttle,
            rotation: rotation * this.rotationSpeed,
            stage: stage,
            rcsEnabled: this.rcsEnabled,
            sasEnabled: this.sasEnabled,
            deployParachute: deployParachute
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
