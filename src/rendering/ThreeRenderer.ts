import * as THREE from 'three';
import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { TextureGenerator } from './TextureGenerator';
import { OrbitRenderer } from './OrbitRenderer';
import { Rocket } from '../entities/Rocket';
import { RocketRenderer } from './RocketRenderer';
import { InputHandler } from './InputHandler';
import { Background } from './Background';
import { Debris } from '../entities/Debris';
import { Particle } from '../entities/Particle';

/**
 * ThreeRenderer - Main rendering engine using Three.js
 * Simplified after extracting texture generation, orbit rendering, input handling, and background
 */
export class ThreeRenderer {
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;

    // Properties for compatibility with UI
    canvas: HTMLCanvasElement;
    width: number = 0;
    height: number = 0;

    // Camera control
    scale: number = 1e-9; // Meters to pixels
    offset: Vector2 = new Vector2(0, 0);
    followedBody: Body | null = null;

    // Visual scale multiplier for planet sizes (makes them more visible)
    visualScale: number = 3.0;
    // Specific scale for moons to ensure they are not inside the planet visually
    moonScale: number = 10.0;

    // Display options
    showOrbits: boolean = true;

    // Store bodies for selection
    currentBodies: Body[] = [];

    // Body meshes map
    bodyMeshes: Map<Body, THREE.Mesh> = new Map();
    ringMeshes: Map<Body, THREE.Mesh> = new Map();
    cloudMeshes: Map<Body, THREE.Mesh> = new Map();
    debrisMeshes: Map<Body, THREE.Group> = new Map();
    particleMeshes: Map<Particle, THREE.Mesh> = new Map();

    // Rocket mesh

    // Rocket mesh

    // Rocket mesh
    rocketMesh: THREE.Group | null = null;
    lastRocketMeshVersion: number = -1;
    rocketFlameMesh: THREE.Mesh | null = null;
    velocityIndicator: THREE.Group | null = null;
    currentRocket: Rocket | null = null;

    // Trajectory line
    trajectoryLine: THREE.Line | null = null;
    showTrajectory: boolean = false;

    // Background
    stars: THREE.Points | null = null;

    // Helpers
    private orbitRenderer: OrbitRenderer;
    private inputHandler: InputHandler;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Scene setup
        this.scene = new THREE.Scene();

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Camera setup (orthographic for 2D view)
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 1000;
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            10000
        );
        this.camera.position.z = 1000;

        // Initialize orbit renderer
        this.orbitRenderer = new OrbitRenderer(this.scene, this.scale, this.moonScale);

        // Create background
        this.createBackground();

        // Input handlers
        this.inputHandler = new InputHandler(this, canvas);

        // Handle window resize
        window.addEventListener('resize', () => {
            this.resize(window.innerWidth, window.innerHeight);
        });
    }

    createBackground() {
        this.stars = Background.createStarfield();
        this.scene.add(this.stars);
        this.scene.background = new THREE.Color(0x000814);
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.renderer.setSize(width, height);

        const aspect = width / height;
        const frustumSize = 1000;
        this.camera.left = frustumSize * aspect / -2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / -2;
        this.camera.updateProjectionMatrix();
    }

    getCenter(): Vector2 {
        if (this.followedBody) {
            return this.getVisualPosition(this.followedBody);
        }
        return this.offset;
    }

    worldToScreen(pos: Vector2): Vector2 {
        const center = this.getCenter();
        const width = this.renderer.domElement.width;
        const height = this.renderer.domElement.height;
        return new Vector2(
            (pos.x - center.x) * this.scale + width / 2,
            (pos.y - center.y) * this.scale + height / 2
        );
    }

    getVisualPosition(body: Body): Vector2 {
        // For moons, we apply moonScale to their position relative to parent
        if (body.type === 'moon' && body.parent) {
            const relX = body.position.x - body.parent.position.x;
            const relY = body.position.y - body.parent.position.y;
            return new Vector2(
                body.parent.position.x + relX * this.moonScale,
                body.parent.position.y + relY * this.moonScale
            );
        }
        return body.position;
    }

    screenToWorld(pos: Vector2): Vector2 {
        const center = this.getCenter();
        const width = this.renderer.domElement.width;
        const height = this.renderer.domElement.height;
        return new Vector2(
            (pos.x - width / 2) / this.scale + center.x,
            (pos.y - height / 2) / this.scale + center.y
        );
    }

    render(bodies: Body[], particles: Particle[] = [], _time: number = 0) {
        this.currentBodies = bodies;

        // Update camera position
        if (this.followedBody) {
            this.offset = this.getVisualPosition(this.followedBody);
        }

        const center = this.getCenter();
        // Use floating origin: camera is always at (0,0) relative to the scene content
        // This avoids floating point precision issues when zooming in on far-away objects
        this.camera.position.x = 0;
        this.camera.position.y = 0;

        // Update camera zoom
        const frustumSize = 1000 / this.scale * 1e-9;
        const aspect = window.innerWidth / window.innerHeight;
        this.camera.left = frustumSize * aspect / -2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / -2;
        this.camera.updateProjectionMatrix();

        // Update orbit renderer scale
        this.orbitRenderer.updateScale(this.scale, this.moonScale);

        // Render orbits using OrbitRenderer
        this.orbitRenderer.renderOrbits(bodies, center, this.showOrbits);

        // Render bodies
        bodies.forEach(body => {
            // Handle Debris
            if (body instanceof Debris) {
                let mesh = this.debrisMeshes.get(body);
                if (!mesh) {
                    mesh = RocketRenderer.createDebrisMesh(body);
                    this.scene.add(mesh);
                    this.debrisMeshes.set(body, mesh);
                }

                // Update position and rotation
                // const visualPos = this.getVisualPosition(body); // Unused
                // const screenPos = this.worldToScreen(visualPos); // Unused

                // We need to use the same coordinate system as planets
                // worldX = (body.position.x - center.x) * this.scale
                const worldX = (body.position.x - center.x) * this.scale;
                const worldY = (body.position.y - center.y) * this.scale;

                mesh.position.set(worldX, worldY, 1); // z=1 same as rocket
                mesh.rotation.z = body.rotation - Math.PI / 2; // Match rocket rotation convention

                // Scale
                const debrisScale = this.scale * this.visualScale;
                mesh.scale.set(debrisScale, debrisScale, 1);

                return;
            }

            let mesh = this.bodyMeshes.get(body);

            if (!mesh) {
                // Create new mesh for this body
                const radius = body.radius * this.scale * this.visualScale;
                const geometry = new THREE.CircleGeometry(radius, 8192);

                // Create texture using TextureGenerator
                const texture = TextureGenerator.createPlanetTexture(body);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true
                });

                mesh = new THREE.Mesh(geometry, material);

                // Add glow effect for sun and planets with atmospheres
                if (body.name === 'Sun' || body.atmosphereColor) {
                    const glowGeometry = new THREE.CircleGeometry(radius * 1.3, 4096);
                    const glowMaterial = new THREE.MeshBasicMaterial({
                        color: body.name === 'Sun' ? 0xffaa00 : TextureGenerator.parseColor(body.atmosphereColor || body.color),
                        transparent: true,
                        opacity: 0.3
                    });
                    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
                    glowMesh.position.z = -1; // Behind the planet
                    mesh.add(glowMesh);
                }

                this.scene.add(mesh);
                this.bodyMeshes.set(body, mesh);

                // Add rings for Saturn and Uranus
                if (body.ringColor && body.ringInnerRadius && body.ringOuterRadius) {
                    const ringGeometry = new THREE.RingGeometry(
                        body.ringInnerRadius * this.scale * this.visualScale,
                        body.ringOuterRadius * this.scale * this.visualScale,
                        512
                    );

                    const ringTexture = TextureGenerator.createRingTexture(body);
                    const ringMaterial = new THREE.MeshBasicMaterial({
                        map: ringTexture,
                        transparent: true,
                        opacity: 0.8,
                        side: THREE.DoubleSide
                    });

                    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);

                    // Tilt the rings using scaling to simulate perspective in 2D
                    if (body.name === 'Saturn') {
                        ringMesh.scale.y = 0.4; // Tilt effect
                        ringMesh.rotation.z = 0.1; // Slight angle
                    } else if (body.name === 'Uranus') {
                        ringMesh.scale.y = 0.8; // Less tilt
                        ringMesh.rotation.z = 1.5; // Vertical rings
                    }

                    ringMesh.position.z = -0.5; // Slightly behind planet
                    mesh.add(ringMesh);
                    this.ringMeshes.set(body, ringMesh);
                }

                // Add clouds for Earth and Venus
                if (body.name === 'Earth' || body.name === 'Venus') {
                    const cloudGeometry = new THREE.CircleGeometry(radius * 1.15, 6144); // Match atmosphere size
                    const cloudTexture = TextureGenerator.createCloudTexture(body);
                    const cloudMaterial = new THREE.MeshBasicMaterial({
                        map: cloudTexture,
                        transparent: true,
                        opacity: 0.8
                    });
                    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
                    cloudMesh.position.z = 0.1; // Slightly in front
                    mesh.add(cloudMesh);
                    this.cloudMeshes.set(body, cloudMesh);
                }
            }

            // Update mesh position and scale
            // Apply visual scale to moon positions relative to parent
            let worldX, worldY;
            if (body.type === 'moon' && body.parent) {
                const relX = body.position.x - body.parent.position.x;
                const relY = body.position.y - body.parent.position.y;
                // Apply floating origin offset
                worldX = (body.parent.position.x + relX * this.moonScale - center.x) * this.scale;
                worldY = (body.parent.position.y + relY * this.moonScale - center.y) * this.scale;
            } else {
                worldX = (body.position.x - center.x) * this.scale;
                worldY = (body.position.y - center.y) * this.scale;
            }

            mesh.position.set(worldX, worldY, 0);

            // Update size based on zoom
            const radius = body.radius * this.scale * this.visualScale;
            const baseRadius = (mesh.geometry as THREE.CircleGeometry).parameters.radius;
            const scaleFactor = radius / baseRadius;
            mesh.scale.set(scaleFactor, scaleFactor, 1);

            // Update ring size if present
            const ringMesh = this.ringMeshes.get(body);
            if (ringMesh && body.ringInnerRadius && body.ringOuterRadius) {
                const innerRadius = body.ringInnerRadius * this.scale * this.visualScale;
                const baseInnerRadius = (ringMesh.geometry as THREE.RingGeometry).parameters.innerRadius;
                const ringScaleFactor = innerRadius / baseInnerRadius;

                // Maintain the tilt aspect ratio while scaling
                ringMesh.scale.set(
                    ringScaleFactor,
                    ringScaleFactor * (body.name === 'Saturn' ? 0.4 : (body.name === 'Uranus' ? 0.8 : 1)),
                    1
                );
            }

            // Update cloud animation if present
            const cloudMesh = this.cloudMeshes.get(body);
            if (cloudMesh) {
                // Cloud mesh is a child of the planet mesh, so it inherits scale automatically.
                // We only need to handle animation.
                const rotationSpeed = body.name === 'Venus' ? 0.00005 : 0.0001;
                cloudMesh.rotation.z = _time * rotationSpeed;
            }

            // Update texture if zoom changed significantly
            if (Math.abs(scaleFactor - 1) > 0.1) {
                const texture = TextureGenerator.createPlanetTexture(body);
                (mesh.material as THREE.MeshBasicMaterial).map = texture;
                (mesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
            }
        });

        // Render particles
        // First, remove meshes for dead particles
        this.particleMeshes.forEach((mesh, particle) => {
            if (!particles.includes(particle)) {
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) (mesh.material as THREE.Material).dispose();
                this.scene.remove(mesh);
                this.particleMeshes.delete(particle);
            }
        });

        // Create/Update meshes for active particles
        particles.forEach(p => {
            let mesh = this.particleMeshes.get(p);
            if (!mesh) {
                const geometry = new THREE.CircleGeometry(0.5, 8);
                const material = new THREE.MeshBasicMaterial({
                    color: p.color,
                    transparent: true,
                    opacity: 1
                });
                mesh = new THREE.Mesh(geometry, material);
                this.scene.add(mesh);
                this.particleMeshes.set(p, mesh);
            }

            // Update position
            const worldX = (p.position.x - center.x) * this.scale;
            const worldY = (p.position.y - center.y) * this.scale;
            mesh.position.set(worldX, worldY, 2); // z=2 (on top of everything)

            // Update scale
            const scale = p.size * this.scale * this.visualScale;
            mesh.scale.set(scale, scale, 1);

            // Update opacity
            (mesh.material as THREE.MeshBasicMaterial).opacity = p.getOpacity();
        });

        // Render rocket if present
        if (this.currentRocket) {
            this.renderRocket(this.currentRocket, center);
        }

        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Render the rocket
     */
    renderRocket(rocket: Rocket, center: Vector2) {
        // Create or update rocket mesh
        if (!this.rocketMesh || rocket.meshVersion !== this.lastRocketMeshVersion) {
            if (this.rocketMesh) {
                // Dispose old mesh
                this.rocketMesh.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(m => m.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
                this.scene.remove(this.rocketMesh);
                this.rocketFlameMesh = null; // Flame is child of rocket mesh
            }

            this.rocketMesh = RocketRenderer.createRocketMesh(rocket);
            this.scene.add(this.rocketMesh);
            this.lastRocketMeshVersion = rocket.meshVersion;
        }

        // Update rocket position
        // NOTE: Rocket mesh is centered vertically, but physics uses center as reference
        // We need to offset DOWN by half-height so the BASE is at the surface
        const halfHeight = rocket.getTotalHeight() / 2;

        // Calculate angle from planet center for proper vertical offset
        let offsetX = 0;
        let offsetY = -halfHeight; // Default offset (down)

        // If rocket has a parent (resting on surface), calculate radial offset
        if (rocket.body.parent) {
            const direction = rocket.body.position.sub(rocket.body.parent.position).normalize();
            // Direction points FROM planet TO rocket (outward)
            // We want to offset TOWARD planet (inward), so NO negative sign
            offsetX = direction.x * halfHeight;
            offsetY = direction.y * halfHeight;
        }

        const worldX = (rocket.body.position.x - offsetX - center.x) * this.scale;
        const worldY = (rocket.body.position.y - offsetY - center.y) * this.scale;
        this.rocketMesh.position.set(worldX, worldY, 1); // z=1 to be in front of planets

        // Update rocket rotation
        // The rocket is drawn pointing UP (Y+) by default, but rotation=0 in physics means RIGHT (X+)
        // So we need to subtract PI/2 to align visual with physics
        this.rocketMesh.rotation.z = rocket.rotation - Math.PI / 2;

        // Update rocket scale based on zoom
        // Rocket is ~15m tall, scale it properly relative to world scale
        const rocketScale = this.scale * this.visualScale;
        this.rocketMesh.scale.set(rocketScale, rocketScale, 1);

        // Update thrust flame
        if (this.rocketFlameMesh) {
            this.rocketMesh.remove(this.rocketFlameMesh);
            this.rocketFlameMesh = null;
        }

        const throttle = rocket.controls.getThrottle();
        if (throttle > 0 && rocket.engine.hasFuel()) {
            this.rocketFlameMesh = RocketRenderer.createThrustFlame(rocket, throttle);
            if (this.rocketFlameMesh) {
                this.rocketMesh.add(this.rocketFlameMesh);
            }
        }

        // Update velocity indicator (only show if trajectory is enabled)
        if (!this.velocityIndicator) {
            this.velocityIndicator = RocketRenderer.createVelocityIndicator();
            this.scene.add(this.velocityIndicator);
        }

        // Only show velocity indicator when trajectory is enabled
        if (this.showTrajectory) {
            // Position at rocket center
            this.velocityIndicator.position.copy(this.rocketMesh.position);
            this.velocityIndicator.position.z = 2; // On top of rocket

            // Rotate to match velocity
            // Velocity is relative to parent for orbit, but for local direction we want absolute velocity?
            // Or relative to nearest body?
            // Usually prograde vector is relative to orbital velocity.
            // Let's use velocity relative to parent if exists, else absolute.
            let vel = rocket.body.velocity;
            if (rocket.body.parent) {
                vel = rocket.body.velocity.sub(rocket.body.parent.velocity);
            }

            if (vel.mag() > 1) { // Only show if moving
                const angle = Math.atan2(vel.y, vel.x) - Math.PI / 2; // -PI/2 because arrow points up (Y+)
                this.velocityIndicator.rotation.z = angle;
                this.velocityIndicator.visible = true;

                // Scale based on zoom so it stays visible
                const scale = this.scale * this.visualScale;
                this.velocityIndicator.scale.set(scale, scale, 1);
            } else {
                this.velocityIndicator.visible = false;
            }
        } else {
            // Hide velocity indicator when trajectory is disabled
            this.velocityIndicator.visible = false;
        }
    }

    updateTrajectory(points: Vector2[], center: Vector2) {
        if (!this.showTrajectory) {
            if (this.trajectoryLine) {
                this.scene.remove(this.trajectoryLine);
                this.trajectoryLine = null;
            }
            return;
        }

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(points.length * 3);

        for (let i = 0; i < points.length; i++) {
            const x = (points[i].x - center.x) * this.scale;
            const y = (points[i].y - center.y) * this.scale;
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = 0; // z=0 (behind rocket)
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        if (!this.trajectoryLine) {
            const material = new THREE.LineBasicMaterial({ color: 0x00FF00, opacity: 0.5, transparent: true });
            this.trajectoryLine = new THREE.Line(geometry, material);
            this.scene.add(this.trajectoryLine);
        } else {
            this.trajectoryLine.geometry.dispose();
            this.trajectoryLine.geometry = geometry;
        }
    }

    public selectBodyAt(screenPos: Vector2): Body | null {
        let closest: Body | null = null;
        let minDist = Infinity;

        this.currentBodies.forEach(body => {
            // Use visual position (accounting for moonScale)
            const visualPos = this.getVisualPosition(body);
            const pos = this.worldToScreen(visualPos);
            const dist = pos.distanceTo(screenPos);
            const radius = Math.max(10, body.radius * this.scale * this.visualScale);

            if (dist < radius && dist < minDist) {
                minDist = dist;
                closest = body;
            }
        });

        return closest;
    }

    /**
     * Clean up Three.js resources
     */
    dispose() {
        // Dispose all body meshes and their children
        this.bodyMeshes.forEach(mesh => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    (mesh.material as THREE.MeshBasicMaterial).map?.dispose();
                    mesh.material.dispose();
                }
            }
            // Dispose children (glow effects)
            mesh.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            this.scene.remove(mesh);
        });
        this.bodyMeshes.clear();

        // Dispose ring meshes
        this.ringMeshes.forEach(mesh => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    (mesh.material as THREE.MeshBasicMaterial).map?.dispose();
                    mesh.material.dispose();
                }
            }
        });
        this.ringMeshes.clear();

        // Dispose cloud meshes
        this.cloudMeshes.forEach(mesh => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    (mesh.material as THREE.MeshBasicMaterial).map?.dispose();
                    mesh.material.dispose();
                }
            }
        });
        this.cloudMeshes.clear();

        // Dispose debris meshes
        this.debrisMeshes.forEach(mesh => {
            mesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            this.scene.remove(mesh);
        });
        this.debrisMeshes.clear();

        // Dispose particle meshes
        this.particleMeshes.forEach(mesh => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) (mesh.material as THREE.Material).dispose();
            this.scene.remove(mesh);
        });
        this.particleMeshes.clear();

        // Dispose rocket mesh and its children
        if (this.rocketMesh) {
            this.rocketMesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            this.scene.remove(this.rocketMesh);
            this.rocketMesh = null;
        }

        // Dispose velocity indicator
        if (this.velocityIndicator) {
            this.velocityIndicator.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            this.scene.remove(this.velocityIndicator);
            this.velocityIndicator = null;
        }

        // Dispose trajectory line
        if (this.trajectoryLine) {
            if (this.trajectoryLine.geometry) this.trajectoryLine.geometry.dispose();
            if (this.trajectoryLine.material) {
                if (Array.isArray(this.trajectoryLine.material)) {
                    this.trajectoryLine.material.forEach(m => m.dispose());
                } else {
                    this.trajectoryLine.material.dispose();
                }
            }
            this.scene.remove(this.trajectoryLine);
            this.trajectoryLine = null;
        }

        // Dispose background stars
        if (this.stars) {
            if (this.stars.geometry) this.stars.geometry.dispose();
            if (this.stars.material) {
                if (Array.isArray(this.stars.material)) {
                    this.stars.material.forEach(m => m.dispose());
                } else {
                    this.stars.material.dispose();
                }
            }
            this.scene.remove(this.stars);
            this.stars = null;
        }

        // Dispose orbit renderer
        if (this.orbitRenderer && typeof (this.orbitRenderer as any).dispose === 'function') {
            (this.orbitRenderer as any).dispose();
        }

        // Dispose input handler (removes event listeners)
        if (this.inputHandler && typeof (this.inputHandler as any).dispose === 'function') {
            (this.inputHandler as any).dispose();
        }

        // Dispose WebGL renderer
        this.renderer.dispose();

        console.log('ThreeRenderer disposed');
    }
}
