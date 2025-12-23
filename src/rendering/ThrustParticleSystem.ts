import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator';

/**
 * ThrustParticleSystem - Particle-based rocket thrust effect
 */
export class ThrustParticleSystem {
    private particles: THREE.Points;
    private particleCount: number = 10000; // Balanced for performance vs visual quality
    private physicsPositions: Float64Array;
    private velocities: Float32Array;
    private lifetimes: Float32Array;
    private sizes: Float32Array;
    private colors: Float32Array;
    private types: Int8Array; // 0=Standard, 1=Blue, 2=RCS
    private maxLifetime: number = 0.8; // Short flame for realistic proportions
    private emissionRate: number = 5000; // Reduced for focused emission
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
                    const rcsLife = 0.15; // RCS specific short life
                    const t = 1 - (this.lifetimes[i] / rcsLife);
                    const alpha = Math.max(0, 1 - t * 1.5); // Fade
                    this.colors[i3] = alpha;
                    this.colors[i3 + 1] = alpha;
                    this.colors[i3 + 2] = alpha;
                    this.sizes[i] = 0.3 + t * 0.3; // 0.3m → 0.6m expansion
                }
                // Blue Flame Logic
                else if (type === 1) {
                    const flameDuration = 0.3; // Shorter for 0.8s lifetime
                    if (age < flameDuration) {
                        const t = age / flameDuration;
                        this.colors[i3] = 0.2 + t * 0.1;
                        this.colors[i3 + 1] = 0.8 - t * 0.4;
                        this.colors[i3 + 2] = 1.0;
                        this.sizes[i] = 0.8 + t * 0.5; // 0.8m → 1.3m
                    } else {
                        // Fading phase (no smoke for short lifetime)
                        const t = (age - flameDuration) / (this.maxLifetime - flameDuration);
                        const intensity = 1.0 - t;
                        this.colors[i3] = 0.2 * intensity;
                        this.colors[i3 + 1] = 0.5 * intensity;
                        this.colors[i3 + 2] = 1.0 * intensity;
                        this.sizes[i] = 1.3 + t * 0.7; // 1.3m → 2.0m
                    }
                }
                // Standard Flame Logic - bright core to fading
                else {
                    const flameDuration = 0.4; // Flame is most of lifetime
                    if (age < flameDuration) {
                        const t = age / flameDuration;
                        // Bright white/yellow core → orange → red
                        this.colors[i3] = 1.0;
                        this.colors[i3 + 1] = 1.0 - t * 0.7;
                        this.colors[i3 + 2] = (1.0 - t) * 0.5;
                        this.sizes[i] = 0.5 + t * 0.8; // 0.5m → 1.3m
                    } else {
                        // Fading red/orange tail
                        const t = (age - flameDuration) / (this.maxLifetime - flameDuration);
                        const fade = 1.0 - t;
                        this.colors[i3] = fade * 0.8; // Dim red
                        this.colors[i3 + 1] = fade * 0.3;
                        this.colors[i3 + 2] = 0;
                        this.sizes[i] = 1.3 + t * 1.0; // 1.3m → 2.3m
                    }
                }
            }
        }
    }

    /**
     * Update geometry buffers with transformed positions for rendering
     * @param center Camera center in world coordinates
     * @param scale World-to-scene scale factor
     */
    updateGeometry(center: { x: number, y: number }, scale: number) {
        const geometry = this.particles.geometry as THREE.BufferGeometry;
        const renderPositions = geometry.attributes.position.array as Float32Array;
        const sizes = geometry.attributes.size.array as Float32Array;

        // Calculate a visibility factor: how many pixels does 1 meter become?
        // At scale 1e-9 (viewing solar system), 1m = 1e-9 scene units = basically invisible
        // At scale 1e-3 (zoomed in on rocket), 1m = 1e-3 scene units = visible
        // The "screen density" tells us pixels per meter at current zoom
        // We use a base reference: screen height is about 800 pixels for reasonable viewing
        const screenHeight = 800; // Reference screen size
        const metersVisibleAtZoom = 1 / scale; // At scale 1e-3, we see 1000m on screen
        const pixelsPerMeter = screenHeight / metersVisibleAtZoom; // pixels per meter

        for (let i = 0; i < this.particleCount; i++) {
            if (this.lifetimes[i] > 0) {
                const i3 = i * 3;
                // Transform physics position to scene position
                const x = (this.physicsPositions[i3] - center.x) * scale;
                const y = (this.physicsPositions[i3 + 1] - center.y) * scale;

                renderPositions[i3] = x;
                renderPositions[i3 + 1] = y;
                renderPositions[i3 + 2] = 2; // Z=2 in front

                // Size in meters → size in pixels
                const sizeInMeters = this.sizes[i];
                let pixelSize = sizeInMeters * pixelsPerMeter;

                // Clamp to reasonable bounds
                // Min 4px so we can see something, max 100px so it doesn't get crazy
                pixelSize = Math.max(4, Math.min(pixelSize, 100));
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
     * Emit a new particle using Ring Buffer with proper cone emission
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

        // Cone emission parameters (angles in radians)
        const coneAngle = isRCS ? 0.5 : (isBlue ? 0.14 : 0.26); // ~30°, ~8°, ~15°
        const nozzleRadius = isRCS ? 0.2 : (isBlue ? 0.8 : 0.5); // meters

        // Position: slight random offset within nozzle radius
        this.physicsPositions[i3] = config.pos.x + (Math.random() - 0.5) * nozzleRadius;
        this.physicsPositions[i3 + 1] = config.pos.y + (Math.random() - 0.5) * nozzleRadius;
        this.physicsPositions[i3 + 2] = config.pos.z;

        // Cone emission: generate random direction within cone
        // Use uniform distribution in cone (angle proportional to sqrt of random)
        const theta = coneAngle * Math.sqrt(Math.random()); // angle from center
        const phi = Math.random() * 2 * Math.PI; // rotation around axis

        // Create perpendicular vectors to dir for cone rotation
        const dir = config.dir;
        let perpX, perpY;
        if (Math.abs(dir.x) < 0.9) {
            // Use cross product with X axis
            perpX = 0; perpY = -dir.z;
            const perpZ = dir.y;
            const perpLen = Math.sqrt(perpY * perpY + perpZ * perpZ);
            perpY /= perpLen;
        } else {
            // Use cross product with Y axis
            perpX = dir.z; perpY = 0;
            const perpLen = Math.abs(perpX);
            perpX /= perpLen;
        }

        // Apply cone deviation
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);

        // Simplified cone direction (approximation)
        const coneX = dir.x * cosTheta + sinTheta * (cosPhi * perpX - sinPhi * dir.y);
        const coneY = dir.y * cosTheta + sinTheta * (cosPhi * perpY + sinPhi * dir.x);

        // Speed in m/s - much more realistic for rocket exhaust visible at close range
        const speedMult = isRCS ? 2.0 : (isBlue ? 1.2 : 1.0);
        const minSpeed = 15 * speedMult;
        const maxSpeed = (25 + config.throttle * 40) * speedMult; // 15-65 m/s
        const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);

        this.velocities[i3] = coneX * speed;
        this.velocities[i3 + 1] = coneY * speed;
        this.velocities[i3 + 2] = 0; // Keep in XY plane for now

        // Lifetime - shorter for tight flames
        if (isRCS) {
            this.lifetimes[i] = 0.15 + Math.random() * 0.1; // Very short puff
        } else {
            this.lifetimes[i] = this.maxLifetime * (0.7 + Math.random() * 0.3);
        }

        // Initial Size in METERS (real world scale)
        // A rocket flame particle is about 0.3-1.5m across
        if (isRCS) {
            this.colors[i3] = 1.0;
            this.colors[i3 + 1] = 1.0;
            this.colors[i3 + 2] = 1.0;
            this.sizes[i] = 0.3 + Math.random() * 0.2; // 0.3-0.5m
        } else if (isBlue) {
            this.colors[i3] = 0.2;
            this.colors[i3 + 1] = 0.8;
            this.colors[i3 + 2] = 1.0;
            this.sizes[i] = 0.8 + Math.random() * 0.5; // 0.8-1.3m
        } else {
            this.colors[i3] = 1.0;
            this.colors[i3 + 1] = 1.0;
            this.colors[i3 + 2] = 0.9;
            this.sizes[i] = 0.5 + Math.random() * 0.5; // 0.5-1.0m
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
