import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator';

/**
 * ThrustParticleSystem - Particle-based rocket thrust effect
 */
export class ThrustParticleSystem {
    private particles: THREE.Points;
    private particleCount: number = 20000; // Increased from 10000 for denser effect
    private physicsPositions: Float64Array;
    private velocities: Float32Array;
    private lifetimes: Float32Array;
    private sizes: Float32Array;
    private colors: Float32Array;
    private types: Int8Array; // 0=Standard, 1=Blue, 2=RCS
    private maxLifetime: number = 3.5; // Increased for longer visible trail
    private emissionRate: number = 20000; // Increased from 8000 for much denser flame
    private activeParticles: number = 0;
    private nextParticleIndex: number = 0; // Ring buffer index

    constructor() {
        // Initialize particle buffers
        this.physicsPositions = new Float64Array(this.particleCount * 3);
        const renderPositions = new Float32Array(this.particleCount * 3); // Screen space positions for rendering
        this.velocities = new Float32Array(this.particleCount * 3);
        this.lifetimes = new Float32Array(this.particleCount);
        this.sizes = new Float32Array(this.particleCount);
        this.colors = new Float32Array(this.particleCount * 3);
        this.types = new Int8Array(this.particleCount);

        // Initialize all particles as dead
        for (let i = 0; i < this.particleCount; i++) {
            this.lifetimes[i] = 0;
        }

        // Create particle geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(renderPositions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

        // Create particle texture
        const texture = TextureGenerator.createParticleTexture();

        // Create custom shader material for per-particle sizing and soft texture
        const material = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: texture }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_PointSize = size;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying vec3 vColor;
                void main() {
                    gl_FragColor = vec4( vColor, 1.0 );
                    gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
                    // Lower threshold for softer edges
                    if (gl_FragColor.a < 0.001) discard;
                }
            `,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.particles.frustumCulled = false;
        this.particles.renderOrder = 999;
    }

    /**
     * Update particle system
     */
    /**
     * Update particle system with adaptive emission based on zoom level
     * @param deltaTime Time delta in seconds
     * @param emitters Array of particle emitters
     * @param scale Current render scale (higher = more zoomed in)
     */
    update(deltaTime: number, emitters: Array<{ pos: THREE.Vector3; dir: THREE.Vector3; throttle: number; type?: string }>, scale: number = 1e-9) {
        if (emitters.length === 0) return;

        // Adaptive emission rate based on zoom level - MORE GENTLE scaling
        // At default scale (1e-9), use base rate
        // When zoomed in 100x (scale = 1e-7), multiply by ~3x max
        const zoomFactor = Math.pow(scale / 1e-9, 0.3); // Power 0.3 for very gentle scaling
        const adaptiveEmissionRate = this.emissionRate * Math.max(1, Math.min(zoomFactor, 3)); // Cap at 3x instead of 10x

        // Process emissions for each emitter
        emitters.forEach(emitter => {
            if (emitter.throttle > 0) {
                const effectiveRate = adaptiveEmissionRate * emitter.throttle;

                // Track time per emitter?
                // Currently `timeSinceLastEmit` is global. This implies bursty emission if sharing.
                // For simplicity, let's treat emission as global pool but distributed.
                // Or better: pass `deltaTime` * `effectiveRate` = number of particles to emit.

                const count = deltaTime * effectiveRate;
                const intCount = Math.floor(count);
                const prob = count - intCount;
                let particlesToEmit = intCount + (Math.random() < prob ? 1 : 0);

                // Limit max particles per frame per emitter (scale with zoom)
                const maxParticlesPerFrame = Math.floor(100 * Math.max(1, Math.min(zoomFactor, 5)));
                particlesToEmit = Math.min(particlesToEmit, maxParticlesPerFrame);

                for (let i = 0; i < particlesToEmit; i++) {
                    this.emitParticle(emitter);
                }
            }
        });

        // Update existing particles
        this.activeParticles = 0;
        for (let i = 0; i < this.particleCount; i++) {
            if (this.lifetimes[i] > 0) {
                this.activeParticles++;
                // Update lifetime
                this.lifetimes[i] -= deltaTime;

                if (this.lifetimes[i] <= 0) {
                    continue;
                }

                // Update position
                const i3 = i * 3;
                this.physicsPositions[i3] += this.velocities[i3] * deltaTime;
                this.physicsPositions[i3 + 1] += this.velocities[i3 + 1] * deltaTime;
                this.physicsPositions[i3 + 2] += this.velocities[i3 + 2] * deltaTime;

                // Drag/Slowdown
                const drag = 0.5 * deltaTime;
                this.velocities[i3] *= (1 - drag);
                this.velocities[i3 + 1] *= (1 - drag);
                this.velocities[i3 + 2] *= (1 - drag);

                // Update color and size based on age
                const age = this.maxLifetime - this.lifetimes[i]; // Time alive

                // Retrieve Type from user data? We don't store type in buffer.
                // We should store 'type' in a float buffer or infer from color?
                // Actually, let's look at initial color to determine evolution?
                // Or just use a simple general evolution.

                // Retrieve Type
                const type = this.types[i]; // 0=Std, 1=Blue, 2=RCS

                // RCS Logic: Simple white puff fading out
                if (type === 2) {
                    const t = 1 - (this.lifetimes[i] / (this.maxLifetime * 0.2)); // Short life normalized
                    // White Fade
                    const alpha = Math.max(0, 1 - t * 2); // Fade fast
                    this.colors[i3] = alpha;
                    this.colors[i3 + 1] = alpha;
                    this.colors[i3 + 2] = alpha;
                    this.sizes[i] = 30 + t * 20; // Slight expansion
                }
                // Blue Flame Logic
                else if (type === 1) { // Blue
                    const flameDuration = 0.4;
                    if (age < flameDuration) {
                        const t = age / flameDuration;
                        this.colors[i3] = 0.2 + t * 0.1; // R
                        this.colors[i3 + 1] = 0.8 - t * 0.4; // G
                        this.colors[i3 + 2] = 1.0; // B
                        this.sizes[i] = 100 + t * 60;
                    } else {
                        // Smoke Phase
                        const t = (age - flameDuration) / (this.maxLifetime - flameDuration);
                        const intensity = 0.5 * (1 - t);
                        this.colors[i3] = 0.3 * intensity;
                        this.colors[i3 + 1] = 0.4 * intensity;
                        this.colors[i3 + 2] = 0.8 * intensity;
                        this.sizes[i] = 150 + t * 250;
                    }
                }
                // Standard Logic - Clear visible gradient with LIGHT GRAY smoke
                else {
                    const flameDuration = 1.0; // Flame phase
                    if (age < flameDuration) {
                        const t = age / flameDuration;
                        // Bright white/yellow core → orange → red progression
                        this.colors[i3] = 1.0; // Always full red
                        this.colors[i3 + 1] = 1.0 - t * 0.8; // Yellow fades to dark
                        this.colors[i3 + 2] = (1.0 - t) * 0.5; // Blue component fades quickly
                        // Grow during flame phase
                        this.sizes[i] = 150 * (1 + t * 0.8);
                    } else {
                        // Smoke Phase - LIGHT GRAY diffuse smoke cloud
                        const smokeAge = age - flameDuration;
                        const smokeDuration = this.maxLifetime - flameDuration;
                        const t = smokeAge / smokeDuration;
                        // Light gray smoke that fades to transparent
                        const fade = Math.pow(1 - t, 1.5); // Gentler fade for longer visibility
                        const grayness = 0.5 + (1 - t) * 0.3; // Light gray (0.5-0.8)
                        this.colors[i3] = grayness * fade; // Light gray
                        this.colors[i3 + 1] = grayness * fade;
                        this.colors[i3 + 2] = grayness * fade;
                        // Smoke expands VERY significantly to form diffuse cloud
                        this.sizes[i] = 300 + t * 500; // MUCH larger: 300 → 800 pixels
                    }
                }
            }
        }
    }

    /**
     * Update geometry buffers with transformed positions for rendering
     */
    updateGeometry(center: { x: number, y: number }, scale: number) {
        const geometry = this.particles.geometry as THREE.BufferGeometry;
        const renderPositions = geometry.attributes.position.array as Float32Array;
        const sizes = geometry.attributes.size.array as Float32Array;

        for (let i = 0; i < this.particleCount; i++) {
            if (this.lifetimes[i] > 0) {
                const i3 = i * 3;
                // Transform physics position to screen position
                const x = (this.physicsPositions[i3] - center.x) * scale;
                const y = (this.physicsPositions[i3 + 1] - center.y) * scale;

                renderPositions[i3] = x;
                renderPositions[i3 + 1] = y;
                renderPositions[i3 + 2] = 2; // Z=2

                const physicalSize = this.sizes[i];
                // Increased multiplier from 2 to 3 for larger visible particles
                const pixelSize = Math.max(12, physicalSize * scale * 3); // Increased minimum from 8 to 12
                sizes[i] = pixelSize;
            } else {
                const i3 = i * 3;
                renderPositions[i3] = 0;
                renderPositions[i3 + 1] = 0;
                renderPositions[i3 + 2] = -1000;
                sizes[i] = 0;
            }
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.attributes.size.needsUpdate = true;
    }

    /**
     * Emit a new particle using Ring Buffer
     */
    private emitParticle(config: { pos: THREE.Vector3; dir: THREE.Vector3; throttle: number; type?: string }) {
        const i = this.nextParticleIndex;
        // Advance ring buffer
        this.nextParticleIndex = (this.nextParticleIndex + 1) % this.particleCount;

        const i3 = i * 3;
        const isBlue = config.type === 'blue_flame';
        const isRCS = config.type === 'rcs';

        // Set Type
        let typeVal = 0;
        if (isBlue) typeVal = 1;
        if (isRCS) typeVal = 2;
        this.types[i] = typeVal;

        // Position with randomness - increased radius for better coverage
        const nozzleRadius = isRCS ? 0.5 : (isBlue ? 3.5 : 2.5); // Increased from 1.5/2.5
        this.physicsPositions[i3] = config.pos.x + (Math.random() - 0.5) * nozzleRadius;
        this.physicsPositions[i3 + 1] = config.pos.y + (Math.random() - 0.5) * nozzleRadius;
        this.physicsPositions[i3 + 2] = config.pos.z;

        // Velocity - reduced spread for tighter flame
        const spread = isRCS ? 0.05 : (isBlue ? 0.1 : 0.15); // Reduced from 0.2/0.3 for tighter flame
        const speedMult = isRCS ? 3.0 : (isBlue ? 1.5 : 1.0); // RCS is fast puff

        const minSpeed = 50 * speedMult;
        const maxSpeed = (50 + config.throttle * 250) * speedMult;
        const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);

        this.velocities[i3] = config.dir.x * speed + (Math.random() - 0.5) * spread * speed;
        this.velocities[i3 + 1] = config.dir.y * speed + (Math.random() - 0.5) * spread * speed;
        this.velocities[i3 + 2] = config.dir.z * speed + (Math.random() - 0.5) * spread * speed;

        // Lifetime
        if (isRCS) {
            this.lifetimes[i] = 0.3 + Math.random() * 0.2; // Short life
        } else {
            this.lifetimes[i] = this.maxLifetime * (0.8 + Math.random() * 0.4);
        }

        // Initial Color and Size - MUCH larger particles for dense flame effect
        if (isRCS) {
            this.colors[i3] = 1.0;
            this.colors[i3 + 1] = 1.0;
            this.colors[i3 + 2] = 1.0;
            this.sizes[i] = 40 + Math.random() * 20; // Was 20-30, now 40-60
        } else if (isBlue) {
            this.colors[i3] = 0.2; // R
            this.colors[i3 + 1] = 0.8; // G
            this.colors[i3 + 2] = 1.0; // B
            this.sizes[i] = 200 + Math.random() * 100; // Was 100-150, now 200-300
        } else {
            this.colors[i3] = 1.0;
            this.colors[i3 + 1] = 1.0;
            this.colors[i3 + 2] = 0.9;
            this.sizes[i] = 150 + Math.random() * 100; // Was 80-120, now 150-250 for MUCH denser flames
        }
    }

    /**
     * Get the THREE.Points object for adding to scene
     */
    getParticles(): THREE.Points {
        return this.particles;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.particles.geometry.dispose();
        (this.particles.material as THREE.Material).dispose();
    }
}
