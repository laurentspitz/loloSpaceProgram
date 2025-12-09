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
    electricityDisplay: HTMLElement | null = null;
    electricityGaugeBar: HTMLElement | null = null;
    timeSpeedDisplay: HTMLElement | null = null;
    lastTimeWarp: number = 1; // Stores warp speed before pausing for settings

    // Autopilot state
    autopilotMode: 'off' | 'prograde' | 'retrograde' | 'target' | 'anti-target' | 'maneuver' = 'off';
    rcsBtn: HTMLButtonElement | null = null;
    sasBtn: HTMLButtonElement | null = null;

    // Navball
    navballRenderer: NavballRenderer | null = null;

    // Maneuver nodes
    maneuverNodeManager: ManeuverNodeManager | null = null;
    maneuverNodeUI: ManeuverNodeUI | null = null;

    // Container for left-side panels to stack them vertically
    leftPanelContainer: HTMLDivElement | null = null;

    constructor(renderer: Renderer | ThreeRenderer) {
        this.renderer = renderer;
        // precise order of creation to ensure proper layering if needed, 
        // though flex container handles layout.
        this.initLeftPanelContainer();
        this.createControls();
        this.createMinimap();
        this.createRocketInfoPanel();
        this.createDebugMenu();
        this.setupInput();
        this.initializeNavball();
    }

    initLeftPanelContainer() {
        if (!this.leftPanelContainer) {
            this.leftPanelContainer = document.createElement('div');
            this.leftPanelContainer.style.position = 'absolute';
            this.leftPanelContainer.style.top = '10px';
            this.leftPanelContainer.style.left = '10px';
            this.leftPanelContainer.style.display = 'flex';
            this.leftPanelContainer.style.flexDirection = 'column';
            this.leftPanelContainer.style.gap = '10px';
            this.leftPanelContainer.style.pointerEvents = 'none'; // Let clicks pass through gaps
            document.body.appendChild(this.leftPanelContainer);
        }
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

    /**
     * Helper to create a collapsible panel
     */
    private createCollapsiblePanel(titleText: string, content: HTMLElement, isCollapsed: boolean = true, width: string = '200px'): { container: HTMLDivElement, toggle: () => void } {
        const container = document.createElement('div');
        container.className = 'game-panel'; // Use global class
        container.style.minWidth = width;
        // Keep these if specific positioning logic relies on them, otherwise class handles margin
        container.style.marginBottom = '0';

        // Title bar
        const titleBar = document.createElement('div');
        titleBar.className = 'panel-header';
        if (isCollapsed) titleBar.classList.add('collapsed');

        const title = document.createElement('div');
        title.className = 'panel-title';
        title.innerText = titleText;

        const toggleBtn = document.createElement('span');
        toggleBtn.className = 'panel-toggle';
        toggleBtn.innerText = isCollapsed ? '+' : '−';

        titleBar.appendChild(title);
        titleBar.appendChild(toggleBtn);
        container.appendChild(titleBar);

        // Content Container
        const contentContainer = document.createElement('div');
        contentContainer.style.overflow = 'hidden';
        contentContainer.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';

        // Initial state
        if (isCollapsed) {
            contentContainer.style.maxHeight = '0px';
            contentContainer.style.opacity = '0';
        } else {
            contentContainer.style.maxHeight = '500px'; // Arbitrary max
            contentContainer.style.opacity = '1';
        }

        contentContainer.appendChild(content);
        container.appendChild(contentContainer);

        const toggle = () => {
            isCollapsed = !isCollapsed;
            toggleBtn.innerText = isCollapsed ? '+' : '−';

            if (isCollapsed) {
                contentContainer.style.maxHeight = '0px';
                contentContainer.style.opacity = '0';
                titleBar.classList.add('collapsed');
            } else {
                contentContainer.style.maxHeight = '500px';
                contentContainer.style.opacity = '1';
                titleBar.classList.remove('collapsed');
            }
        };

        titleBar.onclick = toggle;

        return { container, toggle };
    }

    createControls() {
        // Main container logic moved to initLeftPanelContainer
        // Use this.leftPanelContainer for appending

        // --- Mission Controls Panel ---
        const controlsContent = document.createElement('div');
        controlsContent.style.display = 'flex';
        controlsContent.style.flexDirection = 'column';
        controlsContent.style.gap = '5px';

        const createBtn = (text: string, onClick: () => void, title?: string) => {
            const btn = document.createElement('button');
            btn.innerText = text;
            if (title) btn.title = title;
            btn.className = 'game-btn'; // Use global class
            btn.style.width = '100%';
            btn.onclick = onClick;
            return btn;
        };

        const focusRocketBtn = createBtn('🚀 Focus Rocket', () => {
            if (this.renderer instanceof ThreeRenderer && this.renderer.currentRocket) {
                this.renderer.followedBody = this.renderer.currentRocket.body;
                this.renderer.autoZoomToBody(this.renderer.currentRocket.body);
                // Clear dropdown selection
                const select = document.getElementById('planet-select') as HTMLSelectElement;
                if (select) select.value = "";
            }
        });
        controlsContent.appendChild(focusRocketBtn);

        // Trajectory Button
        const trajectoryBtn = createBtn('💫 Trajectory', () => {
            if (this.renderer instanceof ThreeRenderer) {
                this.renderer.showTrajectory = !this.renderer.showTrajectory;
                trajectoryBtn.style.backgroundColor = this.renderer.showTrajectory ? '#4a9eff' : ''; // Keep dynamic style
            }
        }, 'Toggle Trajectory');
        controlsContent.appendChild(trajectoryBtn);

        // Reset Camera
        const resetCamBtn = createBtn('🎥 Reset Camera', () => {
            if (this.renderer instanceof ThreeRenderer) {
                this.renderer.resetCamera();
            }
        });
        controlsContent.appendChild(resetCamBtn);

        // ⚙️ SETTINGS BUTTON (Moved here)
        const settingsBtn = createBtn('⚙️ SETTINGS', async () => {
            // PAUSE GAME
            this.lastTimeWarp = this.currentTimeWarp;
            if (this.currentTimeWarp !== 0) {
                this.setTimeWarp(0);
            }

            // OPEN SETTINGS MODAL
            const { SettingsPanel } = await import('./SettingsPanel');
            const panel = new SettingsPanel(() => {
                // RESUME GAME ON CLOSE
                panel.dispose();

                const resumeSpeed = (this as any).lastTimeWarp || 1;
                if (resumeSpeed > 0) {
                    this.setTimeWarp(resumeSpeed);
                }
            });
        });
        // Insert Settings button before Save/Exit or at layout discretion. 
        // User said "with other buttons". Let's put it above Back to Menu?
        // Current order: Reset Camera, Back, Save, Load.
        // Let's append it to controlsContent alongside others.
        controlsContent.insertBefore(settingsBtn, resetCamBtn.nextSibling); // Put it after Reset Camera button

        // Back to Menu Button
        const backBtn = createBtn('⬅ Back to Menu', async () => {
            const { FirebaseService } = await import('../services/firebase');
            const { NotificationManager } = await import('./NotificationManager');
            const user = FirebaseService.auth.currentUser;

            if (user) {
                // User Logged In: Prompt to Save & Exit using Custom Dialog
                this.showConfirmDialog(
                    "Save Progress?",
                    "Would you like to SAVE your progress before exiting to the main menu?",
                    async () => {
                        // YES -> Open Save Selector
                        const { SaveSlotSelector } = await import('./SaveSlotSelector');
                        const { SaveSlotManager } = await import('../services/SaveSlotManager');

                        const selector = new SaveSlotSelector('save', async (slotId) => {
                            try {
                                if ((window as any).game) {
                                    const state = (window as any).game.serializeState();
                                    await SaveSlotManager.saveToSlot(slotId, state, user.uid);
                                    NotificationManager.show("Game Saved! Exiting...", 'success');
                                    setTimeout(() => window.location.reload(), 1000);
                                } else {
                                    window.location.reload();
                                }
                            } catch (e: any) {
                                console.error("Save failed", e);
                                NotificationManager.show("Save failed! NOT escaping.", 'error');
                            }
                        });
                        await selector.show();
                    },
                    () => {
                        // NO -> Confirm Exit without saving
                        this.showConfirmDialog(
                            "Exit without Saving?",
                            "Are you sure? Unsaved progress will be lost.",
                            () => window.location.reload(),
                            () => { } // Cancel -> Do nothing
                        );
                    }
                );

            } else {
                // Guest: Warn about data loss.
                this.showConfirmDialog(
                    "Exit Game?",
                    "WARNING: You are playing as Guest. All progress will be LOST if you exit.",
                    () => window.location.reload(),
                    () => { }
                );
            }
        });
        controlsContent.appendChild(backBtn);
        const saveBtn = createBtn('💾 Save Game', async () => {
            const { FirebaseService } = await import('../services/firebase');
            const { NotificationManager } = await import('./NotificationManager');
            const { SaveSlotSelector } = await import('./SaveSlotSelector');

            const user = FirebaseService.auth.currentUser;

            if (!user) {
                NotificationManager.show("You need to be logged in to save!", 'error');
                return;
            }

            if (!this.currentRocket || !(window as any).game) {
                NotificationManager.show("No active game to save!", 'error');
                return;
            }

            // Show save slot selector
            const selector = new SaveSlotSelector('save', async (slotId) => {
                saveBtn.disabled = true;
                const originalText = saveBtn.innerText;
                saveBtn.innerText = "⏳ Saving...";

                try {
                    const state = (window as any).game.serializeState();
                    const { SaveSlotManager } = await import('../services/SaveSlotManager');
                    await SaveSlotManager.saveToSlot(slotId, state, user.uid);
                    NotificationManager.show("Game Saved!", 'success');
                } catch (e: any) {
                    console.error("Save failed", e);
                    NotificationManager.show("Save failed: " + e.message, 'error');
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.innerText = originalText;
                }
            });

            await selector.show();
        });
        controlsContent.appendChild(saveBtn);

        // Create Collapsible Panel for Controls
        const { container: controlsPanel } = this.createCollapsiblePanel('MISSION CONTROLS', controlsContent, true); // Default collapsed

        // Append to shared Left Panel Container
        if (this.leftPanelContainer) {
            this.leftPanelContainer.appendChild(controlsPanel);
        } else {
            // Fallback if not initialized for some reason
            document.body.appendChild(controlsPanel);
        }

        this.createTimeControls();
    }

    createTimeControls() {
        // Content Wrapper
        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.gap = '8px';

        // Date/Time Display
        const dateDisplay = document.createElement('div');
        dateDisplay.id = 'game-date-display';
        dateDisplay.style.color = '#88ccff';
        dateDisplay.style.fontFamily = 'monospace';
        dateDisplay.style.fontSize = '12px';
        dateDisplay.style.display = 'flex';
        dateDisplay.style.justifyContent = 'space-between';
        // Initial content
        dateDisplay.innerHTML = '<span style="color:#aaa">Date:</span> <span id="game-date-val">2025-12-07 00:00:00</span>';
        content.appendChild(dateDisplay);


        // Elapsed time
        const elapsedDisplay = document.createElement('div');
        elapsedDisplay.id = 'game-elapsed-display';
        elapsedDisplay.style.color = '#aaaaaa';
        elapsedDisplay.style.fontFamily = 'monospace';
        elapsedDisplay.style.fontSize = '11px';
        elapsedDisplay.style.textAlign = 'right';
        elapsedDisplay.innerText = 'T+ 00:00:00';
        content.appendChild(elapsedDisplay);

        // Divider
        const divider = document.createElement('div');
        divider.style.width = '100%';
        divider.style.height = '1px';
        divider.style.backgroundColor = '#555';
        content.appendChild(divider);

        // Time warp controls row
        const controlsRow = document.createElement('div');
        controlsRow.style.display = 'flex';
        controlsRow.style.justifyContent = 'flex-end';
        controlsRow.style.alignItems = 'center';
        controlsRow.style.gap = '2px'; // Gap between buttons

        const decreaseBtn = document.createElement('button');
        decreaseBtn.innerHTML = '&#9194;'; // Reverse/Rewind symbol
        decreaseBtn.title = "Decrease Warp (,)";
        decreaseBtn.className = 'game-btn game-btn-icon';
        decreaseBtn.onclick = () => this.changeTimeWarp(-1, speedDisplay);

        const pauseBtn = document.createElement('button');
        pauseBtn.innerHTML = '&#9208;'; // Pause symbol
        pauseBtn.title = "Stop Warp (/)";
        pauseBtn.className = 'game-btn game-btn-icon';
        pauseBtn.style.color = '#ff4444'; // Override specific color
        pauseBtn.onclick = () => this.setTimeWarp(0, speedDisplay);

        const playBtn = document.createElement('button');
        playBtn.innerHTML = '&#9654;'; // Play symbol
        playBtn.title = "Realtime (1x)";
        playBtn.className = 'game-btn game-btn-icon';
        playBtn.style.color = '#00C851';
        playBtn.onclick = () => this.setTimeWarp(1, speedDisplay);

        const increaseBtn = document.createElement('button');
        increaseBtn.innerHTML = '&#9193;'; // Fast Forward symbol
        increaseBtn.title = "Increase Warp (.)";
        increaseBtn.className = 'game-btn game-btn-icon';
        increaseBtn.onclick = () => this.changeTimeWarp(1, speedDisplay);

        controlsRow.appendChild(decreaseBtn);
        controlsRow.appendChild(pauseBtn);
        controlsRow.appendChild(playBtn);
        controlsRow.appendChild(increaseBtn);

        // Speed Display AFTER buttons
        const speedDisplay = document.createElement('span');
        speedDisplay.innerText = '1x';
        speedDisplay.style.color = '#00C851'; // Green for active time
        speedDisplay.style.fontFamily = 'monospace';
        speedDisplay.style.fontWeight = 'bold';
        speedDisplay.style.minWidth = '40px';
        speedDisplay.style.textAlign = 'center';
        speedDisplay.style.marginLeft = '5px'; // Add spacing
        this.timeSpeedDisplay = speedDisplay;
        controlsRow.appendChild(speedDisplay);

        content.appendChild(controlsRow);


        // Create Collapsible Panel
        const { container } = this.createCollapsiblePanel('TIME CONTROL', content, false, '160px');
        container.style.position = 'absolute';
        container.style.top = '10px';
        container.style.right = '10px';
        // Make it identifiable for layout if needed, though absolute right is fine.

        document.body.appendChild(container);
    }

    setTimeWarp(levelIndexOrValue: number, display?: HTMLElement) {
        // If 0 or 1 passed directly
        let newWarp = levelIndexOrValue;

        const targetDisplay = display || this.timeSpeedDisplay;
        if (!targetDisplay) return;

        // Find nearest level if it's a value
        if (!this.warpLevels.includes(newWarp)) {
            // Just set it directly if it's 0 or 1
        }

        this.currentTimeWarp = newWarp;
        targetDisplay.innerText = this.currentTimeWarp + 'x';

        // Color coding
        if (newWarp === 0) targetDisplay.style.color = '#ff4444'; // Red for pause
        else if (newWarp === 1) targetDisplay.style.color = '#00C851'; // Green for realtime
        else targetDisplay.style.color = '#ffbb33'; // Orange for warp

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
        // Body list
        const bodyList = document.createElement('div');
        bodyList.id = 'body-list';
        bodyList.style.maxHeight = '400px';
        bodyList.style.overflowY = 'auto';

        // Recursive function to build hierarchy
        const buildHierarchy = (bodies: Body[], parentElement: HTMLElement, indent: number) => {
            bodies.forEach(body => {
                this.addBodyRow(parentElement, body, indent);
                if (body.children && body.children.length > 0) {
                    // Create a container for children
                    const childrenContainer = document.createElement('div');
                    // Ensure children are visible
                    childrenContainer.style.display = 'block';
                    parentElement.appendChild(childrenContainer);
                    buildHierarchy(body.children, childrenContainer, indent + 1);
                }
            });
        };

        // Find root bodies (those without parents)
        // This handles multiple roots (like Twin stars if any, or separate systems)
        const roots = this.bodies.filter(b => !b.parent);
        buildHierarchy(roots, bodyList, 0);

        const { container } = this.createCollapsiblePanel('CELESTIAL BODIES', bodyList, true); // Default collapsed

        if (this.leftPanelContainer) {
            this.leftPanelContainer.appendChild(container);
        } else {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'absolute';
            wrapper.style.top = '150px';
            wrapper.style.left = '10px';
            wrapper.appendChild(container);
            document.body.appendChild(wrapper);
        }
    }

    /**
     * Add a row for a celestial body with Focus and Orbit buttons
     */
    private addBodyRow(parent: HTMLElement, body: Body, indentLevel: number) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '5px';
        row.style.marginBottom = '5px';
        row.style.marginLeft = `${indentLevel * 15}px`;
        row.style.alignItems = 'center';
        row.style.position = 'relative'; // For tooltip positioning

        // Add tree line visual if nested? (Optional polish)
        if (indentLevel > 0) {
            row.style.borderLeft = '1px solid rgba(255,255,255,0.2)';
            row.style.paddingLeft = '5px';
        }

        // Body name label
        const label = document.createElement('span');
        label.innerText = body.name;
        label.style.color = body.color || 'white'; // Use body color for text
        label.style.fontFamily = 'monospace';
        label.style.fontSize = '12px';
        label.style.flex = '1';
        label.style.cursor = 'help'; // Indicate hoverable

        // Tooltip logic
        if (body.description) {
            label.title = ""; // Disable default browser tooltip to use custom one

            label.onmouseenter = (e) => {
                this.showTooltip(e.clientX, e.clientY, body.name, body.description!);
            };
            label.onmouseleave = () => {
                this.hideTooltip();
            };
        }

        row.appendChild(label);

        // Focus button
        const focusBtn = document.createElement('button');
        focusBtn.innerText = '👁️';
        focusBtn.title = `Focus on ${body.name}`;
        focusBtn.style.padding = '2px 6px';
        focusBtn.style.fontSize = '10px';
        focusBtn.style.backgroundColor = '#333';
        focusBtn.style.border = '1px solid #555';
        focusBtn.style.color = 'white';
        focusBtn.style.cursor = 'pointer';
        focusBtn.onclick = () => {
            this.renderer.followedBody = body;
            if (this.renderer instanceof ThreeRenderer) {
                this.renderer.autoZoomToBody(body);
            }
        };
        row.appendChild(focusBtn);

        // Orbit button
        const orbitBtn = document.createElement('button');
        orbitBtn.innerText = '🛸';
        orbitBtn.title = `Orbit ${body.name}`;
        orbitBtn.style.padding = '2px 6px';
        orbitBtn.style.fontSize = '10px';
        orbitBtn.style.backgroundColor = '#333';
        orbitBtn.style.border = '1px solid #555';
        orbitBtn.style.color = 'white';
        orbitBtn.style.cursor = 'pointer';
        orbitBtn.style.display = (body.type === 'star') ? 'none' : 'inline-block'; // Hide orbit for star usually? Or keep it? kept in original update. Let's keep it but maybe hide for distant stars? For now kept.
        orbitBtn.onclick = () => {
            this.placeRocketInOrbit(body);
        };
        row.appendChild(orbitBtn);

        // Target button
        const targetBtn = document.createElement('button');
        targetBtn.innerText = '🎯';
        targetBtn.title = `Set ${body.name} as Target`;
        targetBtn.style.padding = '2px 6px';
        targetBtn.style.fontSize = '10px';
        targetBtn.style.backgroundColor = '#333';
        targetBtn.style.border = '1px solid #555';
        targetBtn.style.color = 'white';
        targetBtn.style.cursor = 'pointer';
        targetBtn.onclick = () => {
            this.setTarget(body);
        };
        row.appendChild(targetBtn);

        parent.appendChild(row);
    }

    private tooltipElement: HTMLElement | null = null;

    private showTooltip(x: number, y: number, title: string, description: string) {
        if (!this.tooltipElement) {
            this.tooltipElement = document.createElement('div');
            this.tooltipElement.style.position = 'fixed'; // Fixed relative to viewport
            this.tooltipElement.style.backgroundColor = 'rgba(20, 20, 30, 0.95)';
            this.tooltipElement.style.border = '1px solid #444';
            this.tooltipElement.style.padding = '8px';
            this.tooltipElement.style.borderRadius = '4px';
            this.tooltipElement.style.color = '#ddd';
            this.tooltipElement.style.fontFamily = 'sans-serif'; // Cleaner font for description
            this.tooltipElement.style.fontSize = '12px';
            this.tooltipElement.style.maxWidth = '250px';
            this.tooltipElement.style.zIndex = '1000';
            this.tooltipElement.style.pointerEvents = 'none'; // Don't block mouse
            this.tooltipElement.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
            document.body.appendChild(this.tooltipElement);
        }

        this.tooltipElement.innerHTML = `<strong style="color:white; display:block; margin-bottom:4px">${title}</strong>${description}`;
        this.tooltipElement.style.display = 'block';

        // Position to the right of the cursor
        this.tooltipElement.style.left = (x + 15) + 'px';
        this.tooltipElement.style.top = y + 'px';
    }

    private hideTooltip() {
        if (this.tooltipElement) {
            this.tooltipElement.style.display = 'none';
        }
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
        // Initial UI Update
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
        // Container for map content
        const mapContent = document.createElement('div');
        mapContent.style.position = 'relative';
        mapContent.style.width = '200px';
        mapContent.style.height = '200px';

        this.minimapCanvas = document.createElement('canvas');
        this.minimapCanvas.width = 200;
        this.minimapCanvas.height = 200;
        this.minimapCanvas.style.backgroundColor = 'black';
        this.minimapCanvas.style.borderRadius = '3px'; // Inner radius
        // No absolute positioning on canvas, it's inside the flow

        mapContent.appendChild(this.minimapCanvas);
        this.minimapCtx = this.minimapCanvas.getContext('2d')!;

        // Integrated Buttons (Overlay)
        const controls = document.createElement('div');
        controls.style.position = 'absolute';
        controls.style.top = '5px';
        controls.style.right = '5px';
        controls.style.display = 'flex';
        controls.style.gap = '2px';

        const plusBtn = document.createElement('button');
        plusBtn.innerText = '+';
        plusBtn.className = 'game-btn game-btn-icon';
        plusBtn.style.width = '20px';
        plusBtn.style.height = '20px';
        plusBtn.style.lineHeight = '18px';
        plusBtn.onclick = () => this.minimapScale *= 1.5;

        const minusBtn = document.createElement('button');
        minusBtn.innerText = '-';
        minusBtn.className = 'game-btn game-btn-icon';
        minusBtn.style.width = '20px';
        minusBtn.style.height = '20px';
        minusBtn.style.lineHeight = '18px';
        minusBtn.onclick = () => this.minimapScale /= 1.5;

        controls.appendChild(plusBtn);
        controls.appendChild(minusBtn);
        mapContent.appendChild(controls);

        // Create Panel
        // Collapsible Upwards logic:
        // Standard createCollapsiblePanel puts Title on TOP.
        // If we want Title on BOTTOM (so it expands up), we need flex-direction: column-reverse?
        // User: "reste en bas et ce depli vers le haut" -> Stays at bottom and unfolds upwards.
        // If we use standard:
        // [Title]
        // [Content]
        // Anchored at Bottom.
        // Collapsed: Only Title visible at Bottom.
        // Expanded: Title moves UP, Content appears below it?
        // No, if bottom is fixed:
        // [Title] (Top = ScreenH - TitleH) -> Correct
        // Expanded: 
        // [Title] (Top = ScreenH - ContentH - TitleH) -> Moves UP.
        // [Content] (Bottom = 0)
        // This means content is BELOW title.
        // If user wants "Unfold UP", they usually expect:
        // [Content]
        // [Title/Toggle]
        // So clicking Title reveals content ABOVE it.
        // But standard UI usually keeps Title on top.
        // Let's stick to standard layout first as it's consistent. The "Unfold Up" effect (panel growing upwards) is achieved by bottom alignment.
        // The only difference is whether the Title bar rides the top of the panel (standard) or stays at the bottom.
        // "reste en bas" implies the title bar stays fixed at the bottom?
        // If so, I should use `flex-direction: column-reverse`.

        // Let's try to adapt createCollapsiblePanel slightly or just built a specific one here.
        // Actually, just standard is fine. The Panel GROWS UPWARDS.
        // [ Title ]  <-- Moves Up
        // [ Map   ]  <-- Fixed at Bottom
        // This is perfectly valid "Unfolding Up".

        const { container } = this.createCollapsiblePanel('MINIMAP', mapContent, true, '200px');
        container.style.position = 'absolute';
        container.style.bottom = '10px';
        container.style.right = '10px';

        document.body.appendChild(container);
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
        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.gap = '8px';

        // Fuel
        const fuelRow = document.createElement('div');
        fuelRow.style.display = 'flex';
        fuelRow.style.justifyContent = 'space-between';
        fuelRow.innerHTML = '<span>Fuel:</span> <span id="rocket-fuel">100%</span>';
        content.appendChild(fuelRow);
        this.fuelDisplay = fuelRow.querySelector('#rocket-fuel');

        // Fuel Gauge (Visual Bar)
        const fuelGaugeContainer = document.createElement('div');
        fuelGaugeContainer.style.height = '6px'; // Slimmer
        fuelGaugeContainer.style.backgroundColor = '#333';
        fuelGaugeContainer.style.borderRadius = '3px';
        fuelGaugeContainer.style.overflow = 'hidden';
        fuelGaugeContainer.style.border = '1px solid #555';

        const fuelBar = document.createElement('div');
        fuelBar.style.width = '100%';
        fuelBar.style.height = '100%';
        fuelBar.style.backgroundColor = '#00C851';
        fuelBar.style.transition = 'width 0.2s, background-color 0.2s';

        fuelGaugeContainer.appendChild(fuelBar);
        content.appendChild(fuelGaugeContainer);
        this.fuelGaugeBar = fuelBar;

        // Electricity
        const elecRow = document.createElement('div');
        elecRow.style.display = 'flex';
        elecRow.style.justifyContent = 'space-between';
        elecRow.innerHTML = '<span>Electricity:</span> <span id="rocket-elec">100%</span>';
        content.appendChild(elecRow);
        this.electricityDisplay = elecRow.querySelector('#rocket-elec');

        // Electricity Gauge (Visual Bar)
        const elecGaugeContainer = document.createElement('div');
        elecGaugeContainer.style.height = '6px';
        elecGaugeContainer.style.backgroundColor = '#333';
        elecGaugeContainer.style.borderRadius = '3px';
        elecGaugeContainer.style.overflow = 'hidden';
        elecGaugeContainer.style.border = '1px solid #555';

        const elecBar = document.createElement('div');
        elecBar.style.width = '100%';
        elecBar.style.height = '100%';
        elecBar.style.backgroundColor = '#FFEB3B'; // Yellow
        elecBar.style.transition = 'width 0.2s, background-color 0.2s';

        elecGaugeContainer.appendChild(elecBar);
        content.appendChild(elecGaugeContainer);
        this.electricityGaugeBar = elecBar;

        // Stats Grid
        const statsGrid = document.createElement('div');
        statsGrid.style.display = 'grid';
        statsGrid.style.gridTemplateColumns = '1fr 1fr';
        statsGrid.style.gap = '8px 12px';
        statsGrid.style.fontSize = '12px';

        // Helpers for stats
        const createStat = (label: string, id: string, suffix: string) => {
            const div = document.createElement('div');
            div.innerHTML = `<span style="color:#aaa">${label}:</span> <span id="${id}" style="float:right; color:white">0 ${suffix}</span>`;
            return div;
        };

        const dvStat = createStat('Delta V', 'rocket-dv', 'm/s');
        const massStat = createStat('Mass', 'rocket-mass', 'kg');
        const throttleStat = createStat('Throttle', 'rocket-throttle', '%');
        const velStat = createStat('Velocity', 'rocket-vel', 'm/s');
        const altStat = createStat('Altitude', 'rocket-alt', 'km');
        const gravStat = createStat('Gravity', 'rocket-grav', 'm/s²');
        // SOI is full width usually

        statsGrid.appendChild(dvStat);
        statsGrid.appendChild(massStat);
        statsGrid.appendChild(throttleStat);
        statsGrid.appendChild(velStat);
        statsGrid.appendChild(altStat);
        statsGrid.appendChild(gravStat);

        content.appendChild(statsGrid);

        // References
        this.deltaVDisplay = dvStat.querySelector('#rocket-dv');
        this.massDisplay = massStat.querySelector('#rocket-mass');
        this.throttleDisplay = throttleStat.querySelector('#rocket-throttle');
        this.velocityDisplay = velStat.querySelector('#rocket-vel');
        this.altitudeDisplay = altStat.querySelector('#rocket-alt');
        this.gravityDisplay = gravStat.querySelector('#rocket-grav');

        // SOI
        const soiRow = document.createElement('div');
        soiRow.style.fontSize = '12px';
        soiRow.style.marginTop = '4px';
        soiRow.style.borderTop = '1px solid #444';
        soiRow.style.paddingTop = '4px';
        soiRow.innerHTML = '<span style="color:#aaa">Influence:</span> <span id="rocket-soi" style="float:right">-</span>';
        content.appendChild(soiRow);
        this.soiDisplay = soiRow.querySelector('#rocket-soi');

        // Create Panel
        // Use Collapsible Panel, anchored at bottom left.
        const { container } = this.createCollapsiblePanel('ROCKET TELEMETRY', content, false, '240px'); // Default Expanded? Or Collapsed? User said "replier vers le bas" (fold down).
        // Let's default collapsed to be compact? User said "il doit resté placé ou il est et ce replier vers le bas"
        // "must stay where it is and fold downwards". Standard behavior for bottom-anchored is "top moves down".

        // Let's set it to collapsed by default to match other panels, or expanded?
        // User didn't specify initial state for THIS one, but "plier ils prenne trop de place" was general feedback.
        // I'll set it to collapsed initially for consistency.
        // Wait, argument is `isCollapsed`. I'll set true.
        // Edit: User actually said "plier au depart" for Controls. For Telemetry he said "replier vers le bas".
        // I will default to collapsed.

        container.style.position = 'absolute';
        container.style.bottom = '10px';
        container.style.left = '10px';
        // Override display to none initially (controlled by logic)
        container.style.display = 'none';
        document.body.appendChild(container);
        this.rocketInfoPanel = container;
    }

    // Generic Confirm Dialog Helper
    private showConfirmDialog(title: string, message: string, onConfirm: () => void, onCancel: () => void) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '10000';

        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'game-modal-content';
        dialog.style.minWidth = '350px';
        dialog.style.maxWidth = '500px';
        dialog.style.fontFamily = "'Segoe UI', sans-serif";
        dialog.style.textAlign = 'center';

        // Title
        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        titleEl.style.color = '#fff';
        titleEl.style.marginTop = '0';
        titleEl.style.marginBottom = '15px';
        dialog.appendChild(titleEl);

        // Message
        const msgEl = document.createElement('p');
        msgEl.textContent = message;
        msgEl.style.color = '#ccc';
        msgEl.style.marginBottom = '25px';
        dialog.appendChild(msgEl);

        // Buttons
        const btns = document.createElement('div');
        btns.style.display = 'flex';
        btns.style.justifyContent = 'center';
        btns.style.gap = '15px';

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Yes';
        confirmBtn.className = 'game-btn';
        confirmBtn.style.color = '#4CAF50';
        confirmBtn.style.borderColor = '#4CAF50';
        confirmBtn.style.padding = '8px 20px'; // Override
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.onclick = () => {
            overlay.remove();
            onConfirm();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'No';
        cancelBtn.className = 'game-btn';
        cancelBtn.style.color = '#ccc';
        cancelBtn.style.borderColor = '#666';
        cancelBtn.style.padding = '8px 20px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.onclick = () => {
            overlay.remove();
            onCancel();
        };

        btns.appendChild(confirmBtn);
        btns.appendChild(cancelBtn);
        dialog.appendChild(btns);
        overlay.appendChild(dialog);

        document.body.appendChild(overlay);
    }

    createControlsHelp() {
        const content = document.createElement('div');
        content.style.fontSize = '11px';
        content.style.fontFamily = 'monospace';
        content.style.color = '#ccc';
        content.style.lineHeight = '1.6';

        const addControl = (key: string, desc: string) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.innerHTML = `<span style="font-weight:bold; color:white">${key}</span> <span>${desc}</span>`;
            return row;
        };

        const keys = [
            { k: `${controls.getControl('thrust').toUpperCase()} / ${controls.getControl('cutEngines').toUpperCase()}`, d: 'Thrust / Cut' },
            { k: `${controls.getControl('rotateLeft').toUpperCase()} / ${controls.getControl('rotateRight').toUpperCase()}`, d: 'Rotate Left/Right' },
            { k: controls.getControl('increaseThrottle').toUpperCase(), d: 'Throttle +' },
            { k: controls.getControl('decreaseThrottle').toUpperCase(), d: 'Throttle -' },
            { k: 'Z', d: 'Full Throttle' }, // 'Z' is often hardcoded or mapped to thrust? Config says thrust='z'.
            // Wait, Config says thrust='z' and cutEngines='s'.
            // If Z is "Thrust", then what is "Full Throttle"?
            // Usually Z/Shift is throttle.
            // Let's trust the Config names.
            // If thrust='z', let's label it "Main Thrust".
            { k: controls.getControl('toggleSAS').toUpperCase(), d: 'SAS' },
            { k: controls.getControl('toggleRCS').toUpperCase(), d: 'RCS' },
            { k: 'Space', d: 'Stage' }, // Not in config?
            { k: `${controls.getControl('timeWarpIncrease')} / ${controls.getControl('timeWarpDecrease')}`, d: 'Time Warp +/-' },
            { k: controls.getControl('timeWarpReset'), d: 'Reset Warp' },
            { k: controls.getControl('toggleTrajectory').toUpperCase(), d: 'Trajectory' },
            { k: controls.getControl('createManeuverNode').toUpperCase(), d: 'New Node' }
        ];

        keys.forEach(item => content.appendChild(addControl(item.k, item.d)));

        // Create Panel
        const { container } = this.createCollapsiblePanel('KEYBOARD CONTROLS', content, true, '220px'); // Default Collapsed
        container.style.position = 'absolute';
        container.style.top = '130px'; // Below Time Widget
        container.style.right = '10px';

        document.body.appendChild(container); // Append to body (right side)
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

        // Update Electricity Display
        if (this.electricityDisplay && info.maxElectricity > 0) {
            const elecPercent = (info.electricity / info.maxElectricity) * 100;
            this.electricityDisplay.innerText = `${info.electricity.toFixed(1)} / ${info.maxElectricity.toFixed(0)}`;

            if (this.electricityGaugeBar) {
                this.electricityGaugeBar.style.width = `${elecPercent}%`;
                // Yellow -> Red when low
                this.electricityGaugeBar.style.backgroundColor = elecPercent < 20 ? '#ff4444' : '#FFEB3B';
            }
        } else if (this.electricityDisplay) {
            this.electricityDisplay.innerText = "0 / 0";
            if (this.electricityGaugeBar) this.electricityGaugeBar.style.width = "0%";
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
            } else {
                this.altitudeDisplay.innerText = 'N/A';
                if (this.gravityDisplay) this.gravityDisplay.innerText = '0 m/s²';
            }
        }

        // Update RCS Button Logic
        if (this.rcsBtn && rocket.controls) {
            const rcsEnabled = rocket.controls.rcsEnabled;
            if (rcsEnabled) {
                this.rcsBtn.style.color = '#00C851';
                this.rcsBtn.style.boxShadow = '0 0 5px rgba(0, 200, 81, 0.5)';
            } else {
                this.rcsBtn.style.color = '#ccc';
                this.rcsBtn.style.boxShadow = 'none';
            }
        }

        // Update SAS Button Logic
        if (this.sasBtn && rocket.controls) {
            const sasEnabled = rocket.controls.sasEnabled;
            if (sasEnabled) {
                this.sasBtn.style.color = '#00C851'; // Green
                this.sasBtn.style.boxShadow = '0 0 5px rgba(0, 200, 81, 0.5)';
            } else {
                this.sasBtn.style.color = '#ccc';
                this.sasBtn.style.boxShadow = 'none';
            }
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

    /**
     * Update the date/time display based on elapsed game time
     * @param elapsedSeconds Total elapsed game time in seconds
     */
    updateDateTime(elapsedSeconds: number) {
        // Start date: Today (December 7, 2025)
        const baseDate = new Date('2025-12-07T00:00:00Z');

        // Add elapsed seconds to base date
        const currentDate = new Date(baseDate.getTime() + elapsedSeconds * 1000);

        // Format date as YYYY-MM-DD HH:MM:SS
        const year = currentDate.getUTCFullYear();
        const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getUTCDate()).padStart(2, '0');
        const hours = String(currentDate.getUTCHours()).padStart(2, '0');
        const minutes = String(currentDate.getUTCMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getUTCSeconds()).padStart(2, '0');

        const dateString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        // Update date display
        // Update date display
        const dateVal = document.getElementById('game-date-val');
        if (dateVal) {
            dateVal.innerText = dateString;
        }

        // Calculate Mission Elapsed Time (MET)
        const totalSeconds = Math.floor(elapsedSeconds);
        const metSeconds = totalSeconds % 60;
        const metMinutes = Math.floor(totalSeconds / 60) % 60;
        const metHours = Math.floor(totalSeconds / 3600) % 24;
        const metDays = Math.floor(totalSeconds / 86400);

        const metString = `MET: ${metDays}d ${metHours}h ${metMinutes}m ${metSeconds}s`;

        // Update MET display
        const elapsedDisplay = document.getElementById('game-elapsed-display');
        if (elapsedDisplay) {
            elapsedDisplay.innerText = metString;
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

        // RCS Toggle Button
        const rcsBtn = createAutopilotButton('maneuver', 'Toggle RCS System (R)');
        rcsBtn.innerHTML = '';
        rcsBtn.textContent = 'RCS';
        rcsBtn.style.fontFamily = 'monospace';
        rcsBtn.style.fontSize = '10px';
        rcsBtn.style.fontWeight = 'bold';
        rcsBtn.style.color = '#ccc'; // Default off color

        rcsBtn.onclick = () => {
            if (this.currentRocket && this.currentRocket.controls) {
                this.currentRocket.controls.rcsEnabled = !this.currentRocket.controls.rcsEnabled;
            }
        };
        this.rcsBtn = rcsBtn;
        container.appendChild(rcsBtn);

        // SAS Toggle Button
        const sasBtn = createAutopilotButton('maneuver', 'Toggle Stability Assist (T)');
        sasBtn.innerHTML = '';
        sasBtn.textContent = 'SAS';
        sasBtn.style.fontFamily = 'monospace';
        sasBtn.style.fontSize = '10px';
        sasBtn.style.fontWeight = 'bold';
        sasBtn.style.color = '#ccc'; // Default off color

        sasBtn.onclick = () => {
            if (this.currentRocket && this.currentRocket.controls) {
                this.currentRocket.controls.sasEnabled = !this.currentRocket.controls.sasEnabled;
            }
        };
        this.sasBtn = sasBtn;
        container.appendChild(sasBtn);

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
        const debugContent = document.createElement('div');
        debugContent.style.display = 'flex';
        debugContent.style.flexDirection = 'column';
        debugContent.style.gap = '5px';

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
        fuelLabel.style.fontSize = '12px';
        fuelLabel.style.color = 'white';
        fuelLabel.style.fontFamily = 'monospace';

        fuelContainer.appendChild(fuelCheck);
        fuelContainer.appendChild(fuelLabel);
        debugContent.appendChild(fuelContainer);

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
        colliderLabel.style.fontSize = '12px';
        colliderLabel.style.color = 'white';
        colliderLabel.style.fontFamily = 'monospace';

        colliderContainer.appendChild(colliderCheck);
        colliderContainer.appendChild(colliderLabel);
        debugContent.appendChild(colliderContainer);

        // Show CoG Toggle
        const cogContainer = document.createElement('div');
        cogContainer.style.display = 'flex';
        cogContainer.style.alignItems = 'center';
        cogContainer.style.gap = '5px';

        const cogCheck = document.createElement('input');
        cogCheck.type = 'checkbox';
        cogCheck.id = 'debug-cog';
        cogCheck.checked = false;
        cogCheck.onchange = (e) => {
            if (this.renderer instanceof ThreeRenderer) {
                this.renderer.showCoG = (e.target as HTMLInputElement).checked;
            }
        };

        const cogLabel = document.createElement('label');
        cogLabel.htmlFor = 'debug-cog';
        cogLabel.innerText = 'Show CoG';
        cogLabel.style.cursor = 'pointer';
        cogLabel.style.fontSize = '12px';
        cogLabel.style.color = 'white';
        cogLabel.style.fontFamily = 'monospace';

        cogContainer.appendChild(cogCheck);
        cogContainer.appendChild(cogLabel);
        debugContent.appendChild(cogContainer);

        // FPS Counter
        const fpsContainer = document.createElement('div');
        fpsContainer.style.display = 'flex';
        fpsContainer.style.alignItems = 'center';
        fpsContainer.style.gap = '5px';
        fpsContainer.style.borderTop = '1px solid #555';
        fpsContainer.style.paddingTop = '5px';
        fpsContainer.style.marginTop = '5px';

        const fpsLabel = document.createElement('span');
        fpsLabel.innerText = 'FPS: --';
        fpsLabel.style.color = '#00C851';
        fpsLabel.style.fontSize = '12px';
        fpsLabel.style.fontFamily = 'monospace';
        fpsContainer.appendChild(fpsLabel);
        debugContent.appendChild(fpsContainer);

        // FPS Calculation Loop
        let lastTime = performance.now();
        let frames = 0;
        const updateFPS = () => {
            const now = performance.now();
            frames++;
            if (now >= lastTime + 1000) {
                const fps = frames; // Since it's exactly 1 second roughly
                fpsLabel.innerText = `FPS: ${fps}`;

                if (fps < 30) fpsLabel.style.color = '#ff4444';
                else if (fps < 50) fpsLabel.style.color = '#ffbb33';
                else fpsLabel.style.color = '#00C851';

                frames = 0;
                lastTime = now;
            }
            requestAnimationFrame(updateFPS);
        };
        requestAnimationFrame(updateFPS);


        // Wrap in collapsible panel
        // Need a wrapper to position it absolute
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.top = '10px';
        wrapper.style.left = '50%';
        wrapper.style.transform = 'translateX(-50%)';

        const { container } = this.createCollapsiblePanel('DEBUG TOOLS', debugContent, true, '200px');
        wrapper.appendChild(container);

        document.body.appendChild(wrapper);
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
