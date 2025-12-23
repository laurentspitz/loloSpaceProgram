import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { TextureGenerator } from './TextureGenerator';
import { IconGenerator } from '../ui/IconGenerator';
import { OrbitRenderer } from './OrbitRenderer';
import { SOIRenderer } from './SOIRenderer';
import { Rocket } from '../entities/Rocket';
import { RocketRenderer } from './RocketRenderer';
import { InputHandler } from './InputHandler';
import { Background } from './Background';
import { Debris } from '../entities/Debris';
import { Particle } from '../entities/Particle';
import { ThrustParticleSystem } from './ThrustParticleSystem';
import { ManeuverNode } from '../systems/ManeuverNode';
import { findFeature, type CloudFeature, type RingFeature } from '../systems/CelestialBodyFeatures';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { GasGiantMaterial } from './GasGiantMaterial';

/**
 * ThreeRenderer - Main rendering engine using Three.js
 * Simplified after extracting texture generation, orbit rendering, input handling, and background
 */
export class ThreeRenderer {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;

    // 3D Camera controls
    orbitControls: OrbitControls | null = null;

    // Lighting
    sunLight: THREE.PointLight | null = null;
    ambientLight: THREE.AmbientLight | null = null;

    // Properties for compatibility with UI
    canvas: HTMLCanvasElement;
    width: number = 0;
    height: number = 0;

    // Camera control
    scale: number = 1e-9; // Meters to pixels
    offset: Vector2 = new Vector2(0, 0);
    followedBody: Body | null = null;

    // Visual scale multiplier for planet sizes (makes them more visible)
    visualScale: number = 1.0; // No visual scaling - physics = rendering
    // Specific scale for moons to ensure they are not inside the planet visually
    moonScale: number = 1.0; // No artificial scaling for moons

    // Display options
    showOrbits: boolean = true;

    // Store bodies for selection
    currentBodies: Body[] = [];

    // Body meshes map
    bodyMeshes: Map<Body, THREE.Mesh> = new Map();
    ringMeshes: Map<Body, THREE.Group> = new Map();
    cloudMeshes: Map<Body, THREE.Mesh> = new Map();
    atmosphereCloudMeshes: Map<Body, THREE.Mesh> = new Map();
    debrisMeshes: Map<Body, THREE.Group> = new Map();
    particleMeshes: Map<Particle, THREE.Mesh> = new Map();
    // Gas giant spots for animation
    gasGiantSpots: Map<Body, THREE.Mesh> = new Map();

    // Debug
    showColliders: boolean = false;
    showCoG: boolean = false; // Show center of gravity marker
    debugCollisionBox: THREE.Line | null = null;
    debugCollisionCircle: THREE.Line | null = null;
    debugPlanetColliders: Map<Body, THREE.Line> = new Map();
    debrisColliderMeshes: Map<Body, THREE.Line> = new Map();
    debugFloorLine: THREE.Line | null = null; // Local floor debug line
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
    stars: THREE.Group | null = null;

    // Zoom Icons
    bodyIcons: Map<Body, THREE.Mesh> = new Map();
    rocketIcon: THREE.Group | null = null;

    // Gas Giant LOD Materials
    private gasGiantMaterials: Map<Body, GasGiantMaterial> = new Map();
    private staticMaterials: Map<Body, THREE.MeshBasicMaterial> = new Map();

    // Mesh References for LOD
    private atmosphereHaloMeshes: Map<Body, THREE.Object3D> = new Map();
    private overlayMeshes: Map<Body, THREE.Mesh> = new Map();

    // Helpers
    private orbitRenderer: OrbitRenderer;
    private soiRenderer: SOIRenderer;
    public inputHandler: InputHandler;
    private thrustParticleSystem: ThrustParticleSystem;

    // SOI visualization - stores trajectory points for SOI rendering
    private lastTrajectoryPoints: Vector2[] = [];

    // Store maneuver trajectory segments for tooltip proximity detection
    private storedManeuverSegments: Vector2[][] = [];

    // Tooltip system for line identification
    private lineTooltip: HTMLDivElement | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Scene setup
        this.scene = new THREE.Scene();

        // Renderer setup with logarithmic depth buffer for extreme scale ranges
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false,
            logarithmicDepthBuffer: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // Cap pixel ratio at 1.5 for performance (prevents 2x or 3x rendering on retina displays)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        // Set linear color space to prevent sRGB double-correction that causes over-brightness
        this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
        // Disable tone mapping to keep original texture colors
        this.renderer.toneMapping = THREE.NoToneMapping;

        // Camera setup (perspective for 3D view)
        // With logarithmic depth buffer, we can use very small near clip
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 1, 1e15);
        // Start camera far from origin looking at center
        this.camera.position.set(0, 0, 1e9); // 1 billion meters out

        // Initialize OrbitControls for 3D camera rotation
        this.orbitControls = new OrbitControls(this.camera, canvas);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.1;
        this.orbitControls.minDistance = 100; // Very close allowed
        this.orbitControls.maxDistance = 1e13; // 10 trillion meters maximum (beyond Pluto)
        this.orbitControls.enablePan = true;
        this.orbitControls.screenSpacePanning = true; // Pan parallel to screen

        // Add lighting for 3D
        this.sunLight = new THREE.PointLight(0xffffff, 2, 0, 0); // intensity 2, no decay
        this.sunLight.position.set(0, 0, 0); // Will be updated to Sun's position
        this.scene.add(this.sunLight);

        this.ambientLight = new THREE.AmbientLight(0x404040, 0.3); // Dim ambient for shadow areas
        this.scene.add(this.ambientLight);

        // Initialize orbit renderer
        this.orbitRenderer = new OrbitRenderer(this.scene, this.scale, this.moonScale);

        // Initialize SOI renderer
        this.soiRenderer = new SOIRenderer(this.scene);

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

        // Create tooltip element for line hover
        this.lineTooltip = document.createElement('div');
        this.lineTooltip.style.position = 'fixed';
        this.lineTooltip.style.backgroundColor = 'rgba(20, 20, 30, 0.95)';
        this.lineTooltip.style.border = '1px solid #444';
        this.lineTooltip.style.padding = '8px 12px';
        this.lineTooltip.style.borderRadius = '4px';
        this.lineTooltip.style.color = '#fff';
        this.lineTooltip.style.fontFamily = 'monospace';
        this.lineTooltip.style.fontSize = '12px';
        this.lineTooltip.style.pointerEvents = 'none';
        this.lineTooltip.style.zIndex = '1000';
        this.lineTooltip.style.display = 'none';
        this.lineTooltip.style.boxShadow = '0 4px 8px rgba(0,0,0,0.5)';
        document.body.appendChild(this.lineTooltip);

        // Track mouse position for trajectory hover detection
        canvas.addEventListener('mousemove', (e) => {
            this.updateLineTooltip(e.clientX, e.clientY);
        });

        canvas.addEventListener('mouseleave', () => {
            if (this.lineTooltip) {
                this.lineTooltip.style.display = 'none';
            }
        });
    }

    createBackground() {
        // Use static background texture (unaffected by camera zoom/rotation)
        this.scene.background = Background.createBackgroundTexture();
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.renderer.setSize(width, height);

        // Update perspective camera aspect ratio
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    resetCamera() {
        this.followedBody = null;
        this.scale = 1e-9;
        this.offset = new Vector2(0, 0);
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

    /**
     * Update line tooltip based on mouse position
     * Uses screen-space proximity detection (more reliable than raycasting with Line2)
     */
    private updateLineTooltip(mouseX: number, mouseY: number): void {
        if (!this.lineTooltip) return;

        const rect = this.canvas.getBoundingClientRect();
        const screenX = mouseX - rect.left;
        const screenY = mouseY - rect.top;

        type LineType = 'orbit' | 'trajectory' | 'preManeuver' | 'postManeuver' | 'soi' | 'futureSoi';
        let closestHit: { type: LineType, name?: string, distance: number, color?: string } | null = null;

        const HOVER_THRESHOLD = 20; // pixels - slightly larger for easier detection

        // Helper: Check distance to a set of world points
        const checkPointsProximity = (points: Vector2[], type: LineType, name?: string, color?: string) => {
            for (const point of points) {
                const screenPos = this.worldToScreen(point);
                const dx = screenPos.x - screenX;
                const dy = screenPos.y - screenY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < HOVER_THRESHOLD && (!closestHit || dist < closestHit.distance)) {
                    closestHit = { type, name, distance: dist, color };
                }
            }
        };

        // Check current trajectory points (cyan analytical orbit)
        if (this.lastTrajectoryPoints.length > 0 && this.trajectoryLine?.visible) {
            checkPointsProximity(this.lastTrajectoryPoints, 'trajectory', 'Current Orbit', '#00ffff');
        }

        // Check maneuver trajectory segments - first is pre-burn (cyan), rest are post-burn (orange)
        if (this.storedManeuverSegments && this.showTrajectory) {
            this.storedManeuverSegments.forEach((segment, index) => {
                if (index === 0) {
                    // First segment is pre-maneuver trajectory (cyan)
                    checkPointsProximity(segment, 'preManeuver', 'Pre-Maneuver Path', '#00ffff');
                } else {
                    // Subsequent segments are post-maneuver (orange)
                    checkPointsProximity(segment, 'postManeuver', `Post-Burn Segment ${index}`, '#ff8800');
                }
            });
        }

        // Check SOI circles - get from soiRenderer
        const soiInfo = this.soiRenderer.getVisibleSOIs();
        for (const soi of soiInfo) {
            // Check distance to SOI boundary
            const soiCenter = this.worldToScreen(soi.bodyPosition);
            // Convert world radius to screen radius
            // For perspective camera, calculate visible height at Z=0 (orbital plane)
            const distToPlane = Math.abs(this.camera.position.z);
            const vFov = this.camera.fov * Math.PI / 180;
            const frustumHeight = 2 * distToPlane * Math.tan(vFov / 2);
            const pixelsPerUnit = this.height / frustumHeight;
            const soiRadiusScreen = soi.radius * this.scale * pixelsPerUnit;

            // Distance from mouse to the circle boundary
            const distToCenter = Math.sqrt(
                (soiCenter.x - screenX) ** 2 + (soiCenter.y - screenY) ** 2
            );
            const distToBoundary = Math.abs(distToCenter - soiRadiusScreen);

            if (distToBoundary < HOVER_THRESHOLD && (!closestHit || distToBoundary < closestHit.distance)) {
                closestHit = { type: 'soi', name: `${soi.bodyName} Sphere of Influence`, distance: distToBoundary, color: '#888888' };
            }
        }

        // Show or hide tooltip
        if (closestHit) {
            const color = closestHit.color || '#ffffff';
            let content = `<div style="color:${color}; font-weight:bold">${closestHit.name || closestHit.type}</div>`;

            // Add descriptive text based on type
            let description = '';
            switch (closestHit.type) {
                case 'trajectory':
                    description = 'Numerically predicted orbit path';
                    break;
                case 'preManeuver':
                    description = 'Trajectory before delta-v burn';
                    break;
                case 'postManeuver':
                    description = 'Trajectory after delta-v burn';
                    break;
                case 'soi':
                    description = 'Gravitational influence boundary';
                    break;
            }
            if (description) {
                content += `<div style="color:#aaa; font-size:10px">${description}</div>`;
            }

            this.lineTooltip.innerHTML = content;
            this.lineTooltip.style.display = 'block';
            this.lineTooltip.style.left = (mouseX + 15) + 'px';
            this.lineTooltip.style.top = (mouseY + 15) + 'px';
        } else {
            this.lineTooltip.style.display = 'none';
        }
    }

    screenToWorld(screenPos: Vector2): Vector2 {
        const center = this.getCenter();
        const width = this.width;
        const height = this.height;

        // 1. Convert Screen(Pixels) to NDC
        const ndcX = (screenPos.x / width) * 2 - 1;
        const ndcY = -(screenPos.y / height) * 2 + 1;

        // 2. For perspective camera, raycast to Z=0 plane
        // Create a ray from camera through the NDC point
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

        // Find intersection with Z=0 plane (the orbital plane)
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);

        if (intersection) {
            // 3. Convert Scene(Units) to World(Meters)
            return new Vector2(
                intersection.x / this.scale + center.x,
                intersection.y / this.scale + center.y
            );
        }

        // Fallback if ray doesn't intersect plane (shouldn't happen)
        return center.clone();
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
                // Calculate center offset (MUST match RocketRenderer logic - use geometric center, not CoM)
                // RocketRenderer uses geometric center for mesh positioning
                const positionsY = parts.map(p => p.position?.y || 0);
                const minY = Math.min(...positionsY.map((y, i) => y - parts[i].definition.height / 2));
                const maxY = Math.max(...positionsY.map((y, i) => y + parts[i].definition.height / 2));
                const centerOffsetY = (maxY + minY) / 2;

                // Calculate X center as well
                const positionsX = parts.map(p => p.position?.x || 0);
                const widths = parts.map(p => p.definition.width || 0);
                const minX = Math.min(...positionsX.map((x, i) => x - widths[i] / 2));
                const maxX = Math.max(...positionsX.map((x, i) => x + widths[i] / 2));
                const centerOffsetX = (maxX + minX) / 2;

                parts.forEach(part => {
                    const isEngine = part.definition.type === 'engine' || part.definition.type === 'booster';
                    const isRCS = part.definition.type === 'rcs';

                    // Only emit particles for ACTIVE parts (engines with part.active = true, or active RCS)
                    if ((isEngine && part.active) || (isRCS && part.active)) {
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
                            // If part is active (set by Rocket.update), emit at full throttle
                            // This respects both global throttle and manualEnabled
                            if (part.active && this.currentRocket!.engine.hasFuel()) {
                                currentPartThrottle = 1.0; // Full visual effect for active engine
                            } else {
                                currentPartThrottle = 0;
                            }
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

            this.thrustParticleSystem.update(deltaTime, emitters, this.scale);
        }

        // Update camera position
        if (this.followedBody) {
            this.offset = this.getVisualPosition(this.followedBody);
        }

        const center = this.getCenter();

        // For 3D: Update OrbitControls target to follow body
        if (this.orbitControls) {
            // Set the orbit target to the followed body's position (in scene coordinates)
            this.orbitControls.target.set(
                (center.x - this.offset.x) * this.scale,
                (center.y - this.offset.y) * this.scale,
                0
            );
            this.orbitControls.update();
        }

        // Update sun light position (light follows the Sun's position in scene coordinates)
        if (this.sunLight) {
            const sun = bodies.find(b => b.name === 'Sun');
            if (sun) {
                const sunX = (sun.position.x - center.x) * this.scale;
                const sunY = (sun.position.y - center.y) * this.scale;
                this.sunLight.position.set(sunX, sunY, 0);
            }
        }

        this.camera.updateProjectionMatrix();

        // Update orbit renderer scale
        this.orbitRenderer.updateScale(this.scale, this.moonScale);

        // Render orbits using OrbitRenderer
        this.orbitRenderer.renderOrbits(bodies, center, this.showOrbits, this.showTrajectory);

        // Garbage collection: Remove meshes for bodies that no longer exist (e.g. expired debris)
        // We need to check debrisMeshes and remove any whose body is not in the current bodies list
        if (this.debrisMeshes) {
            // Use Array.from to avoid modification during iteration issues if any
            Array.from(this.debrisMeshes.keys()).forEach(body => {
                if (!bodies.includes(body)) {
                    const mesh = this.debrisMeshes.get(body);
                    if (mesh) {
                        this.scene.remove(mesh);
                        // Also dispose geometry/material if possible to avoid leaks
                        // checking is done by GC mainly but explicit dispose is better in Three.js
                        // Keeping it simple for now as per project style
                    }
                    this.debrisMeshes.delete(body);
                }
            });
        }

        if (this.debrisColliderMeshes) {
            Array.from(this.debrisColliderMeshes.keys()).forEach(body => {
                if (!bodies.includes(body)) {
                    const mesh = this.debrisColliderMeshes!.get(body);
                    if (mesh) {
                        this.scene.remove(mesh);
                    }
                    this.debrisColliderMeshes!.delete(body);
                }
            });
        }

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

                // Debug: Show collision circle for debris
                if (this.showColliders) {
                    let debugCircle = this.debrisColliderMeshes?.get(body);

                    if (!debugCircle) {
                        // Create unit circle, will be scaled dynamically
                        const segments = 32;
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
                        const material = new THREE.LineBasicMaterial({ color: 0xFF00FF }); // Magenta
                        debugCircle = new THREE.Line(geometry, material);
                        this.scene.add(debugCircle);
                        this.debrisColliderMeshes.set(body, debugCircle);
                    }

                    debugCircle.position.set(worldX, worldY, 2); // z=2 in front
                    // Scale by debris radius (based on part width) and visualScale
                    const debrisCircleScale = this.scale * body.radius * this.visualScale;
                    debugCircle.scale.set(debrisCircleScale, debrisCircleScale, 1);
                    debugCircle.visible = true;
                }

                return;
            }

            let mesh = this.bodyMeshes.get(body);

            if (!mesh) {
                // Create new mesh for this body (3D sphere for proper lighting)
                const radius = body.radius * this.scale * this.visualScale;
                const geometry = new THREE.SphereGeometry(radius, 64, 32);

                let material: THREE.Material;

                if (body.type === 'gas_giant') {
                    // Use custom shader for gas giants
                    // Generate a seed from the name
                    let seed = 0;
                    for (let i = 0; i < body.name.length; i++) {
                        seed += body.name.charCodeAt(i);
                    }

                    // Custom color palettes for specific gas giants
                    let baseColor: THREE.Color;
                    let secondaryColor: THREE.Color;
                    let tertiaryColor: THREE.Color;

                    if (body.name === 'Jupiter') {
                        // Jupiter: Very light pastel palette
                        baseColor = new THREE.Color('#FFF8F0'); // Almost white cream
                        secondaryColor = new THREE.Color('#FFE4C4'); // Very light peach/bisque
                        tertiaryColor = new THREE.Color('#FFCDB2'); // Light salmon/peach
                    } else if (body.name === 'Saturn') {
                        // Saturn: Warm beige/cream tones (no blue!)
                        baseColor = new THREE.Color('#F5E6C8'); // Pale cream/beige
                        secondaryColor = new THREE.Color('#E8D4A8'); // Warm tan
                        tertiaryColor = new THREE.Color('#D4C4A0'); // Slightly darker cream (for poles)
                    } else {
                        // Procedural for others (Uranus, Neptune)
                        baseColor = new THREE.Color(body.color);
                        // Secondary: Darker, slightly less saturated
                        secondaryColor = baseColor.clone().offsetHSL(0.02, -0.1, -0.15);
                        // Tertiary: Lighter, more desaturated
                        tertiaryColor = baseColor.clone().offsetHSL(-0.01, -0.2, 0.2);
                    }

                    material = new GasGiantMaterial({
                        baseColor: baseColor,
                        secondaryColor: secondaryColor,
                        tertiaryColor: tertiaryColor,
                        seed: seed,
                        time: 0,
                        hasSpot: (body.name === 'Jupiter') // Enable spot for Jupiter
                    });
                    material.transparent = true;
                    this.gasGiantMaterials.set(body, material as GasGiantMaterial);

                    // Create Static Material (Low Detail)
                    const staticTexture = TextureGenerator.createPlanetTexture(body);
                    const staticMaterial = new THREE.MeshBasicMaterial({
                        map: staticTexture,
                        transparent: true
                    });
                    this.staticMaterials.set(body, staticMaterial);

                    // Default to static initially (will be updated in render loop)
                    material = staticMaterial;
                } else {
                    // Create texture using TextureGenerator for other bodies
                    const texture = TextureGenerator.createPlanetTexture(body);
                    // Use MeshStandardMaterial for proper 3D lighting (except Sun)
                    if (body.name === 'Sun') {
                        // Sun emits light, doesn't receive it
                        material = new THREE.MeshBasicMaterial({
                            map: texture,
                            transparent: true
                        });
                    } else {
                        material = new THREE.MeshStandardMaterial({
                            map: texture,
                            transparent: true,
                            roughness: 1.0,
                            metalness: 0.0
                        });
                    }
                }

                mesh = new THREE.Mesh(geometry, material);

                // Note: 3D spherical lighting overlay removed - real 3D lighting handles this now

                // Add atmosphere halo (using Sprite for automatic billboarding in 3D)
                if (body.atmosphereColor) {
                    const atmosScale = body.atmosphereRadiusScale || 1.25;
                    const atmosTexture = TextureGenerator.createAtmosphereHalo(
                        body.atmosphereColor,
                        body.atmosphereOpacity !== undefined ? body.atmosphereOpacity : 0.4
                    );

                    const atmosMaterial = new THREE.SpriteMaterial({
                        map: atmosTexture,
                        transparent: true,
                        depthWrite: false
                    });

                    const atmosSprite = new THREE.Sprite(atmosMaterial);
                    // Sprite scale is in world units, set to diameter * atmosScale
                    const atmosDiameter = radius * atmosScale * 2;
                    atmosSprite.scale.set(atmosDiameter, atmosDiameter, 1);
                    mesh.add(atmosSprite);
                    this.atmosphereHaloMeshes.set(body, atmosSprite);
                } else if (body.name === 'Sun') {
                    // Sun glow (legacy simple glow)
                    const glowGeometry = new THREE.CircleGeometry(radius * 1.3, 128);
                    const glowMaterial = new THREE.MeshBasicMaterial({
                        color: 0xffaa00,
                        transparent: true,
                        opacity: 0.3
                    });
                    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
                    glowMesh.position.z = -1;
                    mesh.add(glowMesh);
                }

                this.scene.add(mesh);
                this.bodyMeshes.set(body, mesh);

                // Add rings based on RingFeature - data-driven ring rendering
                const ringFeature = findFeature<RingFeature>(body.features, 'rings');
                if (ringFeature) {
                    // Create a group to hold ring(s)
                    const ringGroup = new THREE.Group();

                    // Get tilt parameters from feature data (with sensible defaults)
                    const scaleY = ringFeature.scaleY ?? 1;
                    const rotationZ = ringFeature.rotation ?? 0;
                    const use3DEffect = ringFeature.use3DEffect ?? false;

                    if (!use3DEffect) {
                        // Simple single ring (no 3D split)
                        const ringGeometry = new THREE.RingGeometry(
                            1.0 * ringFeature.innerRadius,
                            1.0 * ringFeature.outerRadius,
                            64,
                            8
                        );
                        const ringTexture = TextureGenerator.createRingTexture(body, ringFeature);
                        const ringMaterial = new THREE.MeshBasicMaterial({
                            map: ringTexture,
                            transparent: true,
                            opacity: ringFeature.opacity || 0.6,
                            side: THREE.DoubleSide,
                            depthWrite: false
                        });
                        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
                        ringMesh.scale.y = scaleY;
                        ringMesh.rotation.z = rotationZ;
                        ringMesh.position.z = 0;
                        ringMesh.name = 'ring';
                        ringGroup.add(ringMesh);
                    } else {
                        // 3D effect - create two half rings (front and back)
                        // The texture is masked with top/bottom halves
                        // For horizontal rings (Saturn): top appears above, bottom appears below
                        // For vertical rings (Uranus, rotation 90°): top appears left, bottom appears right
                        const backMask: 'top' | 'bottom' = 'top';    // Shows behind the planet
                        const frontMask: 'top' | 'bottom' = 'bottom'; // Shows in front of the planet

                        const backRingGeometry = new THREE.RingGeometry(
                            1.0 * ringFeature.innerRadius,
                            1.0 * ringFeature.outerRadius,
                            64,
                            8
                        );
                        const backRingTexture = TextureGenerator.createRingTexture(body, ringFeature, backMask);
                        const backRingMaterial = new THREE.MeshBasicMaterial({
                            map: backRingTexture,
                            transparent: true,
                            opacity: ringFeature.opacity || 0.8,
                            side: THREE.DoubleSide,
                            depthWrite: false
                        });
                        const backRingMesh = new THREE.Mesh(backRingGeometry, backRingMaterial);
                        backRingMesh.scale.y = scaleY;
                        backRingMesh.rotation.z = rotationZ;
                        backRingMesh.position.z = -1; // Behind the planet
                        backRingMesh.name = 'ringBack';
                        ringGroup.add(backRingMesh);

                        // Create FRONT ring (in front of the planet)
                        const frontRingGeometry = new THREE.RingGeometry(
                            1.0 * ringFeature.innerRadius,
                            1.0 * ringFeature.outerRadius,
                            64,
                            8
                        );
                        const frontRingTexture = TextureGenerator.createRingTexture(body, ringFeature, frontMask);
                        const frontRingMaterial = new THREE.MeshBasicMaterial({
                            map: frontRingTexture,
                            transparent: true,
                            opacity: ringFeature.opacity || 0.8,
                            side: THREE.DoubleSide,
                            depthWrite: false
                        });
                        const frontRingMesh = new THREE.Mesh(frontRingGeometry, frontRingMaterial);
                        frontRingMesh.scale.y = scaleY;
                        frontRingMesh.rotation.z = rotationZ;
                        frontRingMesh.position.z = 1; // In front of the planet
                        frontRingMesh.name = 'ringFront';
                        ringGroup.add(frontRingMesh);
                    }

                    // Add directly to scene
                    this.scene.add(ringGroup);
                    this.ringMeshes.set(body, ringGroup);
                }

                // Add clouds based on CloudFeature
                const cloudFeature = findFeature<CloudFeature>(body.features, 'clouds');
                if (cloudFeature) {
                    // Surface clouds - 3D sphere slightly larger than planet
                    if (cloudFeature.surfaceClouds) {
                        const cloudGeometry = new THREE.SphereGeometry(radius * 1.002, 64, 32);
                        const cloudTexture = TextureGenerator.createCloudTexture(body);
                        const cloudMaterial = new THREE.MeshBasicMaterial({
                            map: cloudTexture,
                            transparent: true,
                            opacity: cloudFeature.opacity || 0.8,
                            depthWrite: false
                        });
                        const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
                        mesh.add(cloudMesh);
                        this.cloudMeshes.set(body, cloudMesh);
                    }

                    // Atmospheric clouds - 3D sphere at atmosphere scale
                    if (cloudFeature.atmosphericClouds) {
                        const atmosScale = body.atmosphereRadiusScale || 1.15;
                        const atmosCloudGeometry = new THREE.SphereGeometry(radius * atmosScale, 64, 32);
                        const atmosCloudTexture = TextureGenerator.createAtmosphericCloudTexture(body, cloudFeature);
                        const atmosCloudMaterial = new THREE.MeshBasicMaterial({
                            map: atmosCloudTexture,
                            transparent: true,
                            opacity: (cloudFeature.opacity || 0.5) * 0.8,
                            depthWrite: false
                        });
                        const atmosCloudMesh = new THREE.Mesh(atmosCloudGeometry, atmosCloudMaterial);
                        mesh.add(atmosCloudMesh);
                        this.atmosphereCloudMeshes.set(body, atmosCloudMesh);
                    }
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

            // Update size based on zoom (3D sphere needs uniform scaling)
            const radius = body.radius * this.scale * this.visualScale;
            const baseRadius = (mesh.geometry as THREE.SphereGeometry).parameters.radius;
            const scaleFactor = radius / baseRadius;
            mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

            // Planet axial rotation (rotate around Y axis for 3D effect)
            // Different speeds for different planets (simplified, could use real rotation periods)
            if (body.type !== 'star') {
                const rotationSpeed = body.name === 'Venus' ? -0.00002 : 0.00005; // Venus rotates backwards
                mesh.rotation.y = _time * rotationSpeed;
            }

            // Update ring position and size (rings are now direct children of scene)
            const ringGroup = this.ringMeshes.get(body);
            if (ringGroup && ringGroup.children.length > 0) {
                // Position the ring at the planet's position
                ringGroup.position.set(worldX, worldY, 0);

                // Scale the ring based on planet radius
                const ringFeature = findFeature<RingFeature>(body.features, 'rings');
                if (ringFeature) {
                    // Get the base inner radius from geometry
                    const firstChild = ringGroup.children[0] as THREE.Mesh;
                    const geom = firstChild.geometry as THREE.RingGeometry;
                    const baseInnerRadius = geom.parameters.innerRadius;

                    // Calculate target inner radius in screen space
                    const targetInnerRadius = body.radius * ringFeature.innerRadius * this.scale * this.visualScale;
                    const ringScaleFactor = targetInnerRadius / baseInnerRadius;

                    // Get tilt factor from feature data
                    const tiltY = ringFeature.scaleY ?? 1;

                    // Scale all ring children
                    ringGroup.children.forEach(child => {
                        child.scale.set(ringScaleFactor, ringScaleFactor * tiltY, 1);
                    });
                }
            }

            // Update cloud animation if present
            const cloudMesh = this.cloudMeshes.get(body);
            if (cloudMesh) {
                // Cloud mesh is a child of the planet mesh, so it inherits scale automatically.
                // We only need to handle animation - slower for realistic look
                const rotationSpeed = body.name === 'Venus' ? 0.00001 : 0.00002;
                cloudMesh.rotation.z = _time * rotationSpeed;
            }

            // Update atmospheric cloud animation if present
            const atmosCloudMesh = this.atmosphereCloudMeshes.get(body);
            if (atmosCloudMesh) {
                const atmosRotationSpeed = body.name === 'Venus' ? 0.000006 : 0.000012;
                atmosCloudMesh.rotation.z = _time * atmosRotationSpeed;

                // Cloud LOD: Hide if too small
                const cloudScreenRadius = this.getScreenRadius(atmosCloudMesh);
                atmosCloudMesh.visible = cloudScreenRadius > 5;
            }

            // Surface Cloud LOD
            const surfaceCloudMesh = this.cloudMeshes.get(body);
            if (surfaceCloudMesh) {
                const cloudScreenRadius = this.getScreenRadius(surfaceCloudMesh);
                surfaceCloudMesh.visible = cloudScreenRadius > 5;
            }

            // Atmosphere Halo LOD
            const atmosHaloMesh = this.atmosphereHaloMeshes.get(body);
            if (atmosHaloMesh) {
                // Use the mesh's own radius (it's a plane, but getScreenRadius handles geometry radius)
                // Actually getScreenRadius expects CircleGeometry, but atmos is PlaneGeometry.
                // Let's use the body radius * atmosScale for calculation.
                const atmosScale = body.atmosphereRadiusScale || 1.25;
                // We can reuse the mesh's position for projection
                const screenRadius = this.getScreenRadius(mesh) * atmosScale;
                atmosHaloMesh.visible = screenRadius > 5;
            }

            // 3D Overlay LOD
            const overlayMesh = this.overlayMeshes.get(body);
            if (overlayMesh) {
                const screenRadius = this.getScreenRadius(mesh);
                overlayMesh.visible = screenRadius > 5;
            }

            // Update gas giant LOD and animation
            if (mesh.material instanceof GasGiantMaterial || this.gasGiantMaterials.has(body)) {
                // Robust screen size calculation
                const screenRadiusPixels = this.getScreenRadius(mesh);
                const LOD_THRESHOLD = 200; // Pixels radius

                // DEBUG: Log values for Jupiter
                if (body.name === 'Jupiter') {
                    // 
                }

                const shaderMat = this.gasGiantMaterials.get(body);
                const staticMat = this.staticMaterials.get(body);

                if (shaderMat && staticMat) {
                    if (screenRadiusPixels > LOD_THRESHOLD) {
                        // High Detail
                        if (mesh.material !== shaderMat) {
                            mesh.material = shaderMat;
                            mesh.material.needsUpdate = true;
                        }
                        shaderMat.update(_time);
                    } else {
                        // Low Detail
                        if (mesh.material !== staticMat) {
                            mesh.material = staticMat;
                            mesh.material.needsUpdate = true;
                        }
                    }
                } else if (mesh.material instanceof GasGiantMaterial) {
                    // Fallback if maps not populated yet (shouldn't happen)
                    mesh.material.update(_time);
                }
            }

            // Update texture if zoom changed significantly (only for non-gas giants)
            // REMOVED: Texture generation is fixed size (512x512), so regenerating on zoom is wasteful.
            /*
            if (Math.abs(scaleFactor - 1) > 0.1 && !(mesh.material instanceof GasGiantMaterial)) {
                const texture = TextureGenerator.createPlanetTexture(body);
                (mesh.material as THREE.MeshBasicMaterial).map = texture;
                (mesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
            }
            */

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
                // Collision detection uses: body.radius * VISUAL_SCALE (1.0) in world space
                // We need to convert to screen space: * this.scale
                const collisionRadiusWorld = body.radius; // No visual scaling
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

        // Update background to stay static relative to camera (Skybox effect)
        // We scale the background group inversely to the camera zoom so it appears fixed distance
        if (this.stars) {
            this.stars.position.set(0, 0, 0); // Always focused on camera

            // Scale background to match frustum size approximately
            // base scale 1.0 covers ~4000 units.
            // When we zoom out (scale decreases), we need background to get larger defined by World Units.
            // Camera frustum height = 1000 / scale * 1e-9.
            // We want the 4000 unit spread to definitely cover the screen.
            // Let's just scale it inversely to zoom.

            // Heuristic: At scale 1e-9 (1 pixel = 1 Gm presumably? No wait meters to pixels)
            // scale 1e-9 means 1 meter = 1e-9 pixels.
            // If frustumSize calculation is correct: 1000 / scale * 1e-9?
            // Wait, logic in updateZoom:
            // frustumSize = 1000 / this.scale * 1e-9;
            // if scale is 1e-9 (very zoomed out), frustum is 1000. 

            // Let's use a simple inverse scale relative to a reference
            // Reference: 1.0 scale factor when covering "normal" view

            // Actually, we want the background to be INFINITE.
            // Best way: Scale it such that it always covers the frustum with same density.
            // If we just scale by 1/scale, it will zoom with the camera (bad for stars).
            // We want it VISUALLY static.
            // If camera frustum size doubles, we want the background quad to double in size physically 
            // so it occupies the same screen space.

            // Current Scale: this.scale (meters -> pixels)
            // If scale decreases (zoom out), world objects get smaller.
            // To make starfield NOT get smaller, we must scale it UP by 1/scale? No.

            // If we want stars to act like they are at infinity (fixed screen position):
            // We need to counteract the camera zoom.
            // Camera projection scales everything by `scale`.
            // So we scale stars by `1/scale`.

            // However, this.scale is "meters to pixels". 
            // To keep stars constant size/position on SCREEN:
            // We need to apply a scaling factor to the Group.
            // factor * this.scale = constant.
            // factor = constant / this.scale.

            // Let's try scaling by some factor of 1/scale.
            // But we need to clamp it so it doesn't get ridiculous at extreme zooms.

            const inverseScale = 1.0 / (this.scale * 1000000000); // Normalize around 1e-9
            this.stars.scale.set(inverseScale, inverseScale, 1);

            // Also rotate with camera if we had rotation (we don't yet, but good practice)
            this.stars.rotation.z = this.camera.rotation.z;
        }

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
                // Create debug collision box with unit dimensions (will be scaled)
                const geometry = new THREE.BufferGeometry();
                const vertices = new Float32Array([
                    -0.5, -0.5, 0,
                    0.5, -0.5, 0,
                    0.5, 0.5, 0,
                    -0.5, 0.5, 0,
                    -0.5, -0.5, 0
                ]);

                geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                const material = new THREE.LineBasicMaterial({ color: 0x00FF00 });
                this.debugCollisionBox = new THREE.Line(geometry, material);
                this.scene.add(this.debugCollisionBox);
            }

            // Update debug box position and rotation to match rocket visual position
            this.debugCollisionBox.position.copy(this.rocketMesh.position);
            this.debugCollisionBox.rotation.z = rocket.rotation - Math.PI / 2;

            // Scale dynamically based on current rocket dimensions (including boosters)
            const boxScaleX = rocketScale * rocket.getTotalWidth();
            const boxScaleY = rocketScale * rocket.getTotalHeight();
            this.debugCollisionBox.scale.set(boxScaleX, boxScaleY, 1);
            this.debugCollisionBox.visible = true;
        } else if (this.debugCollisionBox) {
            this.debugCollisionBox.visible = false;
        }

        // Render debug collision circle if enabled
        if (this.showColliders) {
            if (!this.debugCollisionCircle) {
                // Create debug collision circle with unit radius (will be scaled)
                const radius = 1; // Unit radius, scaled dynamically
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

            // Scale dynamically based on current rocket.body.radius
            // This updates when fairings are ejected and radius changes
            const circleScale = rocketScale * rocket.body.radius;
            this.debugCollisionCircle.scale.set(circleScale, circleScale, 1);
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
        // Store trajectory points for SOI rendering
        this.lastTrajectoryPoints = points;

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

        // Render SOI spheres based on trajectory proximity
        this.soiRenderer.renderSOIs(this.currentBodies, points, center, this.scale);
    }

    /**
     * Update maneuver trajectory with multiple colored segments
     */
    updateManeuverTrajectory(segments: Vector2[][], colors: string[]) {
        // Store segments for tooltip proximity detection
        this.storedManeuverSegments = segments;

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

        // Render SOI spheres based on combined trajectory proximity
        if (segments.length > 0) {
            const allPoints = segments.flat();
            const center = this.getCenter();
            this.soiRenderer.renderSOIs(this.currentBodies, allPoints, center, this.scale);
        }
    }

    /**
     * Render the predicted future position of a celestial body with its SOI
     * Shows where the body will be at a future time, with dashed circles and path
     */
    renderFutureBodyPosition(body: Body, futureTimeSeconds: number): void {
        const center = this.getCenter();
        this.soiRenderer.renderFutureSOI(body, futureTimeSeconds, center, this.scale);
    }

    /**
     * Hide all future body position visualizations
     */
    hideFutureBodyPositions(): void {
        this.soiRenderer.hideFutureSOIs();
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
        // For perspective camera, calculate visible height at Z=0 (orbital plane)
        const distToPlane = Math.abs(this.camera.position.z);
        const vFov = this.camera.fov * Math.PI / 180;
        const frustumHeight = 2 * distToPlane * Math.tan(vFov / 2);
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
     * Invalidate Earth's texture to force regeneration (for debug longitude adjustment)
     */
    invalidateEarthTexture() {
        // Find Earth in the body meshes and regenerate its texture
        this.bodyMeshes.forEach((mesh, body) => {
            if (body.name === 'Earth') {
                // Regenerate the texture
                const texture = TextureGenerator.createPlanetTexture(body);
                const material = mesh.material as THREE.MeshBasicMaterial;
                if (material.map) {
                    material.map.dispose();
                }
                material.map = texture;
                material.needsUpdate = true;
            }
        });
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

        // Dispose ring meshes (ring is now a Group with children)
        this.ringMeshes.forEach(group => {
            group.children.forEach(child => {
                const ringMesh = child as THREE.Mesh;
                if (ringMesh.geometry) ringMesh.geometry.dispose();
                if (ringMesh.material) {
                    if (Array.isArray(ringMesh.material)) {
                        ringMesh.material.forEach((m: THREE.Material) => m.dispose());
                    } else {
                        const mat = ringMesh.material as THREE.MeshBasicMaterial;
                        mat.map?.dispose();
                        mat.dispose();
                    }
                }
            });
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

        // Dispose atmospheric cloud meshes
        this.atmosphereCloudMeshes.forEach(mesh => {
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
        this.atmosphereCloudMeshes.clear();

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
            this.stars.traverse((child) => {
                const mesh = child as THREE.Mesh; // Points and Sprite also have geometry/material compatible enough for this check
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(m => m.dispose());
                    } else {
                        mesh.material.dispose();
                    }
                }
            });
            this.scene.remove(this.stars);
            this.stars = null;
        }

        // Dispose orbit renderer
        if (this.orbitRenderer && typeof (this.orbitRenderer as any).dispose === 'function') {
            (this.orbitRenderer as any).dispose();
        }

        // Dispose SOI renderer
        if (this.soiRenderer && typeof (this.soiRenderer as any).dispose === 'function') {
            (this.soiRenderer as any).dispose();
        }

        // Dispose input handler (removes event listeners)
        if (this.inputHandler && typeof (this.inputHandler as any).dispose === 'function') {
            (this.inputHandler as any).dispose();
        }

        // Dispose WebGL renderer
        this.renderer.dispose();
    }

    /**
     * Auto-zoom to fit a body or the rocket on screen
     * The object will take up about 80% of the screen height
     */
    autoZoomToBody(body: Body | null) {
        if (!body) return;

        // Follow the body
        this.followedBody = body;

        // Determine the size of the object in meters
        let objectSizeMeters: number;

        // Check if it's the rocket
        if (this.currentRocket && body === this.currentRocket.body) {
            // Rocket: show ~30m context for close-up
            objectSizeMeters = 30;
        } else {
            // For celestial bodies, use visual radius * 2 (diameter) * visualScale
            objectSizeMeters = body.radius * 2 * this.visualScale;
        }

        // We want the object to take up targetFraction of screen height
        const targetFraction = 0.8; // 80% of screen

        // Calculate proper camera distance using perspective math
        // Visible height at distance d = 2 * d * tan(FOV/2)
        // We want: objectSizeMeters * scale = targetFraction * 2 * d * tan(FOV/2)
        // Rearranging: d = (objectSizeMeters * scale) / (targetFraction * 2 * tan(FOV/2))
        // But we need d > near clip (1e3), so we solve for scale instead:
        // scale = (targetFraction * 2 * d * tan(FOV/2)) / objectSizeMeters

        const fovRad = this.camera.fov * Math.PI / 180;
        const tanHalfFov = Math.tan(fovRad / 2);

        // Camera distance must be > near clip (now 1 with logarithmic depth buffer)
        // Use a distance that gives a good view
        const cameraDistance = 200; // Comfortable viewing distance

        // Calculate scale so object fills target fraction at this distance
        // visible height = 2 * d * tan(FOV/2)
        // object scene size should be targetFraction of visible height
        // objectSizeMeters * scale = targetFraction * 2 * d * tan(FOV/2)
        // scale = (targetFraction * 2 * d * tan(FOV/2)) / objectSizeMeters
        const newScale = (targetFraction * 2 * cameraDistance * tanHalfFov) / objectSizeMeters;

        if (newScale !== this.scale) {
            this.scale = newScale;
        }

        // Set camera at the calculated distance
        if (this.orbitControls) {
            this.camera.position.set(0, 0, cameraDistance);
            this.orbitControls.target.set(0, 0, 0);
            this.orbitControls.update();
        }
    }

    /**
     * Render debug floor line for collision visualization.
     * Shows the local floor where collision detection happens, in magenta.
     */
    renderDebugFloor(floorInfo: { start: { x: number; y: number }; end: { x: number; y: number } } | null): void {
        // Hide if no floor info or colliders not shown
        if (!floorInfo || !this.showColliders) {
            if (this.debugFloorLine) {
                this.debugFloorLine.visible = false;
            }
            return;
        }

        // Create or update floor line
        if (!this.debugFloorLine) {
            const geometry = new THREE.BufferGeometry();
            const vertices = new Float32Array([0, 0, 0, 1, 0, 0]);
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            const material = new THREE.LineBasicMaterial({ color: 0xFF00FF, linewidth: 3 }); // Magenta for floor
            this.debugFloorLine = new THREE.Line(geometry, material);
            this.scene.add(this.debugFloorLine);
        }

        // Use same center as other rendering
        const center = this.getCenter();

        // Update vertices
        const positions = this.debugFloorLine.geometry.getAttribute('position');
        const array = positions.array as Float32Array;
        array[0] = (floorInfo.start.x - center.x) * this.scale;
        array[1] = (floorInfo.start.y - center.y) * this.scale;
        array[2] = 0.6; // Above planet colliders
        array[3] = (floorInfo.end.x - center.x) * this.scale;
        array[4] = (floorInfo.end.y - center.y) * this.scale;
        array[5] = 0.6;
        positions.needsUpdate = true;

        this.debugFloorLine.visible = true;
    }

    /**
     * Calculate the screen radius of a mesh in pixels
     * Uses vector projection for accuracy
     */
    private getScreenRadius(mesh: THREE.Mesh): number {
        // 1. Get center position in world space
        const center = new THREE.Vector3();
        mesh.getWorldPosition(center);

        // 2. Get a point on the edge (right side)
        // Center is (0,0,0) in local space. Edge is (radius, 0, 0) in local space.
        // We use the geometry radius which is what we want to measure
        const geometryRadius = (mesh.geometry as THREE.CircleGeometry).parameters.radius;

        const centerPoint = new THREE.Vector3(0, 0, 0);
        const edgePoint = new THREE.Vector3(geometryRadius, 0, 0);

        centerPoint.applyMatrix4(mesh.matrixWorld);
        edgePoint.applyMatrix4(mesh.matrixWorld);

        centerPoint.project(this.camera);
        edgePoint.project(this.camera);

        // Project returns NDC (-1 to +1). Convert to pixels.
        const dx = (edgePoint.x - centerPoint.x) * (this.renderer.domElement.width / 2);
        const dy = (edgePoint.y - centerPoint.y) * (this.renderer.domElement.height / 2);

        return Math.sqrt(dx * dx + dy * dy);
    }
}
