import { ManeuverNode } from '../systems/ManeuverNode';
import { ManeuverNodeManager } from '../systems/ManeuverNodeManager';
import { Vector2 } from '../core/Vector2';
import type { Rocket } from '../entities/Rocket';
import type { Body } from '../core/Body';

/**
 * ManeuverNodeUI - Handles UI for creating, editing, and interacting with maneuver nodes
 */
export class ManeuverNodeUI {
    public manager: ManeuverNodeManager;
    private rocket: Rocket | null = null;
    // bodies removed as it was unused
    private canvas: HTMLCanvasElement | null = null;
    public selectedNodeId: string | null = null;
    public draggingNodeId: string | null = null;
    public hoveredNodeId: string | null = null;

    private editorPanel: HTMLElement | null = null;

    // Hover state for ghost node
    private renderer: any = null; // Should be ThreeRenderer
    private hoverNodeTime: number | null = null;
    private hoverOrbitalCoords: { x: number; y: number } | null = null;
    private lastMouseScreenPos: Vector2 | null = null; // Current mouse position

    // Callbacks
    onNodeChanged?: () => void;

    constructor(manager: ManeuverNodeManager) {
        this.manager = manager;
    }

    /**
     * Initialize with rocket and bodies
     */
    init(rocket: Rocket, _bodies: Body[], renderer: any) {
        this.rocket = rocket;
        // this.bodies = bodies; // Removed
        this.renderer = renderer;
        this.canvas = renderer.canvas;

        this.setupEventListeners();
    }

    /**
     * Setup canvas event listeners for orbit interaction
     */
    private setupEventListeners() {
        if (!this.canvas) return;

        // Click to create/select nodes
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Mouse down for dragging
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Clear mouse pos when leaving canvas
        this.canvas.addEventListener('mouseleave', () => {
            this.lastMouseScreenPos = null;
            this.hoverNodeTime = null;
            this.hoverOrbitalCoords = null;
        });
    }

    /**
     * Handle canvas click events
     * (Now handled in MouseDown/Up for better drag support)
     */
    private handleCanvasClick(_e: MouseEvent) {
        // Deprecated in favor of MouseDown/Up
    }

    /**
     * Handle mouse down for node dragging or creation
     */
    private handleMouseDown(e: MouseEvent) {
        if (!this.renderer || !this.rocket) return;

        if (!this.renderer || !this.rocket) return;

        const rect = this.renderer.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 1. Check if clicking an existing node
        let clickedNodeId: string | null = null;

        for (const node of this.manager.nodes) {
            const worldPos = node.getWorldPosition(this.rocket, this.renderer.currentBodies);
            const screenPos = this.renderer.worldToScreen(worldPos);

            // Simple distance check (50px radius for easier clicking when zoomed out)
            const dx = screenPos.x - x;
            const dy = screenPos.y - y;

            if (dx * dx + dy * dy < 2500) { // 50px radius
                clickedNodeId = node.id;
                break;
            }
        }

        if (clickedNodeId) {
            // Start dragging existing node
            this.draggingNodeId = clickedNodeId;
            this.selectNode(clickedNodeId);
            // Disable camera controls during drag
            if (this.renderer.inputHandler) {
                this.renderer.inputHandler.enabled = false;
            }
        } else if (this.hoverNodeTime !== null) {
            // Create new node at hover position
            const newNode = this.createNodeAtTime(this.hoverNodeTime);
            if (newNode) {
                this.draggingNodeId = newNode.id; // Immediately start dragging new node
                this.selectedNodeId = newNode.id;
            }
            this.hoverNodeTime = null;
            this.hoverOrbitalCoords = null;
        }
    }

    /**
     * Handle mouse move for node dragging
     */
    /**
     * Handle mouse move for node dragging
     */
    private handleMouseMove(e: MouseEvent) {
        if (!this.renderer || !this.rocket) {
            return;
        }

        const rect = this.renderer.canvas.getBoundingClientRect();

        // Use Logical Pixels (CSS Pixels)
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Store mouse position for real-time recalc
        this.lastMouseScreenPos = new Vector2(x, y);

        // Check for hover over existing nodes
        this.hoveredNodeId = null;
        let foundHover = false;
        for (const node of this.manager.nodes) {
            const worldPos = node.getWorldPosition(this.rocket, this.renderer.currentBodies);
            const screenPos = this.renderer.worldToScreen(worldPos);
            const dx = screenPos.x - x;
            const dy = screenPos.y - y;
            if (dx * dx + dy * dy < 2500) { // 50px radius for easier interaction
                this.hoveredNodeId = node.id;
                this.renderer.canvas.style.cursor = 'pointer';
                foundHover = true;
                break;
            }
        }

        // Reset cursor if not hovering over a node
        if (!foundHover && !this.draggingNodeId) {
            this.renderer.canvas.style.cursor = 'default';
        }

        // If dragging a node, update its position
        if (this.draggingNodeId) {
            // Prevent camera from moving during drag
            e.preventDefault();
            e.stopPropagation();

            const node = this.manager.nodes.find(n => n.id === this.draggingNodeId);
            if (node) {
                // Calculate new orbital position based on mouse
                // Use the same analytic projection logic as hover
                const worldPos = this.renderer.screenToWorld(this.lastMouseScreenPos);
                const orbit = this.rocket.body.orbit;
                const parent = this.rocket.body.parent;

                if (orbit && parent) {
                    // 1. Transform world position to orbit-local coordinate system
                    const localX = worldPos.x - parent.position.x;
                    const localY = worldPos.y - parent.position.y;
                    const cosO = Math.cos(orbit.omega);
                    const sinO = Math.sin(orbit.omega);
                    const orbitX = localX * cosO + localY * sinO;
                    const orbitY = -localX * sinO + localY * cosO;

                    // 2. Calculate True Anomaly (nu)
                    let nu = Math.atan2(orbitY, orbitX);
                    if (nu < 0) nu += 2 * Math.PI;

                    // 3. Convert to Eccentric Anomaly (E)
                    const e = orbit.e;
                    const tanE2 = Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2);
                    let E = 2 * Math.atan(tanE2);
                    if (E < 0) E += 2 * Math.PI;

                    // 4. Update Node
                    node.eccentricAnomaly = E;
                    node.orbitalCoords = {
                        x: orbit.a * (Math.cos(E) - e),
                        y: orbit.b * Math.sin(E)
                    };

                    // Trigger update
                    if (this.onNodeChanged) this.onNodeChanged();
                }
            }
        } else {
            // Only update ghost node hover state if not hovering over existing node
            if (!foundHover) {
                this.updateHoverState();
            }
        }
    }

    /**
     * Update hover state based on current mouse position
     */
    private updateHoverState() {
        if (!this.lastMouseScreenPos || !this.renderer || !this.rocket) {
            this.hoverNodeTime = null;
            this.hoverOrbitalCoords = null;
            return;
        }

        // Convert to world coordinates
        const worldPos = this.renderer.screenToWorld(this.lastMouseScreenPos);

        // Check distance to orbit
        // LIMIT: Only allow one node at a time
        if (this.manager.nodes.length > 0) {
            this.hoverNodeTime = null;
            this.hoverOrbitalCoords = null;
            this.renderer.canvas.style.cursor = 'default';
            return;
        }

        if (this.rocket && this.rocket.body.orbit && this.rocket.body.parent) {
            const orbit = this.rocket.body.orbit;
            const parent = this.rocket.body.parent;


            // Analytic Solution: Project mouse position to orbital plane and find angle
            // This avoids iterative search jitter entirely

            // 1. Transform world position to orbit-local coordinate system
            // Undo translation
            const localX = worldPos.x - parent.position.x;
            const localY = worldPos.y - parent.position.y;

            // Undo rotation (omega)
            const cosO = Math.cos(orbit.omega);
            const sinO = Math.sin(orbit.omega);

            // Apply inverse rotation matrix
            // [ cos  sin ] [ x ]
            // [ -sin cos ] [ y ]
            const orbitX = localX * cosO + localY * sinO;
            const orbitY = -localX * sinO + localY * cosO;

            // 2. Calculate True Anomaly (nu) from angle
            // atan2 returns angle in [-PI, PI], normalize to [0, 2PI]
            let nu = Math.atan2(orbitY, orbitX);
            if (nu < 0) nu += 2 * Math.PI;

            // 3. Convert True Anomaly to Eccentric Anomaly (E)
            // tan(E/2) = sqrt((1-e)/(1+e)) * tan(nu/2)
            const e = orbit.e;
            const tanE2 = Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2);
            let E = 2 * Math.atan(tanE2);

            // Adjust quadrant for E
            if (E < 0) E += 2 * Math.PI;

            // For full 0-2PI range consistency with atan2
            // If nu is in [PI, 2PI], E should also be in [PI, 2PI] roughly
            // The formula above gives E in [-PI, PI], so the simple check E < 0 handles it mostly
            // But let's be precise:
            // If we use the standard conversion, E and nu are in the same half-plane.

            // 4. Calculate exact position on orbit from E
            const x = orbit.a * (Math.cos(E) - e);
            const y = orbit.b * Math.sin(E);

            // 5. Calculate time from E (Mean Anomaly)
            // M = E - e*sin(E)
            const M = E - e * Math.sin(E);

            // t = (M - M0) / n
            // Handle wrapping
            let deltaM = M - (this.rocket.body.meanAnomaly || 0);
            while (deltaM < 0) deltaM += 2 * Math.PI;

            const mu = 6.67430e-11 * parent.mass;
            const n = Math.sqrt(mu / Math.pow(orbit.a, 3));
            const timeToNode = deltaM / n;

            // 6. Check distance to valid orbit point
            // Rotate back to world space to check distance
            const rotX = x * cosO - y * sinO;
            const rotY = x * sinO + y * cosO;
            const finalWorldPos = new Vector2(parent.position.x + rotX, parent.position.y + rotY);

            // Calculate distance in screen pixels using the renderer's projection
            // This avoids double-scaling issues with manual calculation
            const screenPos = this.renderer.worldToScreen(finalWorldPos);
            // lastMouseScreenPos is already in canvas-relative coordinates
            const dx = screenPos.x - this.lastMouseScreenPos.x;
            const dy = screenPos.y - this.lastMouseScreenPos.y;
            const screenDistPixels = Math.sqrt(dx * dx + dy * dy);

            if (screenDistPixels < 30) {
                this.hoverNodeTime = timeToNode;
                this.hoverOrbitalCoords = { x, y };
                this.renderer.canvas.style.cursor = 'pointer';
            } else {
                this.hoverNodeTime = null;
                this.hoverOrbitalCoords = null;
                this.renderer.canvas.style.cursor = 'default';
            }
        }
    }

    /**
     * Handle mouse up to end dragging
     */
    /**
     * Handle mouse up to end dragging
     */
    private handleMouseUp(_e: MouseEvent) {
        this.draggingNodeId = null;
        // Re-enable camera controls
        if (this.renderer && this.renderer.inputHandler) {
            this.renderer.inputHandler.enabled = true;
        }
    }

    /**
     * Update hover state (call each frame to keep ghost node under mouse)
     */
    update() {
        // Always update if we have a mouse position
        // This ensures the ghost node tracks the orbit even if the camera moves but mouse is static
        this.updateHoverState();
    }

    /**
     * Get current hover position (using orbital coords like real nodes)
     */
    getHoverPosition(): Vector2 | null {
        if (!this.hoverOrbitalCoords || !this.rocket) {
            return null;
        }

        const orbit = this.rocket.body.orbit;
        const parent = this.rocket.body.parent;

        if (!orbit || !parent) {
            return null;
        }

        // Use same calculation as ManeuverNode.getWorldPosition()
        const x = this.hoverOrbitalCoords.x;
        const y = this.hoverOrbitalCoords.y;

        // Rotate by current omega
        const cosO = Math.cos(orbit.omega);
        const sinO = Math.sin(orbit.omega);
        const rotX = x * cosO - y * sinO;
        const rotY = x * sinO + y * cosO;

        return new Vector2(parent.position.x + rotX, parent.position.y + rotY);
    }

    /**
     * Create a new maneuver node at a specific orbit time
     */
    createNodeAtTime(orbitTime: number): ManeuverNode | null {
        // Use stored orbital coords from hover
        if (!this.hoverOrbitalCoords || !this.rocket) {
            return null;
        }

        const orbit = this.rocket.body.orbit;
        if (!orbit) {
            return null;
        }

        // Calculate E for this time (for reference, though not used for position)
        const parent = this.rocket.body.parent;
        if (!parent) {
            return null;
        }

        const mu = 6.67430e-11 * parent.mass;
        const n = Math.sqrt(mu / Math.pow(orbit.a, 3));
        const currentM = this.rocket.body.meanAnomaly || 0;
        const futureM = currentM + n * orbitTime;

        let E = futureM;
        for (let j = 0; j < 5; j++) {
            E = E - (E - orbit.e * Math.sin(E) - futureM) / (1 - orbit.e * Math.cos(E));
        }

        // Create node with fixed orbital coordinates and default delta-v
        const node = new ManeuverNode(
            E,
            { x: this.hoverOrbitalCoords.x, y: this.hoverOrbitalCoords.y },
            orbitTime,
            50, // Default 50 m/s prograde so trajectory is visible
            0,
            0
        );

        this.manager.addNode(node);
        this.selectNode(node.id);
        this.showEditorPanel(node);

        if (this.onNodeChanged) {
            this.onNodeChanged();
        }

        return node;
    }

    /**
     * Select a maneuver node
     */
    selectNode(id: string) {
        this.selectedNodeId = id;
        const node = this.manager.getNode(id);
        if (node) {
            this.showEditorPanel(node);
        }
    }

    /**
     * Show the editor panel for a maneuver node
     */
    private showEditorPanel(node: ManeuverNode) {
        // Remove existing panel
        if (this.editorPanel) {
            this.editorPanel.remove();
        }

        // Create editor panel
        const panel = document.createElement('div');
        panel.id = 'maneuver-editor';
        panel.style.position = 'absolute';
        panel.style.top = '20px';
        panel.style.right = '20px'; // Move to right side
        panel.style.left = 'auto';
        panel.style.transform = 'none';
        panel.style.width = '350px';
        panel.style.backgroundColor = 'rgba(30, 30, 30, 0.95)';
        panel.style.border = '2px solid #4a9eff';
        panel.style.borderRadius = '8px';
        panel.style.padding = '15px';
        panel.style.color = '#fff';
        panel.style.fontFamily = 'monospace';
        panel.style.zIndex = '1000';

        // Title
        const title = document.createElement('h3');
        title.textContent = 'Maneuver Node';
        title.style.margin = '0 0 10px 0';
        title.style.color = '#4a9eff';
        title.style.textAlign = 'center';
        panel.appendChild(title);

        // Calculate available Delta-V first
        const availableDv = this.rocket ? this.rocket.engine.getDeltaV(this.rocket.dryMass) : 2000;
        const limit = Math.max(2000, availableDv); // At least 2000, or more if rocket has it

        // Total Delta-V display
        const totalDvDisplay = document.createElement('div');
        totalDvDisplay.style.textAlign = 'center';
        totalDvDisplay.style.fontSize = '18px';
        totalDvDisplay.style.marginBottom = '15px';

        // Calculate if we're at the limit
        const totalDv = node.getTotalΔv();
        const isAtLimit = totalDv >= limit * 0.99; // 99% threshold
        const color = isAtLimit ? '#ff0000' : '#ffffff';

        totalDvDisplay.innerHTML = `<span style="color: white;"><strong>Total Δv:</strong></span> <span style="color: ${color};">${totalDv.toFixed(1)} m/s</span>`;
        panel.appendChild(totalDvDisplay);

        // Create slider for each delta-v component
        this.createSlider(panel, 'Prograde', node, 'progradeΔv', totalDvDisplay, limit);
        // Normal is redundant in 2D
        // this.createSlider(panel, 'Normal', node, 'normalΔv', totalDvDisplay, limit);
        this.createSlider(panel, 'Radial', node, 'radialΔv', totalDvDisplay, limit);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ Delete Node';
        deleteBtn.style.width = '100%';
        deleteBtn.style.padding = '10px';
        deleteBtn.style.marginTop = '15px';
        deleteBtn.style.backgroundColor = '#ff4444';
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '4px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.fontWeight = 'bold';
        deleteBtn.onclick = () => {
            this.manager.removeNode(node.id);
            panel.remove();
            this.selectedNodeId = null;
            if (this.onNodeChanged) {
                this.onNodeChanged();
            }
        };
        panel.appendChild(deleteBtn);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.width = '100%';
        closeBtn.style.padding = '8px';
        closeBtn.style.marginTop = '8px';
        closeBtn.style.backgroundColor = '#5a5a5a';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => {
            panel.remove();
            this.selectedNodeId = null;
        };
        panel.appendChild(closeBtn);

        document.body.appendChild(panel);
        this.editorPanel = panel;
    }

    /**
     * Create a delta-v slider control
     */
    private createSlider(
        panel: HTMLElement,
        label: string,
        node: ManeuverNode,
        property: 'progradeΔv' | 'normalΔv' | 'radialΔv',
        totalDvDisplay: HTMLElement,
        limit: number
    ) {
        const container = document.createElement('div');
        container.style.marginBottom = '12px';

        const labelDiv = document.createElement('div');
        labelDiv.style.display = 'flex';
        labelDiv.style.justifyContent = 'space-between';
        labelDiv.style.marginBottom = '5px';

        const labelText = document.createElement('span');
        labelText.textContent = label;
        labelDiv.appendChild(labelText);

        const valueText = document.createElement('span');
        valueText.textContent = `${node[property].toFixed(1)} m/s`;
        valueText.style.color = '#00ff00';
        labelDiv.appendChild(valueText);

        container.appendChild(labelDiv);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = (-limit).toString();
        slider.max = limit.toString();
        slider.step = '0.5';
        slider.value = node[property].toString();
        slider.style.width = '100%';
        slider.oninput = () => {
            let value = parseFloat(slider.value);

            // Constrain value based on available delta-v
            // Total^2 = Prograde^2 + Radial^2
            // We want Total <= Limit
            // So NewComponent^2 <= Limit^2 - OtherComponent^2

            const otherProp = property === 'progradeΔv' ? 'radialΔv' : 'progradeΔv';
            const otherValue = node[otherProp];
            const maxAllowed = Math.sqrt(Math.max(0, limit * limit - otherValue * otherValue));

            // Clamp value
            if (Math.abs(value) > maxAllowed) {
                value = Math.sign(value) * maxAllowed;
                slider.value = value.toString();
            }

            node[property] = value;
            valueText.textContent = `${value.toFixed(1)} m/s`;

            // Update total display with dynamic color
            const totalDv = node.getTotalΔv();
            const isAtLimit = totalDv >= limit * 0.99;
            const color = isAtLimit ? '#ff0000' : '#ffffff';
            totalDvDisplay.innerHTML = `<span style="color: white;"><strong>Total Δv:</strong></span> <span style="color: ${color};">${totalDv.toFixed(1)} m/s</span>`;

            if (this.onNodeChanged) {
                this.onNodeChanged();
            }
        };
        container.appendChild(slider);

        // Fine-tune buttons
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '5px';
        btnContainer.style.marginTop = '5px';

        const createBtn = (text: string, delta: number) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.style.flex = '1';
            btn.style.padding = '4px';
            btn.style.fontSize = '11px';
            btn.style.backgroundColor = '#3a3a3a';
            btn.style.color = 'white';
            btn.style.border = '1px solid #555';
            btn.style.borderRadius = '3px';
            btn.style.cursor = 'pointer';
            btn.onclick = () => {
                let newValue = node[property] + delta;

                // Constrain value
                const otherProp = property === 'progradeΔv' ? 'radialΔv' : 'progradeΔv';
                const otherValue = node[otherProp];
                const maxAllowed = Math.sqrt(Math.max(0, limit * limit - otherValue * otherValue));

                // Clamp
                newValue = Math.max(-maxAllowed, Math.min(maxAllowed, newValue));

                node[property] = newValue;
                slider.value = node[property].toString();
                valueText.textContent = `${node[property].toFixed(1)} m/s`;

                // Update total display with dynamic color
                const totalDv = node.getTotalΔv();
                const isAtLimit = totalDv >= limit * 0.99;
                const color = isAtLimit ? '#ff0000' : '#ffffff';
                totalDvDisplay.innerHTML = `<span style="color: white;"><strong>Total Δv:</strong></span> <span style="color: ${color};">${totalDv.toFixed(1)} m/s</span>`;

                if (this.onNodeChanged) {
                    this.onNodeChanged();
                }
            };
            return btn;
        };

        btnContainer.appendChild(createBtn('-10', -10));
        btnContainer.appendChild(createBtn('-1', -1));
        btnContainer.appendChild(createBtn('-0.1', -0.1));
        btnContainer.appendChild(createBtn('+0.1', 0.1));
        btnContainer.appendChild(createBtn('+1', 1));
        btnContainer.appendChild(createBtn('+10', 10));

        container.appendChild(btnContainer);
        panel.appendChild(container);
    }

    /**
     * Render maneuver node markers on the canvas
     */
    renderNodes(ctx: CanvasRenderingContext2D, worldToScreen: (pos: Vector2) => { x: number; y: number }) {
        if (!this.rocket) return;

        // Render ghost node if hovering
        const hoverPos = this.getHoverPosition();
        if (this.hoverNodeTime !== null && hoverPos) {
            const screenPos = worldToScreen(hoverPos);
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        // Render existing nodes
        this.manager.nodes.forEach(node => {
            const worldPos = node.getWorldPosition(this.rocket!, this.renderer.currentBodies);
            const screenPos = worldToScreen(worldPos);

            // Draw node marker
            ctx.beginPath();
            // Scale up if hovered or selected
            const isHovered = node.id === this.hoveredNodeId;
            const isSelected = node.id === this.selectedNodeId;
            const radius = (isHovered || isSelected) ? 8 : 5;

            ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? '#ffffff' : '#00ffff';
            ctx.fill();

            // Add glow/ring for hovered/selected
            if (isHovered || isSelected) {
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, radius + 3, 0, Math.PI * 2);
                ctx.strokeStyle = isSelected ? '#ffffff' : '#00ffff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Draw label if selected or hovered
            if (isSelected || isHovered) {
                ctx.fillStyle = 'white';
                ctx.font = '12px monospace';
                ctx.fillText(`T-${node.getTimeFromNow(this.rocket!).toFixed(0)}s`, screenPos.x + 15, screenPos.y);
                ctx.fillText(`Δv: ${node.getTotalΔv().toFixed(1)}`, screenPos.x + 15, screenPos.y + 15);
            }

            // Draw delta-v vector arrow
            if (node.getTotalΔv() > 0.1) {
                const dvAngle = node.getΔvDirection(this.rocket!, this.renderer.currentBodies);
                // arrowLen removed as it was unused
                const arrowLength = Math.min(50, node.getTotalΔv() / 2);

                const endX = screenPos.x + Math.cos(dvAngle) * arrowLength;
                const endY = screenPos.y + Math.sin(dvAngle) * arrowLength;

                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(screenPos.x, screenPos.y);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Arrowhead
                const arrowSize = 8;
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - arrowSize * Math.cos(dvAngle - Math.PI / 6),
                    endY - arrowSize * Math.sin(dvAngle - Math.PI / 6)
                );
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - arrowSize * Math.cos(dvAngle + Math.PI / 6),
                    endY - arrowSize * Math.sin(dvAngle + Math.PI / 6)
                );
                ctx.stroke();
            }

            ctx.restore();
        });
    }

    /**
     * Clean up UI elements
     */
    dispose() {
        if (this.editorPanel) {
            this.editorPanel.remove();
            this.editorPanel = null;
        }
    }
}
