import * as THREE from 'three';
import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { TextureGenerator } from './TextureGenerator';
import { IconGenerator } from '../ui/IconGenerator';
import { OrbitRenderer } from './OrbitRenderer';
import { Rocket } from '../entities/Rocket';
import { RocketRenderer } from './RocketRenderer';
import { InputHandler } from './InputHandler';
import { Background } from './Background';
import { Debris } from '../entities/Debris';
import { Particle } from '../entities/Particle';
import { ThrustParticleSystem } from './ThrustParticleSystem';
import { ManeuverNode } from '../systems/ManeuverNode';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

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
    moonScale: number = 1.0; // No artificial scaling for moons

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

    // Debug
    showColliders: boolean = false;
    showCoG: boolean = false; // Show center of gravity marker
    debugCollisionBox: THREE.Line | null = null;
    debugCollisionCircle: THREE.Line | null = null;
    debugPlanetColliders: Map<Body, THREE.Line> = new Map();
    cogMarker: THREE.Group | null = null; // Center of gravity marker

    // Maneuver Nodes
    maneuverMeshes: Map<string, THREE.Group> = new Map();
    ghostNodeMesh: THREE.Object3D | null = null;
    maneuverIconTexture: THREE.Texture | null = null;

    // Rocket mesh
    rocketMesh: THREE.Group | null = null;
    lastRocketMeshVersion: number = -1;
    rocketFlameMesh: THREE.Mesh | null = null;
    velocityIndicator: THREE.Group | null = null;
    currentRocket: Rocket | null = null;
    isRocketResting: boolean = false; // Track if rocket is resting on surface

    // Trajectory line


    // Background
    stars: THREE.Points | null = null;

    // Zoom Icons
    bodyIcons: Map<Body, THREE.Mesh> = new Map();
    rocketIcon: THREE.Group | null = null;

    // Helpers
    private orbitRenderer: OrbitRenderer;
    public inputHandler: InputHandler;
    private thrustParticleSystem: ThrustParticleSystem;

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

        // Initialize thrust particle system
        this.thrustParticleSystem = new ThrustParticleSystem();
        this.scene.add(this.thrustParticleSystem.getParticles());

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
        // Use Three.js camera projection for accurate coordinates
        const center = this.getCenter();

        // Convert world position to Three.js scene coordinates
        const sceneX = (pos.x - center.x) * this.scale;
        const sceneY = (pos.y - center.y) * this.scale;

        // Use Three.js projection
        const vector = new THREE.Vector3(sceneX, sceneY, 0);
        vector.project(this.camera);

        // Convert NDC (-1 to 1) to screen coordinates
        const width = this.width || this.renderer.domElement.clientWidth;
        const height = this.height || this.renderer.domElement.clientHeight;

        const screenX = (vector.x + 1) * width / 2;
        const screenY = (-vector.y + 1) * height / 2; // Invert Y

        return new Vector2(screenX, screenY);
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

    screenToWorld(screenPos: Vector2): Vector2 {
        const center = this.getCenter();
        const width = this.width;
        const height = this.height;

        // 1. Convert Screen(Pixels) to NDC
        const ndcX = (screenPos.x / width) * 2 - 1;
        const ndcY = -(screenPos.y / height) * 2 + 1;

        // 2. Map NDC to Scene coordinates (orthographic)
        // For orthographic camera: NDC [-1,1] maps linearly to [camera.left, camera.right]
        const frustumWidth = this.camera.right - this.camera.left;
        const frustumHeight = this.camera.top - this.camera.bottom;
        const sceneX = ndcX * frustumWidth / 2;
        const sceneY = ndcY * frustumHeight / 2;

        // 3. Convert Scene(Units) to World(Meters)
        return new Vector2(
            sceneX / this.scale + center.x,
            sceneY / this.scale + center.y
        );
    }

    render(bodies: Body[], particles: Particle[] = [], _time: number = 0, deltaTime: number = 0.016) {
        this.currentBodies = bodies;

        // Update thrust particles
        if (this.currentRocket) {
            const throttle = this.currentRocket.controls.getThrottle();
            const r = this.currentRocket.rotation;
            const emitters: Array<{ pos: THREE.Vector3; dir: THREE.Vector3; throttle: number; type?: string }> = [];

            if (this.currentRocket.partStack && this.currentRocket.partStack.length > 0) {
                const parts = this.currentRocket.partStack;
                // Calculate center offset (must match RocketRenderer logic)
                let centerOffsetY = 0;
                let centerOffsetX = 0;

                if (this.currentRocket.centerOfMass) {
                    centerOffsetY = this.currentRocket.centerOfMass.y;
                    centerOffsetX = this.currentRocket.centerOfMass.x;
                } else {
                    const minY = Math.min(...parts.map((p) => (p.position?.y || 0) - p.definition.height / 2));
                    const maxY = Math.max(...parts.map((p) => (p.position?.y || 0) + p.definition.height / 2));
                    centerOffsetY = (maxY + minY) / 2;
                }

                parts.forEach(part => {
                    const isEngine = part.definition.type === 'engine';
                    const isRCS = part.definition.type === 'rcs';

                    if (isEngine || (isRCS && part.active)) {
                        const h = part.definition.height;

                        // Part center relative to rocket center (CoM) - in meters
                        const px = (part.position?.x || 0) - centerOffsetX;
                        const py = (part.position?.y || 0) - centerOffsetY;

                        // Part Rotation
                        const pr = part.rotation || 0;

                        // Nozzle Offset (Local to Part) - Bottom of part, or Center for RCS - in meters
                        const curNozzleX = 0;
                        const curNozzleY = isRCS ? 0 : -h / 2;

                        // Rotate Nozzle Offset by Part Rotation
                        const sinPr = Math.sin(pr);
                        const cosPr = Math.cos(pr);
                        const nozzleRotX = curNozzleX * cosPr - curNozzleY * sinPr;
                        const nozzleRotY = curNozzleX * sinPr + curNozzleY * cosPr;

                        // Total Local Position (Part Center + Nozzle Offset) (Rocket Local Frame, unrotated) - in meters
                        const localX = px + nozzleRotX;
                        const localY = py + nozzleRotY;

                        // CRITICAL: Apply visualScale to match the rocket mesh scaling
                        // The rocket mesh is scaled by visualScale, so local positions must be too
                        const scaledLocalX = localX * this.visualScale;
                        const scaledLocalY = localY * this.visualScale;

                        // Rotate by Rocket Rotation to get World Offset
                        // Rocket Body Angle (Up) is PI/2 in physics, but Sprite Up is Y+.
                        // The mesh rotation applied is `rotation - PI/2`.
                        const rocketRot = this.currentRocket!.rotation - Math.PI / 2;
                        const sinRr = Math.sin(rocketRot);
                        const cosRr = Math.cos(rocketRot);

                        const worldOffsetX = scaledLocalX * cosRr - scaledLocalY * sinRr;
                        const worldOffsetY = scaledLocalX * sinRr + scaledLocalY * cosRr;

                        const worldPos = new THREE.Vector3(
                            this.currentRocket!.body.position.x + worldOffsetX,
                            this.currentRocket!.body.position.y + worldOffsetY,
                            0
                        );

                        // Particle Direction: Down (0, -1) in Part Frame
                        // Rotate by Part Rotation
                        const dirX = 0 * cosPr - (-1) * sinPr; // 0 - (-1)*sin = sin
                        const dirY = 0 * sinPr + (-1) * cosPr; // -cos

                        // Rotate by Rocket Rotation
                        const worldDirX = dirX * cosRr - dirY * sinRr;
                        const worldDirY = dirX * sinRr + dirY * cosRr;

                        let currentPartThrottle = 0;
                        let type = 'standard';

                        if (isEngine) {
                            currentPartThrottle = throttle; // Use the throttle from the rocket controls
                            type = part.definition.effect || 'standard';
                        } else { // isRCS
                            currentPartThrottle = 1.0; // RCS is binary
                            type = 'rcs';
                        }

                        if (currentPartThrottle > 0) {
                            emitters.push({
                                pos: worldPos,
                                dir: new THREE.Vector3(worldDirX, worldDirY, 0),
                                throttle: currentPartThrottle,
                                type: type
                            });
                        }
                    }
                });
            } else {
                // Fallback for default simple rocket
                const nozzleOffset = RocketRenderer.getNozzlePosition(this.currentRocket);
                const dist = Math.abs(nozzleOffset) * this.visualScale;
                const nozzlePos = new THREE.Vector3(
                    this.currentRocket.body.position.x - Math.cos(r) * dist,
                    this.currentRocket.body.position.y - Math.sin(r) * dist,
                    0
                );
                const dir = new THREE.Vector3(-Math.cos(r), -Math.sin(r), 0);

                emitters.push({
                    pos: nozzlePos,
                    dir: dir,
                    throttle: throttle,
                    type: 'standard'
                });
            }

            this.thrustParticleSystem.update(deltaTime, emitters);
        }

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
        this.orbitRenderer.renderOrbits(bodies, center, this.showOrbits, this.showTrajectory);

        // Render bodies
        bodies.forEach(body => {
            // Skip rocket's physics body (we render it separately)
            if (this.currentRocket && body === this.currentRocket.body) {
                return;
            }

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

            // Render debug collision zone if enabled
            if (this.showColliders) {
                let colliderMesh = this.debugPlanetColliders.get(body);
                if (!colliderMesh) {
                    // Create collision circle at unit size (will be scaled)
                    const segments = 2048; // Increased from 128 to match planet precision (8192)
                    const geometry = new THREE.BufferGeometry();
                    const vertices = [];

                    for (let i = 0; i <= segments; i++) {
                        const angle = (i / segments) * Math.PI * 2;
                        vertices.push(
                            Math.cos(angle),
                            Math.sin(angle),
                            0
                        );
                    }

                    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
                    const material = new THREE.LineBasicMaterial({ color: 0x00FF00, linewidth: 2 });
                    colliderMesh = new THREE.Line(geometry, material);
                    this.scene.add(colliderMesh);
                    this.debugPlanetColliders.set(body, colliderMesh);
                }

                // Update position
                colliderMesh.position.set(worldX, worldY, 0.5); // z=0.5 slightly in front

                // Scale to match collision radius
                // Collision detection uses: body.radius * VISUAL_SCALE (3.0) in world space
                // We need to convert to screen space: * this.scale
                const collisionRadiusWorld = body.radius * 3.0; // VISUAL_SCALE from CollisionManager
                const collisionRadiusScreen = collisionRadiusWorld * this.scale;
                colliderMesh.scale.set(collisionRadiusScreen, collisionRadiusScreen, 1);
                colliderMesh.visible = true;
            } else {
                const colliderMesh = this.debugPlanetColliders.get(body);
                if (colliderMesh) {
                    colliderMesh.visible = false;
                }
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

        // Update ThrustParticleSystem uniforms/transform
        this.thrustParticleSystem.updateGeometry(center, this.scale);

        // Render rocket if present
        if (this.currentRocket) {
            this.renderRocket(this.currentRocket, center);
        }

        // Update Zoom Icons (Planets/Rocket)
        this.updateZoomIcons(center);

        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Update icons for bodies and rocket when zoomed out
     */
    updateZoomIcons(center: Vector2) {
        // Calculate pixels per world unit
        const frustumSize = 1000 / this.scale * 1e-9;
        const pixelsPerUnit = this.height / frustumSize;

        // 1. Update Body Icons
        this.currentBodies.forEach(body => {
            let icon = this.bodyIcons.get(body);
            if (!icon) {
                // Create icon (Circle)
                const geometry = new THREE.CircleGeometry(1, 32);
                const material = new THREE.MeshBasicMaterial({ color: body.color });
                icon = new THREE.Mesh(geometry, material);
                this.scene.add(icon);
                this.bodyIcons.set(body, icon);
            }

            // Calculate radius in World Units
            const radiusWorldUnits = body.radius * this.scale * this.visualScale;

            // Convert to Pixels
            const radiusPixels = radiusWorldUnits * pixelsPerUnit;

            // Threshold: if radius < 1 pixel, show icon
            if (radiusPixels < 1) {
                icon.visible = true;
                const worldX = (body.position.x - center.x) * this.scale;
                const worldY = (body.position.y - center.y) * this.scale;
                icon.position.set(worldX, worldY, 5); // z=5 to be on top of planets

                // Fixed size: 2 pixels radius (4px diameter)
                const scale = 2 / pixelsPerUnit;
                icon.scale.set(scale, scale, 1);
            } else {
                icon.visible = false;
            }
        });

        // 2. Update Rocket Icon
        if (this.currentRocket) {
            if (!this.rocketIcon) {
                // Create sprite material with icon from IconGenerator
                const iconCanvas = IconGenerator.createRocketIcon(128, '#ffffff');
                const texture = new THREE.CanvasTexture(iconCanvas);
                const material = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true,
                });
                const sprite = new THREE.Sprite(material);

                this.rocketIcon = new THREE.Group();
                this.rocketIcon.add(sprite);
                this.scene.add(this.rocketIcon);
            }

            // Rocket height in World Units
            const rocketHeight = 8; // approx meters
            const heightWorldUnits = rocketHeight * this.scale * this.visualScale;

            // Convert to Pixels
            const heightPixels = heightWorldUnits * pixelsPerUnit;

            // Increased threshold to 50px for easier node placement
            if (heightPixels < 50) { // Assuming screenDistPixels was a typo and meant heightPixels
                this.rocketIcon.visible = true;
                const worldX = (this.currentRocket.body.position.x - center.x) * this.scale;
                const worldY = (this.currentRocket.body.position.y - center.y) * this.scale;
                this.rocketIcon.position.set(worldX, worldY, 6); // z=6 on top of body icons

                // Fixed size: 8 pixels radius (increased from 3 for better visibility)
                const scale = 8 / pixelsPerUnit;
                this.rocketIcon.scale.set(scale, scale, 1);
            } else {
                this.rocketIcon.visible = false;
            }
        }
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

        // Update rocket position - use EXACT physics position, no offset
        const worldX = (rocket.body.position.x - center.x) * this.scale;
        const worldY = (rocket.body.position.y - center.y) * this.scale;
        this.rocketMesh.position.set(worldX, worldY, 1); // z=1 to be in front of planets

        // Update rocket rotation
        // The rocket is drawn pointing UP (Y+) by default, but rotation=0 in physics means RIGHT (X+)
        // So we need to subtract PI/2 to align visual with physics
        this.rocketMesh.rotation.z = rocket.rotation - Math.PI / 2;

        // Update rocket scale based on zoom
        // Rocket is ~15m tall, scale it properly relative to world scale
        const rocketScale = this.scale * this.visualScale;
        this.rocketMesh.scale.set(rocketScale, rocketScale, 1);

        // Update thrust flame - DEPRECATED (Replaced by particles)
        if (this.rocketFlameMesh) {
            this.rocketMesh.remove(this.rocketFlameMesh);
            this.rocketFlameMesh = null;
        }

        // Old flame logic removed
        /*
        const throttle = rocket.controls.getThrottle();
        if (throttle > 0 && rocket.engine.hasFuel()) {
            this.rocketFlameMesh = RocketRenderer.createThrustFlame(rocket, throttle);
            if (this.rocketFlameMesh) {
                this.rocketMesh.add(this.rocketFlameMesh);
            }
        }
        */

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

        // Render center of gravity marker if enabled
        if (this.showCoG) {
            if (!this.cogMarker) {
                this.cogMarker = RocketRenderer.createCoGMarker();
                this.scene.add(this.cogMarker);
            }

            // Position at rocket's center of mass (in world coordinates)
            // The rocket mesh is positioned at the body position (which is the CoM in physics)
            // But visually, the mesh is centered around the CoM
            // So we need to offset the CoG marker based on the rocket's centerOfMass offset

            // If rocket has a calculated CoM, use it
            if (rocket.centerOfMass) {
                // The rocket mesh is already centered on the CoM
                // So we just need to position the marker at the mesh center
                this.cogMarker.position.copy(this.rocketMesh.position);

                // NOTE: The centerOfMass is in local rocket coordinates
                // Since the mesh is built with CoM at (0,0), the marker goes at mesh origin
                this.cogMarker.position.z = 3; // On top of rocket and velocity indicator
            } else {
                // Fallback: position at rocket body position
                this.cogMarker.position.copy(this.rocketMesh.position);
                this.cogMarker.position.z = 3;
            }

            // Match rocket rotation
            this.cogMarker.rotation.z = rocket.rotation - Math.PI / 2;

            // Scale based on zoom
            const cogScale = this.scale * this.visualScale;
            this.cogMarker.scale.set(cogScale, cogScale, 1);
            this.cogMarker.visible = true;
        } else if (this.cogMarker) {
            this.cogMarker.visible = false;
        }

        // Render debug collision box if enabled
        if (this.showColliders) {
            if (!this.debugCollisionBox) {
                // Create debug collision box
                const width = rocket.width;
                const height = rocket.getTotalHeight();

                const geometry = new THREE.BufferGeometry();
                const vertices = new Float32Array([
                    -width / 2, -height / 2, 0,
                    width / 2, -height / 2, 0,
                    width / 2, height / 2, 0,
                    -width / 2, height / 2, 0,
                    -width / 2, -height / 2, 0
                ]);

                geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                const material = new THREE.LineBasicMaterial({ color: 0x00FF00 });
                this.debugCollisionBox = new THREE.Line(geometry, material);
                this.scene.add(this.debugCollisionBox);
            }

            // Update debug box position and rotation to match rocket visual position
            this.debugCollisionBox.position.copy(this.rocketMesh.position);
            this.debugCollisionBox.rotation.z = rocket.rotation - Math.PI / 2;
            this.debugCollisionBox.scale.set(rocketScale, rocketScale, 1);
            this.debugCollisionBox.visible = true;
        } else if (this.debugCollisionBox) {
            this.debugCollisionBox.visible = false;
        }

        // Render debug collision circle if enabled
        if (this.showColliders) {
            if (!this.debugCollisionCircle) {
                // Create debug collision circle
                const radius = rocket.body.radius; // Physics radius
                const segments = 64;
                const geometry = new THREE.BufferGeometry();
                const vertices = [];

                for (let i = 0; i <= segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle) * radius,
                        Math.sin(angle) * radius,
                        0
                    );
                }

                geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
                const material = new THREE.LineBasicMaterial({ color: 0xFFFF00, linewidth: 2 }); // Yellow
                this.debugCollisionCircle = new THREE.Line(geometry, material);
                this.scene.add(this.debugCollisionCircle);
            }

            // Update debug circle position
            this.debugCollisionCircle.position.copy(this.rocketMesh.position);
            // Circle is rotation invariant, but let's rotate it with rocket just in case we add features
            this.debugCollisionCircle.rotation.z = rocket.rotation - Math.PI / 2;

            // Scale
            this.debugCollisionCircle.scale.set(rocketScale, rocketScale, 1);
            this.debugCollisionCircle.visible = true;
        }
    }

    // Trajectory line
    trajectoryLine: Line2 | null = null;
    maneuverTrajectoryLines: Line2[] = []; // Separate lines for maneuver prediction
    showTrajectory: boolean = false;

    /**
     * Update the trajectory line
     */
    updateTrajectory(points: Vector2[], center: Vector2) {
        if (!this.showTrajectory || points.length < 2) {
            if (this.trajectoryLine) {
                this.scene.remove(this.trajectoryLine);
                // Dispose geometry/material
                if (this.trajectoryLine.geometry) this.trajectoryLine.geometry.dispose();
                if (this.trajectoryLine.material) (this.trajectoryLine.material as LineMaterial).dispose();
                this.trajectoryLine = null;
            }
            return;
        }

        const positions: number[] = [];

        for (let i = 0; i < points.length; i++) {
            const x = (points[i].x - center.x) * this.scale;
            const y = (points[i].y - center.y) * this.scale;
            positions.push(x, y, 0);
        }

        if (!this.trajectoryLine) {
            const geometry = new LineGeometry();
            geometry.setPositions(positions);

            const material = new LineMaterial({
                color: 0x00FF00,
                opacity: 0.5,
                transparent: true,
                linewidth: 3, // 3px width
                worldUnits: false,
                resolution: new THREE.Vector2(this.width, this.height),
                dashed: false
            });

            this.trajectoryLine = new Line2(geometry, material);
            this.trajectoryLine.computeLineDistances();
            this.trajectoryLine.position.z = 0; // Render below maneuver lines
            this.scene.add(this.trajectoryLine);
        } else {
            this.trajectoryLine.geometry.setPositions(positions);
            this.trajectoryLine.computeLineDistances();
            (this.trajectoryLine.material as LineMaterial).resolution.set(this.width, this.height);
        }
    }

    /**
     * Update maneuver trajectory with multiple colored segments
     */
    updateManeuverTrajectory(segments: Vector2[][], colors: string[]) {
        // Clear old maneuver trajectory lines (but keep trajectoryLine which is the current orbit)
        this.maneuverTrajectoryLines.forEach(line => {
            this.scene.remove(line);
            if (line.geometry) line.geometry.dispose();
            if (line.material) {
                if (Array.isArray(line.material)) {
                    line.material.forEach(m => m.dispose());
                } else {
                    line.material.dispose();
                }
            }
        });
        this.maneuverTrajectoryLines = [];

        if (!this.showTrajectory) {
            return;
        }

        // Render each segment with its own color
        segments.forEach((points, index) => {
            if (points.length < 2) return;

            const center = this.getCenter();
            const positions: number[] = [];

            for (let i = 0; i < points.length; i++) {
                const x = (points[i].x - center.x) * this.scale;
                const y = (points[i].y - center.y) * this.scale;
                positions.push(x, y, 0);
            }

            const geometry = new LineGeometry();
            geometry.setPositions(positions);

            const color = colors[index] === '#00ffff' ? 0x00ffff : 0xff8800;
            const material = new LineMaterial({
                color: color,
                linewidth: 3, // 3px width
                worldUnits: false, // Use screen pixels, not world units
                resolution: new THREE.Vector2(this.width, this.height),
                dashed: false,
            });

            const line = new Line2(geometry, material);
            line.computeLineDistances();
            line.position.z = 0.1; // Render above current orbit (green)
            this.scene.add(line);

            // Store in maneuverTrajectoryLines instead of trajectoryLine
            this.maneuverTrajectoryLines.push(line);
        });
    }

    /**
     * Update maneuver node visuals
     */
    updateManeuverNodes(nodes: ManeuverNode[], hoverPos: Vector2 | null, hoveredNodeId: string | null = null, selectedNodeId: string | null = null) {
        // Initialize texture if needed
        if (!this.maneuverIconTexture) {
            this.maneuverIconTexture = TextureGenerator.createManeuverIcon();
        }

        // Calculate pixel-to-unit ratio using actual camera frustum
        // camera.top is half the frustum height
        const frustumHeight = (this.camera.top - this.camera.bottom);
        const pixelToUnit = frustumHeight / (this.height || 1);

        // 1. Handle Ghost Node (Hover)
        if (hoverPos) {
            if (!this.ghostNodeMesh) {
                const material = new THREE.SpriteMaterial({
                    map: this.maneuverIconTexture,
                    color: 0xff0000,
                    opacity: 0.5,
                    transparent: true,
                    depthTest: false
                });
                this.ghostNodeMesh = new THREE.Sprite(material);
                this.ghostNodeMesh.renderOrder = 999;
                this.scene.add(this.ghostNodeMesh);
            }

            // Position ghost node
            const center = this.getCenter();
            this.ghostNodeMesh.position.set(
                (hoverPos.x - center.x) * this.scale,
                (hoverPos.y - center.y) * this.scale,
                0.2
            );

            // Scale: 20px fixed size
            const scale = 20 * pixelToUnit;
            this.ghostNodeMesh.scale.set(scale, scale, 1);
            this.ghostNodeMesh.visible = true;
        } else if (this.ghostNodeMesh) {
            this.ghostNodeMesh.visible = false;
        }

        // 2. Handle Existing Nodes
        // Remove old meshes
        this.maneuverMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            // Dispose geometry/material
            mesh.traverse((child) => {
                if (child instanceof THREE.Sprite) {
                    child.material.dispose();
                } else if (child instanceof THREE.Mesh) { // For the new ring
                    child.geometry.dispose();
                    (child.material as THREE.Material).dispose();
                }
            });
        });
        this.maneuverMeshes.clear(); // Clear the map

        if (!this.currentRocket) return;

        nodes.forEach(node => {
            let mesh = this.maneuverMeshes.get(node.id);

            // Force recreate if it's an old mesh type (doesn't have icon sprite)
            if (mesh && !mesh.getObjectByName('icon')) {
                this.scene.remove(mesh);
                this.maneuverMeshes.delete(node.id);
                mesh = undefined;
            }

            if (!mesh) {
                mesh = new THREE.Group();

                // Icon Sprite
                const material = new THREE.SpriteMaterial({
                    map: this.maneuverIconTexture!,
                    color: 0x4a9eff, // Blue (will be updated below)
                    transparent: true,
                    opacity: 1.0,
                    depthTest: false
                });
                const sprite = new THREE.Sprite(material);
                sprite.name = 'icon';
                mesh.add(sprite);

                // Arrow for Delta-V
                const arrowGeom = new THREE.BufferGeometry();
                const arrowMat = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
                const arrow = new THREE.Line(arrowGeom, arrowMat);
                arrow.name = 'arrow';
                mesh.add(arrow);

                this.scene.add(mesh);
                this.maneuverMeshes.set(node.id, mesh);
            }

            // Update position
            const worldPos = node.getWorldPosition(this.currentRocket!, this.currentBodies);
            const screenX = (worldPos.x - this.getCenter().x) * this.scale;
            const screenY = (worldPos.y - this.getCenter().y) * this.scale;
            mesh.position.set(screenX, screenY, 6); // z=6 (top)

            // Reset scale of group to 1 (in case it was modified)
            mesh.scale.set(1, 1, 1);

            // Update scale and color based on hover/selection
            const isHovered = node.id === hoveredNodeId;
            const isSelected = node.id === selectedNodeId;
            const baseSize = (isHovered || isSelected) ? 30 : 20;
            const size = baseSize * pixelToUnit;

            const sprite = mesh.getObjectByName('icon') as THREE.Sprite;
            if (sprite) {
                sprite.scale.set(size, size, 1);
                // Update color: white if selected, cyan if hovered, blue otherwise
                if (isSelected) {
                    (sprite.material as THREE.SpriteMaterial).color.setHex(0xffffff);
                } else if (isHovered) {
                    (sprite.material as THREE.SpriteMaterial).color.setHex(0x00ffff);
                } else {
                    (sprite.material as THREE.SpriteMaterial).color.setHex(0x4a9eff);
                }
            }

            // Add/update ring for hovered or selected nodes
            let ring = mesh.getObjectByName('ring') as THREE.Mesh;
            if (isHovered || isSelected) {
                if (!ring) {
                    const ringGeometry = new THREE.RingGeometry(0.4, 0.5, 32);
                    const ringMaterial = new THREE.MeshBasicMaterial({
                        color: 0xffffff,
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 0.8,
                        depthTest: false
                    });
                    ring = new THREE.Mesh(ringGeometry, ringMaterial);
                    ring.name = 'ring';
                    mesh.add(ring);
                }
                ring.visible = true;
                // Update ring color and scale
                const ringScale = size * 1.3;
                ring.scale.set(ringScale, ringScale, 1);
                (ring.material as THREE.MeshBasicMaterial).color.setHex(isSelected ? 0xffffff : 0x00ffff);
            } else if (ring) {
                ring.visible = false;
            }

            // Update Arrow
            const arrow = mesh.getObjectByName('arrow') as THREE.Line;
            if (arrow && node.getTotalΔv() > 0.1) {
                const dvAngle = node.getΔvDirection(this.currentRocket!, this.currentBodies);
                // Arrow length proportional to dv, but clamped for visuals
                // In screen pixels: min 15, max 60
                const dvMag = node.getTotalΔv();
                const pixelLength = Math.min(60, Math.max(15, dvMag));

                // Convert pixels to units
                const length = pixelLength * pixelToUnit;

                // Local coordinates (relative to mesh position)
                const endX = Math.cos(dvAngle) * length;
                const endY = Math.sin(dvAngle) * length;

                const points = [
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(endX, endY, 0),
                    // Arrowhead
                    new THREE.Vector3(endX - Math.cos(dvAngle - 0.5) * length * 0.2, endY - Math.sin(dvAngle - 0.5) * length * 0.2, 0),
                    new THREE.Vector3(endX, endY, 0),
                    new THREE.Vector3(endX - Math.cos(dvAngle + 0.5) * length * 0.2, endY - Math.sin(dvAngle + 0.5) * length * 0.2, 0)
                ];
                arrow.geometry.setFromPoints(points);
                arrow.visible = true;
            } else if (arrow) {
                arrow.visible = false;
            }
        });
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

        // Dispose debug collision box
        if (this.debugCollisionBox) {
            if (this.debugCollisionBox.geometry) this.debugCollisionBox.geometry.dispose();
            if (this.debugCollisionBox.material) {
                if (Array.isArray(this.debugCollisionBox.material)) {
                    this.debugCollisionBox.material.forEach(m => m.dispose());
                } else {
                    this.debugCollisionBox.material.dispose();
                }
            }
            this.scene.remove(this.debugCollisionBox);
            this.debugCollisionBox = null;
        }

        // Dispose debug collision circle
        if (this.debugCollisionCircle) {
            if (this.debugCollisionCircle.geometry) this.debugCollisionCircle.geometry.dispose();
            if (this.debugCollisionCircle.material) {
                if (Array.isArray(this.debugCollisionCircle.material)) {
                    this.debugCollisionCircle.material.forEach(m => m.dispose());
                } else {
                    this.debugCollisionCircle.material.dispose();
                }
            }
            this.scene.remove(this.debugCollisionCircle);
            this.debugCollisionCircle = null;
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

    /**
     * Auto-zoom to fit a body or the rocket on screen
     * The object will take up about 80% of the screen height
     */
    autoZoomToBody(body: Body | null) {
        if (!body) return;

        // Determine the size of the object
        let objectSize: number;

        // Check if it's the rocket
        if (this.currentRocket && body === this.currentRocket.body) {
            // Rocket height is about 8 meters, but we want to show more context
            // Use 10x the rocket size so it appears smaller with surrounding space
            objectSize = 80;
        } else {
            // For celestial bodies, use visual radius * 2 (diameter) * visualScale
            objectSize = body.radius * 2 * this.visualScale;
        }

        // We want the object to take up targetFraction of screen height
        const targetFraction = 0.8; // 80% of screen

        // Calculate required scale
        const newScale = Math.sqrt(targetFraction * 1e-6 / objectSize);

        // Apply new scale
        this.scale = newScale;

        console.log(`Auto-zoom: object size=${objectSize.toFixed(2)}m, new scale=${newScale.toExponential(2)}`);
    }
}
