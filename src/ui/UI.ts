import { Renderer } from '../Renderer';
import { ThreeRenderer } from '../rendering/ThreeRenderer';
import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { NavballRenderer } from './NavballRenderer';
import { SphereOfInfluence } from '../physics/SphereOfInfluence';
import { ManeuverNodeManager } from '../systems/ManeuverNodeManager';

import { ManeuverNodeUI } from './ManeuverNodeUI';
import { IconGenerator } from './IconGenerator';
import { controls } from '../config/Controls';

import { Rocket } from '../entities/Rocket';

export class UI {
    renderer: Renderer | ThreeRenderer;
    minimapCanvas!: HTMLCanvasElement;
    minimapCtx!: CanvasRenderingContext2D;
    minimapScale: number = 1.0;
    bodies: Body[] = [];
    onTimeWarpChange?: (factor: number) => void;
    currentTimeWarp: number = 1;
    warpLevels: number[] = [0, 1, 5, 10, 50, 100, 500, 1000, 5000];

    // Rocket UI elements
    rocketInfoPanel: HTMLDivElement | null = null;
    fuelDisplay: HTMLElement | null = null;
    throttleDisplay: HTMLElement | null = null;
    throttleSlider: HTMLInputElement | null = null;
    velocityDisplay: HTMLElement | null = null;
    altitudeDisplay: HTMLElement | null = null;
    gravityDisplay: HTMLElement | null = null;
    soiDisplay: HTMLElement | null = null;
    deltaVDisplay: HTMLElement | null = null;
    massDisplay: HTMLElement | null = null;
    currentRocket: Rocket | null = null; // Reference to rocket for throttle control
    fuelGaugeBar: HTMLElement | null = null; // Replaces throttleSlider

    // Autopilot state
    autopilotMode: 'off' | 'prograde' | 'retrograde' | 'target' | 'anti-target' | 'maneuver' = 'off';

    // Navball
    navballRenderer: NavballRenderer | null = null;

    // Maneuver nodes
    maneuverNodeManager: ManeuverNodeManager | null = null;
    maneuverNodeUI: ManeuverNodeUI | null = null;

    constructor(renderer: Renderer | ThreeRenderer) {
        this.renderer = renderer;
        this.createControls();
        this.createMinimap();
        this.createRocketInfoPanel();
        this.createControlsHelp();
        this.createDebugMenu();
        this.setupInput();
        this.initializeNavball();
    }

    init(bodies: Body[], rocket?: Rocket, maneuverNodeManager?: ManeuverNodeManager) {
        this.bodies = bodies;
        if (rocket) {
            this.currentRocket = rocket;
        }
        if (maneuverNodeManager) {
            this.maneuverNodeManager = maneuverNodeManager;
        }

        if (this.maneuverNodeManager && this.currentRocket) {
            this.maneuverNodeUI = new ManeuverNodeUI(this.maneuverNodeManager);
            this.maneuverNodeUI.init(this.currentRocket, this.bodies, this.renderer);
            this.maneuverNodeUI.onNodeChanged = () => {
                if (this.renderer instanceof ThreeRenderer) {
                    this.renderer.showTrajectory = true;
                }
            };
        }

        this.createSelectionDropdown();
    }

    createControls() {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '10px';
        container.style.left = '10px';
        container.style.display = 'flex';
        container.style.gap = '10px';

        const focusRocketBtn = document.createElement('button');
        focusRocketBtn.innerText = '🚀 Focus Rocket';
        focusRocketBtn.style.fontSize = '14px';
        focusRocketBtn.style.cursor = 'pointer';
        focusRocketBtn.style.backgroundColor = '#333';
        focusRocketBtn.style.color = '#fff';
        focusRocketBtn.style.border = '1px solid #555';
        focusRocketBtn.style.borderRadius = '3px';
        focusRocketBtn.style.marginBottom = '5px';
        focusRocketBtn.style.padding = '5px 10px';

        focusRocketBtn.onclick = () => {
            // Check if renderer is ThreeRenderer (has currentRocket property)
            if (this.renderer instanceof ThreeRenderer && this.renderer.currentRocket) {
                this.renderer.followedBody = this.renderer.currentRocket.body;
                this.renderer.autoZoomToBody(this.renderer.currentRocket.body);
                const select = document.getElementById('planet-select') as HTMLSelectElement;
                if (select) select.value = "";
            }
        };

        // Show Trajectory Button
        const trajectoryBtn = document.createElement('button');
        trajectoryBtn.innerText = '💫 Trajectory';
        trajectoryBtn.title = 'Toggle Trajectory';
        trajectoryBtn.style.fontSize = '14px';
        trajectoryBtn.style.cursor = 'pointer';
        trajectoryBtn.style.backgroundColor = '#333';
        trajectoryBtn.style.color = '#fff'; // White text
        trajectoryBtn.style.border = '1px solid #555';
        trajectoryBtn.style.borderRadius = '3px';
        trajectoryBtn.style.marginBottom = '5px';
        trajectoryBtn.style.padding = '5px 10px';

        trajectoryBtn.onclick = () => {
            if (this.renderer instanceof ThreeRenderer) {
                this.renderer.showTrajectory = !this.renderer.showTrajectory;
                // Visual feedback: Blue background when active, Dark when inactive
                trajectoryBtn.style.backgroundColor = this.renderer.showTrajectory ? '#4a9eff' : '#333';
                // Text always white
                trajectoryBtn.style.color = '#fff';
            }
        };

        container.appendChild(focusRocketBtn);
        container.appendChild(trajectoryBtn);
        document.body.appendChild(container);

        // Time Warp Controls
        const timeContainer = document.createElement('div');
        timeContainer.style.position = 'absolute';
        timeContainer.style.top = '10px';
        timeContainer.style.right = '10px'; // Top right
        timeContainer.style.display = 'flex';
        timeContainer.style.gap = '5px';
        timeContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        timeContainer.style.padding = '5px';
        timeContainer.style.borderRadius = '5px';

        const speedDisplay = document.createElement('span');
        speedDisplay.style.color = 'white';
        speedDisplay.style.fontFamily = 'monospace';
        speedDisplay.style.alignSelf = 'center';
        speedDisplay.style.minWidth = '60px';
        speedDisplay.innerText = '1x';

        const decreaseBtn = document.createElement('button');
        decreaseBtn.innerText = '<<';
        decreaseBtn.onclick = () => this.changeTimeWarp(-1, speedDisplay);

        const pauseBtn = document.createElement('button');
        pauseBtn.innerText = '||';
        pauseBtn.onclick = () => this.setTimeWarp(0, speedDisplay);

        const playBtn = document.createElement('button');
        playBtn.innerText = '>';
        playBtn.onclick = () => this.setTimeWarp(1, speedDisplay);

        const increaseBtn = document.createElement('button');
        increaseBtn.innerText = '>>';
        increaseBtn.onclick = () => this.changeTimeWarp(1, speedDisplay);

        timeContainer.appendChild(decreaseBtn);
        timeContainer.appendChild(pauseBtn);
        timeContainer.appendChild(playBtn);
        timeContainer.appendChild(increaseBtn);
        timeContainer.appendChild(speedDisplay);
        document.body.appendChild(timeContainer);
    }

    setTimeWarp(levelIndexOrValue: number, display: HTMLElement) {
        // If 0 or 1 passed directly
        let newWarp = levelIndexOrValue;

        // Find nearest level if it's a value
        if (!this.warpLevels.includes(newWarp)) {
            // Just set it directly if it's 0 or 1
        }

        this.currentTimeWarp = newWarp;
        display.innerText = this.currentTimeWarp + 'x';
        if (this.onTimeWarpChange) {
            this.onTimeWarpChange(this.currentTimeWarp);
        }
    }

    changeTimeWarp(direction: number, display: HTMLElement) {
        // Find current index in levels
        let currentIndex = this.warpLevels.indexOf(this.currentTimeWarp);
        if (currentIndex === -1) currentIndex = 1; // Default to 1x index

        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= this.warpLevels.length) newIndex = this.warpLevels.length - 1;

        this.currentTimeWarp = this.warpLevels[newIndex];
        display.innerText = this.currentTimeWarp + 'x';

        if (this.onTimeWarpChange) {
            this.onTimeWarpChange(this.currentTimeWarp);
        }
    }

    createSelectionDropdown() {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '50px';
        container.style.left = '10px';
        container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        container.style.padding = '10px';
        container.style.borderRadius = '5px';
        container.style.maxHeight = '400px';
        container.style.overflowY = 'auto';
        container.style.minWidth = '250px';

        // Title bar with collapse button
        const titleBar = document.createElement('div');
        titleBar.style.display = 'flex';
        titleBar.style.justifyContent = 'space-between';
        titleBar.style.alignItems = 'center';
        titleBar.style.marginBottom = '10px';
        titleBar.style.borderBottom = '1px solid rgba(255,255,255,0.3)';
        titleBar.style.paddingBottom = '5px';

        const title = document.createElement('div');
        title.innerText = 'CELESTIAL BODIES';
        title.style.color = 'white';
        title.style.fontFamily = 'monospace';
        title.style.fontWeight = 'bold';

        const toggleBtn = document.createElement('button');
        toggleBtn.innerText = '−';
        toggleBtn.style.padding = '0 8px';
        toggleBtn.style.fontSize = '16px';
        toggleBtn.style.cursor = 'pointer';

        const contentDiv = document.createElement('div');
        contentDiv.style.display = 'none'; // Collapsed by default

        toggleBtn.onclick = () => {
            if (contentDiv.style.display === 'none') {
                contentDiv.style.display = 'block';
                toggleBtn.innerText = '−';
            } else {
                contentDiv.style.display = 'none';
                toggleBtn.innerText = '+';
            }
        };

        titleBar.appendChild(title);
        titleBar.appendChild(toggleBtn);
        container.appendChild(titleBar);

        // Body list
        const bodyList = document.createElement('div');
        bodyList.id = 'body-list';

        // Group bodies by system
        const roots = this.bodies.filter(b => !b.parent);

        roots.forEach(root => {
            // Add root body (Sun) with buttons
            // Ensure we pass indentLevel 0
            this.addBodyRow(bodyList, root, 0);

            // Find children (Planets)
            const planets = this.bodies.filter(b => b.parent === root);
            planets.forEach(planet => {
                this.addBodyRow(bodyList, planet, 1);

                // Find moons
                const moons = this.bodies.filter(b => b.parent === planet);
                moons.forEach(moon => {
                    this.addBodyRow(bodyList, moon, 2);
                });
            });
        });

        contentDiv.appendChild(bodyList);
        container.appendChild(contentDiv);
        document.body.appendChild(container);
    }

    /**
     * Add a row for a celestial body with Focus and Orbit buttons
     */
    private addBodyRow(parent: HTMLElement, body: any, indentLevel: number) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '5px';
        row.style.marginBottom = '5px';
        row.style.marginLeft = `${indentLevel * 15}px`;

        // Body name label
        const label = document.createElement('span');
        label.innerText = body.name;
        label.style.color = 'white';
        label.style.fontFamily = 'monospace';
        label.style.fontSize = '12px';
        label.style.flex = '1';
        label.style.alignSelf = 'center';
        row.appendChild(label);

        // Focus button
        const focusBtn = document.createElement('button');
        focusBtn.innerText = '👁️';
        focusBtn.title = `Focus on ${body.name}`;
        focusBtn.style.padding = '2px 8px';
        focusBtn.style.fontSize = '12px';
        focusBtn.onclick = () => {
            this.renderer.followedBody = body;
            if (this.renderer instanceof ThreeRenderer) {
                this.renderer.autoZoomToBody(body);
            }
        };
        row.appendChild(focusBtn);

        // Orbit button (Allowed for Sun too now)
        const orbitBtn = document.createElement('button');
        orbitBtn.innerText = '🛸';
        orbitBtn.title = `Orbit ${body.name}`;
        orbitBtn.style.padding = '2px 8px';
        orbitBtn.style.fontSize = '12px';
        orbitBtn.onclick = () => {
            this.placeRocketInOrbit(body);
        };
        row.appendChild(orbitBtn);

        // Target button (Allowed for Sun too now)
        const targetBtn = document.createElement('button');
        targetBtn.innerText = '🎯';
        targetBtn.title = `Set ${body.name} as Target`;
        targetBtn.style.padding = '2px 8px';
        targetBtn.style.fontSize = '12px';
        targetBtn.onclick = () => {
            this.setTarget(body);
        };
        row.appendChild(targetBtn);

        parent.appendChild(row);
    }

    /**
     * Place rocket in a stable circular orbit around a body
     */
    private placeRocketInOrbit(body: any) {
        // Try multiple sources for the rocket reference
        const rendererRocket = (this.renderer as any).currentRocket;
        const uiRocket = this.currentRocket;

        // Use renderer rocket if available, otherwise UI rocket
        const rocket = rendererRocket || uiRocket;

        if (!rocket) {
            console.warn('No rocket available from any source!');
            return;
        }

        // Orbit calculation
        const physicalRadius = body.radius;
        const VISUAL_SCALE = 3.0; // Bodies are rendered 3x larger
        const visualRadius = physicalRadius * VISUAL_SCALE;

        // Orbit altitude above VISUAL surface (not physical)
        // Use a safer margin: 10% of visual radius or 200km, whichever is larger
        // This prevents minor perturbations from crashing the rocket into the "visual" surface
        const orbitAltitude = Math.max(200000, visualRadius * 0.1);

        // Orbit radius from center = visual radius + altitude above visual surface
        const orbitRadius = visualRadius + orbitAltitude;

        console.log(`Orbit altitude: ${(orbitAltitude / 1000).toFixed(0)} km`);
        console.log(`Orbit radius from center: ${(orbitRadius / 1000).toFixed(0)} km`);
        // Calculate orbital velocity for circular orbit: v = sqrt(GM/r)
        const G = 6.674e-11;
        const orbitalSpeed = Math.sqrt((G * body.mass) / orbitRadius);

        console.log(`Required orbital speed: ${(orbitalSpeed / 1000).toFixed(2)} km/s`);

        // Place rocket at body position + orbit radius (to the right)
        const newPosX = body.position.x + orbitRadius;
        const newPosY = body.position.y;
        const newVelX = body.velocity.x;
        const newVelY = body.velocity.y + orbitalSpeed;

        console.log(`New rocket position: (${newPosX.toFixed(0)}, ${newPosY.toFixed(0)})`);
        console.log(`Body velocity: (${body.velocity.x.toFixed(2)}, ${body.velocity.y.toFixed(2)})`);
        console.log(`New rocket velocity: (${newVelX.toFixed(2)}, ${newVelY.toFixed(2)})`);

        // Use setTimeout to ensure position is set AFTER current frame/update cycle
        // TODO voir si on peut ce passer de ce setTimeout
        setTimeout(() => {
            // CREATE NEW Vector2 objects instead of mutating
            rocket.body.position = new Vector2(newPosX, newPosY);

            // Set velocity perpendicular to radial direction (upward for circular orbit)
            // Relative to body's velocity
            // CREATE NEW Vector2 object
            rocket.body.velocity = new Vector2(newVelX, newVelY);

            // Point rocket in direction of movement (90 degrees)
            rocket.rotation = Math.PI / 2;

            // CRITICAL: Also update the Matter.js physics body to prevent collision system from resetting position
            // Access the collision manager through the game/renderer
            if ((window as any).game && (window as any).game.collisionManager) {
                const game = (window as any).game;
                const collisionManager = game.collisionManager;
                collisionManager.syncPositions([game.bodies || []], rocket);

                // CRITICAL: Reset resting state so rocket can move freely
                game.isRocketResting = false;
                game.restingOn = null;
            }

            // Focus camera on rocket but zoom to show the planet for context
            this.renderer.followedBody = rocket.body;
            if (this.renderer instanceof ThreeRenderer) {
                // Zoom to show the planet (body param from function) for orbital context
                this.renderer.autoZoomToBody(body);
            }

            console.log(`✓ Rocket placed in ${(orbitAltitude / 1000).toFixed(0)} km orbit around ${body.name}`);

            // Monitor position for 2 seconds to see if it changes
            let checkCount = 0;
            const monitorInterval = setInterval(() => {
                checkCount++;

                if (checkCount >= 20) {
                    clearInterval(monitorInterval);
                }
            }, 100);
        }, 100); // Wait 100ms to let all systems settle
    }

    createMinimap() {
        this.minimapCanvas = document.createElement('canvas');
        this.minimapCanvas.width = 200;
        this.minimapCanvas.height = 200;
        this.minimapCanvas.style.position = 'absolute';
        this.minimapCanvas.style.bottom = '10px';
        this.minimapCanvas.style.right = '10px';
        this.minimapCanvas.style.border = '1px solid white';
        this.minimapCanvas.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';

        this.minimapCtx = this.minimapCanvas.getContext('2d')!;
        document.body.appendChild(this.minimapCanvas);

        // Minimap controls
        const controls = document.createElement('div');
        controls.style.position = 'absolute';
        controls.style.bottom = '220px';
        controls.style.right = '10px';
        controls.style.display = 'flex';
        controls.style.gap = '5px';

        const plusBtn = document.createElement('button');
        plusBtn.innerText = '+';
        plusBtn.onclick = () => this.minimapScale *= 1.5;

        const minusBtn = document.createElement('button');
        minusBtn.innerText = '-';
        minusBtn.onclick = () => this.minimapScale /= 1.5;

        controls.appendChild(plusBtn);
        controls.appendChild(minusBtn);
        document.body.appendChild(controls);
    }

    setupInput() {
        // Mouse drag to pan
        let isDragging = false;
        let lastPos = new Vector2(0, 0);

        this.renderer.canvas.addEventListener('mousedown', (e) => {
            // Check for click on body
            const clickPos = new Vector2(e.clientX, e.clientY);
            const clickedBody = this.renderer.selectBodyAt(clickPos, this.bodies);

            if (clickedBody) {
                this.renderer.followedBody = clickedBody;
                // Update dropdown
                const select = document.getElementById('planet-select') as HTMLSelectElement;
                if (select) select.value = clickedBody.name;
                return; // Don't start drag if clicked on body
            }

            // Only start dragging if we didn't click on a body
            isDragging = true;
            lastPos = new Vector2(e.clientX, e.clientY);

            // Don't remove follow on mousedown - only on actual drag movement
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const currentPos = new Vector2(e.clientX, e.clientY);
            const delta = currentPos.sub(lastPos);

            // Only break follow if we've actually moved (not just a click)
            if (delta.mag() > 2 && this.renderer.followedBody) {
                this.renderer.followedBody = null;
                const select = document.getElementById('planet-select') as HTMLSelectElement;
                if (select) select.value = "";

                // Set offset to current position so it doesn't jump
                this.renderer.offset = this.renderer.getCenter();
            }

            const scaledDelta = delta.scale(1 / this.renderer.scale);
            // X is subtracted (drag right -> move camera left -> map moves right)
            // Y is added (drag down -> move camera up -> map moves down) because Y is inverted in renderer
            this.renderer.offset = new Vector2(
                this.renderer.offset.x - scaledDelta.x,
                this.renderer.offset.y + scaledDelta.y
            );

            lastPos = currentPos;
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Scroll to zoom
        this.renderer.canvas.addEventListener('wheel', (e) => {
            const zoomFactor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
            this.zoom(zoomFactor);
        });
    }

    zoom(factor: number) {
        this.renderer.scale *= factor;
    }

    renderMinimap(bodies: Body[]) {
        const ctx = this.minimapCtx;
        const width = this.minimapCanvas.width;
        const height = this.minimapCanvas.height;

        // Background
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        // Base scale: 60 AU width
        const baseScale = width / (60 * 149.6e9);
        const scale = baseScale * this.minimapScale;

        // Center the minimap on the camera's center (world coordinates)
        const cameraCenter = this.renderer.getCenter();
        const minimapCenter = new Vector2(width / 2, height / 2);

        // Draw Orbits on Minimap
        if (this.renderer.showOrbits) {
            ctx.lineWidth = 1;
            bodies.forEach(body => {
                if (!body.parent || !body.orbit) return;

                const orbit = body.orbit;
                const orbitCenter = body.parent.position.add(orbit.focusOffset);

                // Transform orbit center to minimap
                const relPos = orbitCenter.sub(cameraCenter);
                const pos = relPos.scale(scale).add(minimapCenter);

                const radiusX = orbit.a * scale;
                const radiusY = orbit.b * scale;

                // Don't draw if too small
                if (radiusX < 1) return;

                ctx.strokeStyle = body.color;
                ctx.beginPath();
                ctx.ellipse(
                    pos.x,
                    pos.y,
                    radiusX,
                    radiusY,
                    orbit.omega,
                    0,
                    2 * Math.PI
                );
                ctx.stroke();
            });
        }

        bodies.forEach(body => {
            // Transform world pos to minimap pos
            // minimapPos = (worldPos - cameraCenter) * scale + minimapCenter
            const relPos = body.position.sub(cameraCenter);
            const pos = relPos.scale(scale).add(minimapCenter);

            // Clip to canvas? Or let them be drawn outside?
            // Drawing outside is fine, canvas clips automatically.

            ctx.fillStyle = body.color;
            ctx.beginPath();
            // Make sun visible, planets small dots
            const radius = body.name === "Sun" ? 3 : 1.5;
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw camera view rectangle (optional, but helpful)
        // The main view shows: width / renderer.scale world units
        // On minimap, that is: (width / renderer.scale) * scale pixels
        const viewWidth = (this.renderer.width / this.renderer.scale) * scale;
        const viewHeight = (this.renderer.height / this.renderer.scale) * scale;

        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
            minimapCenter.x - viewWidth / 2,
            minimapCenter.y - viewHeight / 2,
            viewWidth,
            viewHeight
        );
    }

    createRocketInfoPanel() {
        const panel = document.createElement('div');
        panel.style.position = 'absolute';
        panel.style.bottom = '10px';
        panel.style.left = '10px';
        panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        panel.style.color = 'white';
        panel.style.padding = '10px';
        panel.style.borderRadius = '5px';
        panel.style.fontFamily = 'monospace';
        panel.style.fontSize = '14px';
        panel.style.minWidth = '200px';
        panel.style.display = 'none'; // Hidden by default until rocket exists

        // Title
        const title = document.createElement('div');
        title.innerText = 'ROCKET TELEMETRY';
        title.style.fontWeight = 'bold';
        title.style.borderBottom = '1px solid #555';
        title.style.marginBottom = '5px';
        title.style.paddingBottom = '2px';
        panel.appendChild(title);

        // Fuel
        const fuelRow = document.createElement('div');
        fuelRow.style.display = 'flex';
        fuelRow.style.justifyContent = 'space-between';
        fuelRow.innerHTML = '<span>Fuel:</span> <span id="rocket-fuel">100%</span>';
        panel.appendChild(fuelRow);
        this.fuelDisplay = fuelRow.querySelector('#rocket-fuel');

        // Fuel Gauge (Visual Bar)
        const fuelGaugeContainer = document.createElement('div');
        fuelGaugeContainer.style.marginBottom = '8px';
        fuelGaugeContainer.style.height = '10px';
        fuelGaugeContainer.style.backgroundColor = '#333';
        fuelGaugeContainer.style.borderRadius = '5px';
        fuelGaugeContainer.style.overflow = 'hidden';
        fuelGaugeContainer.style.border = '1px solid #555';

        const fuelBar = document.createElement('div');
        fuelBar.style.width = '100%';
        fuelBar.style.height = '100%';
        fuelBar.style.backgroundColor = '#00C851';
        fuelBar.style.transition = 'width 0.2s, background-color 0.2s';

        fuelGaugeContainer.appendChild(fuelBar);
        panel.appendChild(fuelGaugeContainer);
        this.fuelGaugeBar = fuelBar;

        // Delta V
        const dvRow = document.createElement('div');
        dvRow.style.display = 'flex';
        dvRow.style.justifyContent = 'space-between';
        dvRow.innerHTML = '<span>Delta V:</span> <span id="rocket-dv">0 m/s</span>';
        panel.appendChild(dvRow);
        this.deltaVDisplay = dvRow.querySelector('#rocket-dv');

        // Mass
        const massRow = document.createElement('div');
        massRow.style.display = 'flex';
        massRow.style.justifyContent = 'space-between';
        massRow.innerHTML = '<span>Mass:</span> <span id="rocket-mass">0 kg</span>';
        panel.appendChild(massRow);
        this.massDisplay = massRow.querySelector('#rocket-mass');

        // Throttle (text display)
        const throttleRow = document.createElement('div');
        throttleRow.style.display = 'flex';
        throttleRow.style.justifyContent = 'space-between';
        throttleRow.style.marginBottom = '5px';
        throttleRow.innerHTML = '<span>Throttle:</span> <span id="rocket-throttle">0%</span>';
        panel.appendChild(throttleRow);
        this.throttleDisplay = throttleRow.querySelector('#rocket-throttle');



        // Remove old throttle slider reference
        // this.throttleSlider = throttleSlider;

        // Velocity
        const velRow = document.createElement('div');
        velRow.style.display = 'flex';
        velRow.style.justifyContent = 'space-between';
        velRow.innerHTML = '<span>Velocity:</span> <span id="rocket-vel">0 m/s</span>';
        panel.appendChild(velRow);
        this.velocityDisplay = velRow.querySelector('#rocket-vel');

        // Altitude
        const altRow = document.createElement('div');
        altRow.style.display = 'flex';
        altRow.style.justifyContent = 'space-between';
        altRow.innerHTML = '<span>Altitude:</span> <span id="rocket-alt">0 km</span>';
        panel.appendChild(altRow);
        this.altitudeDisplay = altRow.querySelector('#rocket-alt');

        // Gravity
        const gravRow = document.createElement('div');
        gravRow.style.display = 'flex';
        gravRow.style.justifyContent = 'space-between';
        gravRow.innerHTML = '<span>Gravity:</span> <span id="rocket-grav">0 m/s²</span>';
        panel.appendChild(gravRow);
        this.gravityDisplay = gravRow.querySelector('#rocket-grav');

        // SOI (Sphere of Influence)
        const soiRow = document.createElement('div');
        soiRow.style.display = 'flex';
        soiRow.style.justifyContent = 'space-between';
        soiRow.innerHTML = '<span>SOI:</span> <span id="rocket-soi">-</span>';
        panel.appendChild(soiRow);
        this.soiDisplay = soiRow.querySelector('#rocket-soi');

        document.body.appendChild(panel);
        this.rocketInfoPanel = panel;
    }

    createControlsHelp() {
        const panel = document.createElement('div');
        panel.style.position = 'absolute';
        panel.style.top = '60px';
        panel.style.right = '10px';
        panel.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        panel.style.color = '#aaa';
        panel.style.padding = '8px';
        panel.style.borderRadius = '5px';
        panel.style.fontFamily = 'monospace';
        panel.style.fontSize = '12px';
        panel.style.textAlign = 'right';

        panel.innerHTML = `
            <div><strong>CONTROLS</strong></div>
            <div>Thrust: ${controls.getControl('thrust').toUpperCase()} / ${controls.getControl('cutEngines').toUpperCase()}</div>
            <div>Rotate: ${controls.getControl('rotateLeft').toUpperCase()} / ${controls.getControl('rotateRight').toUpperCase()}</div>
            <div>Fine Ctrl: ${controls.getControl('increaseThrottle')} / ${controls.getControl('decreaseThrottle')}</div>
        `;

        document.body.appendChild(panel);
    }

    updateRocketInfo(rocket: any) {
        if (!rocket || !this.rocketInfoPanel) return;

        // Store rocket reference for throttle control
        this.currentRocket = rocket;

        // Show panel if hidden
        if (this.rocketInfoPanel.style.display === 'none') {
            this.rocketInfoPanel.style.display = 'block';
        }

        const info = rocket.getInfo();

        if (this.fuelDisplay) {
            const fuel = info.fuel.toFixed(1);
            this.fuelDisplay.innerText = `${fuel}% `;
            this.fuelDisplay.style.color = info.fuel < 10 ? '#ff4444' : (info.fuel < 30 ? '#ffbb33' : '#00C851');
        }

        // Update visual fuel gauge bar
        if (this.fuelGaugeBar) {
            this.fuelGaugeBar.style.width = `${info.fuel}%`;
            // Color change based on level
            this.fuelGaugeBar.style.backgroundColor = info.fuel < 20 ? '#ff4444' : (info.fuel < 50 ? '#ffbb33' : '#00C851');
        }

        if (this.deltaVDisplay) {
            this.deltaVDisplay.innerText = `${info.deltaV.toFixed(0)} m/s`;
        }

        if (this.massDisplay) {
            this.massDisplay.innerText = `${info.mass.toFixed(0)} kg`;
        }

        if (this.throttleDisplay) {
            // Show throttle percentage
            const throttle = rocket.controls ? (rocket.controls.throttle * 100).toFixed(0) : '0';
            this.throttleDisplay.innerText = `${throttle}%`;
        }

        // Find nearest body for relative calculations
        let nearestBody: any = null;
        let minDist = Infinity;

        this.bodies.forEach(b => {
            if (b.name === 'Rocket') return;
            // Visual scale is 3.0, so visual radius is 3 * physical radius
            const visualRadius = b.radius * 3.0;
            const dist = b.position.distanceTo(rocket.body.position) - visualRadius;
            if (dist < minDist) { // Allow negative distance (underground) for logic, but display 0?
                minDist = dist;
                nearestBody = b;
            }
        });

        if (this.velocityDisplay) {
            let velocity = info.velocity; // Default to absolute
            if (nearestBody) {
                // Calculate relative velocity
                const relVel = rocket.body.velocity.sub(nearestBody.velocity);
                velocity = relVel.mag();
            }
            this.velocityDisplay.innerText = `${velocity.toFixed(0)} m / s`;
        }

        if (this.altitudeDisplay) {
            if (nearestBody) {
                const altKm = (minDist / 1000).toFixed(1);
                this.altitudeDisplay.innerText = `${altKm} km`;

                // Calculate gravity at this position: g = GM/r^2
                const r = rocket.body.position.distanceTo(nearestBody.position);
                const g = (6.674e-11 * nearestBody.mass) / (r * r);
                if (this.gravityDisplay) {
                    this.gravityDisplay.innerText = `${g.toFixed(2)} m / s²`;
                }

                // Display SOI (Sphere of Influence)
                if (this.soiDisplay) {
                    const dominantBody = SphereOfInfluence.findDominantBody(rocket, this.bodies);
                    this.soiDisplay.innerText = dominantBody.name;
                    // Color code: Sun=yellow, Planet=blue, Moon=gray
                    if (dominantBody.type === 'star') {
                        this.soiDisplay.style.color = '#FFD700';
                    } else if (dominantBody.type === 'moon') {
                        this.soiDisplay.style.color = '#CCCCCC';
                    } else {
                        this.soiDisplay.style.color = '#4CAF50';
                    }
                }
            }
        } else {
            this.altitudeDisplay.innerText = 'N/A';
            if (this.gravityDisplay) this.gravityDisplay.innerText = '0 m/s²';
        }

        // Autopilot: Auto-orient to prograde or retrograde
        if (this.autopilotMode !== 'off' && nearestBody) {
            // Use target body for velocity reference if set
            const referenceBody = rocket.targetBody || nearestBody;
            const velocityVector = rocket.body.velocity.sub(referenceBody.velocity);
            const speed = velocityVector.mag();

            let targetAngle: number | null = null;

            if ((this.autopilotMode === 'prograde' || this.autopilotMode === 'retrograde') && speed > 1) {
                // Calculate target angle based on velocity
                targetAngle = Math.atan2(velocityVector.y, velocityVector.x);

                //For retrograde, add 180 degrees
                if (this.autopilotMode === 'retrograde') {
                    targetAngle += Math.PI;
                }
            } else if ((this.autopilotMode === 'target' || this.autopilotMode === 'anti-target') && rocket.targetBody) {
                // Calculate vector to target
                const targetVector = rocket.targetBody.position.sub(rocket.body.position);
                targetAngle = Math.atan2(targetVector.y, targetVector.x);

                if (this.autopilotMode === 'anti-target') {
                    targetAngle += Math.PI;
                }
            } else if (this.autopilotMode === 'maneuver' && this.maneuverNodeUI) {
                // Align with maneuver node delta-v direction
                const nodes = this.maneuverNodeUI.manager.nodes;
                if (nodes.length > 0) {
                    const node = nodes[0];
                    targetAngle = node.getΔvDirection(rocket, this.bodies);
                }
            }

            // Apply rotation if we have a target angle
            if (targetAngle !== null) {
                // Normalize angles to -PI to PI
                targetAngle = ((targetAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
                let currentAngle = ((rocket.rotation + Math.PI) % (2 * Math.PI)) - Math.PI;

                // Calculate angle difference
                let angleDiff = targetAngle - currentAngle;

                // Normalize to -PI to PI
                if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                // Apply rotation to minimize angle difference
                const rotationSpeed = 0.05; // Adjust for smoothness
                const maxRotation = 0.1; // Max rotation per frame

                if (Math.abs(angleDiff) > 0.01) { // Dead zone
                    const rotation = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff) * rotationSpeed, maxRotation);
                    rocket.rotation += rotation;
                }
            }
        }

        // Update navball
        if (this.navballRenderer && nearestBody) {
            this.navballRenderer.setRocket(rocket);
            // Pass maneuver nodes to navball
            if (this.maneuverNodeUI) {
                const nodes = this.maneuverNodeUI.manager.nodes;
                this.navballRenderer.setManeuverNodes(nodes, this.bodies);
            }
            // Use target body for velocity reference if set
            const referenceBody = rocket.targetBody || nearestBody;
            const velocityVector = rocket.body.velocity.sub(referenceBody.velocity);
            this.navballRenderer.render(rocket, velocityVector, nearestBody);
        }
    }

    setTarget(body: any) {
        // Find rocket
        let rocket = (this.renderer as any).currentRocket || this.currentRocket;
        if (rocket) {
            rocket.targetBody = body;
            console.log(`Target set to ${body.name}`, rocket);
        } else {
            console.error('setTarget: No rocket found!');
        }
    }

    initializeNavball() {
        const canvas = document.getElementById('navball') as HTMLCanvasElement;
        if (canvas) {
            this.navballRenderer = new NavballRenderer(canvas);
            this.createAutopilotButtons(canvas);
        } else {
            console.warn('Navball canvas not found');
        }
    }

    createAutopilotButtons(navballCanvas: HTMLCanvasElement) {
        // Get navball position
        const navballRect = navballCanvas.getBoundingClientRect();
        const navballSize = 200; // From NavballRenderer
        const navballCenterY = navballRect.top + navballSize / 2;

        // Create container for autopilot buttons
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = `${navballRect.left - 80}px`;
        container.style.top = `${navballCenterY - 60}px`;
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(2, 36px)';
        container.style.gap = '8px';

        // Helper function to create icon canvas using IconGenerator
        const createIconCanvas = (type: 'prograde' | 'retrograde' | 'target' | 'anti-target' | 'maneuver'): HTMLCanvasElement => {
            const size = 32;

            switch (type) {
                case 'prograde':
                    return IconGenerator.createProgradeIcon(size, '#FFD700');
                case 'retrograde':
                    return IconGenerator.createRetrogradeIcon(size, '#FFD700');
                case 'target':
                    return IconGenerator.createTargetIcon(size, '#C71585');
                case 'anti-target':
                    return IconGenerator.createAntiTargetIcon(size, '#C71585');
                case 'maneuver':
                    return IconGenerator.createManeuverIcon(size); // Uses default blue
            }
        };

        // Helper to create styled button
        const createAutopilotButton = (type: 'prograde' | 'retrograde' | 'target' | 'anti-target' | 'maneuver', title: string) => {
            const btn = document.createElement('button');
            btn.style.width = '32px';
            btn.style.height = '32px';
            btn.style.padding = '0';
            btn.style.cursor = 'pointer';
            btn.style.backgroundColor = 'transparent';
            btn.style.border = 'none';
            btn.style.borderRadius = '0';
            btn.style.transition = 'filter 0.2s ease';
            btn.title = title;

            const canvas = createIconCanvas(type);
            btn.appendChild(canvas);

            return btn;
        };

        // Create all autopilot buttons using helper
        const progradeBtn = createAutopilotButton('prograde', 'Prograde: Auto-align with velocity');
        const retroBtn = createAutopilotButton('retrograde', 'Retrograde: Auto-align opposite to velocity');
        const targetBtn = createAutopilotButton('target', 'Target: Auto-align toward target');
        const antiTargetBtn = createAutopilotButton('anti-target', 'Anti-Target: Auto-align away from target');
        const maneuverBtn = createAutopilotButton('maneuver', 'Maneuver: Auto-align with maneuver node');

        // Set up click handlers
        progradeBtn.onclick = () => {
            if (this.autopilotMode === 'prograde') {
                this.autopilotMode = 'off';
                progradeBtn.style.boxShadow = 'none';
            } else {
                this.autopilotMode = 'prograde';
                progradeBtn.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.9)';
                retroBtn.style.boxShadow = 'none';
                targetBtn.style.boxShadow = 'none';
                antiTargetBtn.style.boxShadow = 'none';
                maneuverBtn.style.boxShadow = 'none';
            }
        };

        retroBtn.onclick = () => {
            if (this.autopilotMode === 'retrograde') {
                this.autopilotMode = 'off';
                retroBtn.style.boxShadow = 'none';
            } else {
                this.autopilotMode = 'retrograde';
                retroBtn.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.9)';
                progradeBtn.style.boxShadow = 'none';
                targetBtn.style.boxShadow = 'none';
                antiTargetBtn.style.boxShadow = 'none';
                maneuverBtn.style.boxShadow = 'none';
            }
        };

        targetBtn.onclick = () => {
            if (this.autopilotMode === 'target') {
                this.autopilotMode = 'off';
                targetBtn.style.boxShadow = 'none';
            } else {
                this.autopilotMode = 'target';
                targetBtn.style.boxShadow = '0 0 15px rgba(199, 21, 133, 0.9)';
                progradeBtn.style.boxShadow = 'none';
                retroBtn.style.boxShadow = 'none';
                antiTargetBtn.style.boxShadow = 'none';
                maneuverBtn.style.boxShadow = 'none';
            }
        };

        antiTargetBtn.onclick = () => {
            if (this.autopilotMode === 'anti-target') {
                this.autopilotMode = 'off';
                antiTargetBtn.style.boxShadow = 'none';
            } else {
                this.autopilotMode = 'anti-target';
                antiTargetBtn.style.boxShadow = '0 0 15px rgba(199, 21, 133, 0.9)';
                progradeBtn.style.boxShadow = 'none';
                retroBtn.style.boxShadow = 'none';
                targetBtn.style.boxShadow = 'none';
                maneuverBtn.style.boxShadow = 'none';
            }
        };

        maneuverBtn.onclick = () => {
            if (this.autopilotMode === 'maneuver') {
                this.autopilotMode = 'off';
                maneuverBtn.style.boxShadow = 'none';
            } else {
                this.autopilotMode = 'maneuver';
                maneuverBtn.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.9)';
                progradeBtn.style.boxShadow = 'none';
                retroBtn.style.boxShadow = 'none';
                targetBtn.style.boxShadow = 'none';
                antiTargetBtn.style.boxShadow = 'none';
            }
        };

        // Store button references for updating state
        (this as any).progradeBtn = progradeBtn;
        (this as any).retroBtn = retroBtn;
        (this as any).targetBtn = targetBtn;
        (this as any).antiTargetBtn = antiTargetBtn;
        (this as any).maneuverBtn = maneuverBtn;

        container.appendChild(progradeBtn);
        container.appendChild(retroBtn);
        container.appendChild(targetBtn);
        container.appendChild(antiTargetBtn);
        container.appendChild(maneuverBtn);
        document.body.appendChild(container);

        // Add keyboard listener to disable autopilot on manual rotation
        window.addEventListener('keydown', (e) => {
            if (e.key === 'q' || e.key === 'Q' || e.key === 'd' || e.key === 'D') {
                if (this.autopilotMode !== 'off') {
                    this.autopilotMode = 'off';
                    progradeBtn.style.boxShadow = 'none';
                    retroBtn.style.boxShadow = 'none';
                    targetBtn.style.boxShadow = 'none';
                    antiTargetBtn.style.boxShadow = 'none';
                }
            }
        });
    }

    createDebugMenu() {
        const panel = document.createElement('div');
        panel.style.position = 'absolute';
        panel.style.top = '10px';
        panel.style.left = '50%';
        panel.style.transform = 'translateX(-50%)';
        panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        panel.style.color = 'white';
        panel.style.padding = '5px 10px';
        panel.style.borderRadius = '5px';
        panel.style.fontFamily = 'monospace';
        panel.style.fontSize = '12px';
        panel.style.display = 'flex';
        panel.style.gap = '10px';
        panel.style.alignItems = 'center';

        // Title
        const title = document.createElement('span');
        title.innerText = 'DEBUG:';
        title.style.fontWeight = 'bold';
        title.style.color = '#aaa';
        panel.appendChild(title);

        // Infinite Fuel Checkbox
        const fuelContainer = document.createElement('div');
        fuelContainer.style.display = 'flex';
        fuelContainer.style.alignItems = 'center';
        fuelContainer.style.gap = '5px';

        const fuelCheck = document.createElement('input');
        fuelCheck.type = 'checkbox';
        fuelCheck.id = 'debug-infinite-fuel';
        fuelCheck.onchange = (e) => {
            if (this.renderer instanceof ThreeRenderer && this.renderer.currentRocket) {
                this.renderer.currentRocket.engine.infiniteFuel = (e.target as HTMLInputElement).checked;
            }
        };

        const fuelLabel = document.createElement('label');
        fuelLabel.htmlFor = 'debug-infinite-fuel';
        fuelLabel.innerText = 'Infinite Fuel';
        fuelLabel.style.cursor = 'pointer';

        fuelContainer.appendChild(fuelCheck);
        fuelContainer.appendChild(fuelLabel);
        panel.appendChild(fuelContainer);

        // Trajectory Toggle


        // Show Colliders Toggle
        const colliderContainer = document.createElement('div');
        colliderContainer.style.display = 'flex';
        colliderContainer.style.alignItems = 'center';
        colliderContainer.style.gap = '5px';

        const colliderCheck = document.createElement('input');
        colliderCheck.type = 'checkbox';
        colliderCheck.id = 'debug-colliders';
        colliderCheck.checked = false;
        colliderCheck.onchange = (e) => {
            if (this.renderer instanceof ThreeRenderer) {
                this.renderer.showColliders = (e.target as HTMLInputElement).checked;
            }
        };

        const colliderLabel = document.createElement('label');
        colliderLabel.htmlFor = 'debug-colliders';
        colliderLabel.innerText = 'Show Colliders';
        colliderLabel.style.cursor = 'pointer';

        colliderContainer.appendChild(colliderCheck);
        colliderContainer.appendChild(colliderLabel);
        panel.appendChild(colliderContainer);

        document.body.appendChild(panel);
    }

    /**
     * Clean up UI elements
     */
    dispose() {
        // Remove all UI elements from DOM
        // We need to track elements created so we can remove them
        // For now, remove by querying for common elements

        // Remove minimap
        if (this.minimapCanvas && this.minimapCanvas.parentNode) {
            this.minimapCanvas.parentNode.removeChild(this.minimapCanvas);
        }

        // Remove rocket info panel
        if (this.rocketInfoPanel && this.rocketInfoPanel.parentNode) {
            this.rocketInfoPanel.parentNode.removeChild(this.rocketInfoPanel);
        }

        // Remove other UI elements by finding them in DOM
        // This is a bit hacky, but works for now
        // A better approach would be to track all created elements
        const elementsToRemove = [
            ...Array.from(document.querySelectorAll('div[style*="position: absolute"]')),
            ...Array.from(document.querySelectorAll('select#planet-select'))
        ];

        elementsToRemove.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }
}
