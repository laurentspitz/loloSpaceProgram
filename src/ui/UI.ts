import { Renderer } from '../Renderer';
import { ThreeRenderer } from '../rendering/ThreeRenderer';
import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';

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
    deltaVDisplay: HTMLElement | null = null;
    massDisplay: HTMLElement | null = null;
    currentRocket: any = null; // Reference to rocket for throttle control

    constructor(renderer: Renderer | ThreeRenderer) {
        this.renderer = renderer;
        this.createControls();
        this.createMinimap();
        this.createRocketInfoPanel();
        this.createMinimap();
        this.createRocketInfoPanel();
        this.createControlsHelp();
        this.createDebugMenu();
        this.setupInput();
    }

    init(bodies: Body[]) {
        this.bodies = bodies;
        this.createSelectionDropdown();
    }

    createControls() {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '10px';
        container.style.left = '10px';
        container.style.display = 'flex';
        container.style.gap = '10px';

        const zoomInBtn = document.createElement('button');
        zoomInBtn.innerText = 'Zoom In (+)';
        zoomInBtn.onclick = () => this.zoom(1.5);

        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.innerText = 'Zoom Out (-)';
        zoomOutBtn.onclick = () => this.zoom(1 / 1.5);

        const orbitBtn = document.createElement('button');
        orbitBtn.innerText = 'Toggle Orbits';
        orbitBtn.onclick = () => {
            this.renderer.showOrbits = !this.renderer.showOrbits;
        };

        const focusRocketBtn = document.createElement('button');
        focusRocketBtn.innerText = '🚀 Focus Rocket';
        focusRocketBtn.style.backgroundColor = '#E74C3C';
        focusRocketBtn.style.color = 'white';
        focusRocketBtn.style.fontWeight = 'bold';
        focusRocketBtn.onclick = () => {
            // Check if renderer is ThreeRenderer (has currentRocket property)
            if (this.renderer instanceof ThreeRenderer && this.renderer.currentRocket) {
                this.renderer.followedBody = this.renderer.currentRocket.body;
                const select = document.getElementById('planet-select') as HTMLSelectElement;
                if (select) select.value = "";
            }
        };

        container.appendChild(zoomInBtn);
        container.appendChild(zoomOutBtn);
        container.appendChild(orbitBtn);
        container.appendChild(focusRocketBtn);
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

        const select = document.createElement('select');
        select.id = 'planet-select';

        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.text = "Select Body (Free Cam)";
        select.appendChild(defaultOption);

        // Group bodies by system (Parent)
        // 1. Find root bodies (Sun)
        const roots = this.bodies.filter(b => !b.parent);

        // Helper to add options recursively? Or just 1 level deep for now (Planet -> Moons)
        // Solar System structure is Sun -> Planets -> Moons

        // Add Sun
        roots.forEach(root => {
            const option = document.createElement('option');
            option.value = root.name;
            option.text = root.name;
            select.appendChild(option);

            // Find children (Planets)
            const planets = this.bodies.filter(b => b.parent === root);
            planets.forEach(planet => {
                // Create group for Planet
                const group = document.createElement('optgroup');
                group.label = planet.name + " System";

                // Add Planet itself to the group (or before?)
                // Usually optgroup contains children.
                // Let's add the planet as the first option in its group
                const planetOption = document.createElement('option');
                planetOption.value = planet.name;
                planetOption.text = planet.name;
                group.appendChild(planetOption);

                // Find moons
                const moons = this.bodies.filter(b => b.parent === planet);
                moons.forEach(moon => {
                    const moonOption = document.createElement('option');
                    moonOption.value = moon.name;
                    moonOption.text = "  " + moon.name; // Indent?
                    group.appendChild(moonOption);
                });

                select.appendChild(group);
            });
        });

        select.onchange = (e) => {
            const name = (e.target as HTMLSelectElement).value;
            if (name === "") {
                this.renderer.followedBody = null;
            } else {
                const body = this.bodies.find(b => b.name === name);
                if (body) {
                    this.renderer.followedBody = body;
                }
            }
        };

        container.appendChild(select);
        document.body.appendChild(container);
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
                return; // Don't start drag if clicked on body? Or maybe allow both?
            }

            // If we are following a body, clicking elsewhere might break follow?
            // Or maybe drag breaks follow?
            // Let's say drag breaks follow.

            isDragging = true;
            lastPos = new Vector2(e.clientX, e.clientY);

            if (this.renderer.followedBody) {
                this.renderer.followedBody = null;
                const select = document.getElementById('planet-select') as HTMLSelectElement;
                if (select) select.value = "";

                // We need to set offset to current position so it doesn't jump
                // Current center was followedBody.position
                // New offset should be followedBody.position
                this.renderer.offset = this.renderer.getCenter();
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const currentPos = new Vector2(e.clientX, e.clientY);
            const delta = currentPos.sub(lastPos);

            this.renderer.offset = this.renderer.offset.sub(delta.scale(1 / this.renderer.scale));

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

        // Throttle slider
        const throttleSliderContainer = document.createElement('div');
        throttleSliderContainer.style.marginBottom = '8px';

        const throttleSlider = document.createElement('input');
        throttleSlider.type = 'range';
        throttleSlider.min = '0';
        throttleSlider.max = '100';
        throttleSlider.value = '0';
        throttleSlider.style.width = '100%';
        throttleSlider.style.cursor = 'pointer';

        throttleSlider.oninput = (e) => {
            const value = parseInt((e.target as HTMLInputElement).value) / 100;
            if (this.currentRocket?.controls) {
                this.currentRocket.controls.setThrottle(value);
            }
        };

        throttleSliderContainer.appendChild(throttleSlider);
        panel.appendChild(throttleSliderContainer);
        this.throttleSlider = throttleSlider;

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
            <div>Thrust: Z / S</div>
            <div>Rotate: Q / D</div>
            <div>Fine Ctrl: Shift / Ctrl</div>
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
            this.fuelDisplay.innerText = `${fuel}%`;
            this.fuelDisplay.style.color = info.fuel < 10 ? '#ff4444' : (info.fuel < 30 ? '#ffbb33' : '#00C851');
        }

        if (this.deltaVDisplay) {
            this.deltaVDisplay.innerText = `${info.deltaV.toFixed(0)} m/s`;
        }

        if (this.massDisplay) {
            // Display in tons if > 1000kg
            const mass = info.mass;
            if (mass >= 1000) {
                this.massDisplay.innerText = `${(mass / 1000).toFixed(2)} t`;
            } else {
                this.massDisplay.innerText = `${mass.toFixed(0)} kg`;
            }
        }

        if (this.throttleDisplay) {
            const throttle = (info.throttle * 100).toFixed(0);
            this.throttleDisplay.innerText = `${throttle}%`;
        }

        // Update slider to match current throttle (unless user is dragging it)
        if (this.throttleSlider && !this.throttleSlider.matches(':active')) {
            this.throttleSlider.value = (info.throttle * 100).toFixed(0);
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
            this.velocityDisplay.innerText = `${velocity.toFixed(0)} m/s`;
        }

        if (this.altitudeDisplay) {
            if (nearestBody) {
                const altKm = (minDist / 1000).toFixed(1);
                this.altitudeDisplay.innerText = `${altKm} km`;

                // Calculate gravity at this position: g = GM/r^2
                const r = rocket.body.position.distanceTo(nearestBody.position);
                const g = (6.674e-11 * nearestBody.mass) / (r * r);
                if (this.gravityDisplay) {
                    this.gravityDisplay.innerText = `${g.toFixed(2)} m/s²`;
                }
            } else {
                this.altitudeDisplay.innerText = 'N/A';
                if (this.gravityDisplay) this.gravityDisplay.innerText = '0 m/s²';
            }
        }
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
        const trajContainer = document.createElement('div');
        trajContainer.style.display = 'flex';
        trajContainer.style.alignItems = 'center';
        trajContainer.style.gap = '5px';

        const trajCheck = document.createElement('input');
        trajCheck.type = 'checkbox';
        trajCheck.id = 'debug-trajectory';
        trajCheck.checked = false; // Default off
        trajCheck.onchange = (e) => {
            if (this.renderer instanceof ThreeRenderer) {
                this.renderer.showTrajectory = (e.target as HTMLInputElement).checked;
            }
        };

        const trajLabel = document.createElement('label');
        trajLabel.htmlFor = 'debug-trajectory';
        trajLabel.innerText = 'Show Trajectory';
        trajLabel.style.cursor = 'pointer';

        trajContainer.appendChild(trajCheck);
        trajContainer.appendChild(trajLabel);
        panel.appendChild(trajContainer);

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

        console.log('UI disposed');
    }
}
