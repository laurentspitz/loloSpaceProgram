import { Renderer } from '../Renderer';
import { ThreeRenderer } from '../rendering/ThreeRenderer';
import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { Rocket } from '../entities/Rocket';
import { ManeuverNodeManager } from '../systems/ManeuverNodeManager';
import { MissionManager } from '../missions';
import { GameTimeManager } from '../managers/GameTimeManager';
import i18next from 'i18next';

// Panels
import { TimeControlsPanel } from './panels/TimeControlsPanel';
import { RocketInfoPanel } from './panels/RocketInfoPanel';
import { CelestialBodiesPanel } from './panels/CelestialBodiesPanel';
import { MissionControlsPanel } from './panels/MissionControlsPanel';
import { DebugPanel } from './panels/DebugPanel';
import { StagingPanel } from './panels/StagingPanel';

// Flight
import { NavballUI } from './flight/NavballUI';
import { MinimapRenderer } from './flight/MinimapRenderer';

// Themes
import { ThemeManager } from './themes/ThemeManager';

// Types
import type { CockpitTheme } from './types';

// Other UI components
import { ManeuverNodeUI } from './ManeuverNodeUI';
import { getHamburgerMenu, type HamburgerMenu } from './components/HamburgerMenu';
import { createTabbedSlidingPanel, type TabbedSlidingPanelResult, type TabDefinition } from './components/TabbedSlidingPanel';

export class UI {
    renderer: Renderer | ThreeRenderer;
    bodies: Body[] = [];
    onTimeWarpChange?: (factor: number) => void;
    currentRocket: Rocket | null = null;
    missionManager?: MissionManager;

    // Sub-modules
    private timeControlsPanel: TimeControlsPanel | null = null;
    private rocketInfoPanel: RocketInfoPanel | null = null;
    private celestialBodiesPanel: CelestialBodiesPanel | null = null;
    private missionControlsPanel: MissionControlsPanel | null = null;
    private debugPanel: DebugPanel | null = null;
    private stagingPanel: StagingPanel | null = null;
    private navballUI: NavballUI | null = null;
    private minimapRenderer: MinimapRenderer | null = null;
    private themeManager: ThemeManager;
    private hamburgerMenu: HamburgerMenu | null = null;

    // Tabbed sliding panels
    private leftTabbedPanel: TabbedSlidingPanelResult | null = null;
    private rightTabbedPanel: TabbedSlidingPanelResult | null = null;

    // Maneuver nodes
    maneuverNodeManager: ManeuverNodeManager | null = null;
    maneuverNodeUI: ManeuverNodeUI | null = null;

    // RCS/SAS button refs for theme access
    rcsBtn: HTMLButtonElement | null = null;
    sasBtn: HTMLButtonElement | null = null;

    constructor(renderer: Renderer | ThreeRenderer) {
        this.renderer = renderer;
        this.themeManager = new ThemeManager();

        // Create panels
        this.createPanels();
        this.setupInput();

        // Initialize navball
        this.navballUI = new NavballUI({});

        // Set default theme
        this.setTheme('standard');

        // Create mission display
        this.createMissionDisplay();

        // Listen for Mission Completion
        window.addEventListener('mission-completed', async (e: any) => {
            const { NotificationManager } = await import('./NotificationManager');
            const mission = e.detail.mission;
            const rewardText = mission.rewardMoney ? `+${mission.rewardMoney.toLocaleString()} $` : '';
            NotificationManager.show(i18next.t('ui.missionAccomplished', { title: i18next.t(mission.title) }) + (rewardText ? '\n💰 ' + rewardText : ''), 'success', 5000);
            this.updateMissionHUD();
        });

        // Listen for language changes
        i18next.on('languageChanged', () => {
            this.updateTexts();
        });
    }

    private createPanels(): void {
        // Create panels in EMBEDDED mode (they won't create their own containers)

        // Time Controls (embedded)
        // Time Controls (embedded)
        this.timeControlsPanel = new TimeControlsPanel({
            embedded: true,
            onTimeWarpChange: (factor) => {
                if (this.onTimeWarpChange) {
                    this.onTimeWarpChange(factor);
                }
            }
        });

        // Mission Controls (embedded)
        this.missionControlsPanel = new MissionControlsPanel({
            embedded: true,
            renderer: this.renderer,
            getCurrentTimeWarp: () => this.timeControlsPanel?.getCurrentTimeWarp() || 1,
            setTimeWarp: (value) => this.timeControlsPanel?.setTimeWarp(value)
        });

        // Debug Panel (embedded)
        this.debugPanel = new DebugPanel({
            embedded: true,
            renderer: this.renderer,
            onYearChange: (seconds) => {
                const game = (window as any).game;
                if (game) {
                    game.elapsedGameTime = seconds;
                    this.timeControlsPanel?.updateDateTime(seconds);
                }
            }
        });

        // Minimap (embedded)
        // Minimap (standalone) - Bottom Right
        this.minimapRenderer = new MinimapRenderer(this.renderer, { embedded: false });

        // Hamburger menu for mobile (groups secondary panels)
        this.hamburgerMenu = getHamburgerMenu();

        // Note: RocketInfoPanel, StagingPanel, CelestialBodiesPanel are created in init()
        // because they need bodies/rocket to be initialized first
    }

    /**
     * Create the tabbed panel containers after init
     */
    private createTabbedPanels(): void {
        // Create LEFT tabbed panel with: RocketInfo, MissionControls, Debug
        const leftTabs = [];



        if (this.missionControlsPanel?.getContent()) {
            leftTabs.push({
                id: 'view',
                title: 'View',
                icon: '👁️',
                content: this.missionControlsPanel.getContent()!
            });
        }

        if (this.debugPanel?.getContent()) {
            leftTabs.push({
                id: 'debug',
                title: 'Debug',
                icon: '🔧',
                content: this.debugPanel.getContent()!
            });
        }

        if (leftTabs.length > 0) {
            this.leftTabbedPanel = createTabbedSlidingPanel({
                tabs: leftTabs,
                direction: 'left',
                width: '240px',
                startOpen: true
                // defaultTab removed so it defaults to first tab (mission)
            });
            this.leftTabbedPanel.container.style.top = '60px';
            this.leftTabbedPanel.container.style.left = '10px';
            document.body.appendChild(this.leftTabbedPanel.container);
        }

        // Create RIGHT tabbed panel with: Staging, CelestialBodies (Middle Right)
        const rightTabs: TabDefinition[] = [];

        if (this.stagingPanel?.getContent()) {
            rightTabs.push({
                id: 'staging',
                title: 'Staging',
                icon: '🔥',
                content: this.stagingPanel.getContent()!
            });
        }

        if (this.celestialBodiesPanel?.getContent()) {
            rightTabs.push({
                id: 'bodies',
                title: 'Bodies',
                icon: '🌍',
                content: this.celestialBodiesPanel.getContent()!
            });
        }

        if (rightTabs.length > 0) {
            this.rightTabbedPanel = createTabbedSlidingPanel({
                tabs: rightTabs,
                direction: 'right',
                width: '220px',
                startOpen: true,
                headerContent: this.timeControlsPanel?.getContent() || undefined
            });
            this.rightTabbedPanel.container.style.top = '10px'; // Aligned with top
            this.rightTabbedPanel.container.style.right = '10px';
            document.body.appendChild(this.rightTabbedPanel.container);
        }
    }

    init(bodies: Body[], rocket?: Rocket, maneuverNodeManager?: ManeuverNodeManager, missionManager?: MissionManager) {
        this.bodies = bodies;
        this.missionManager = missionManager;

        if (rocket) {
            this.currentRocket = rocket;

            // Auto-switch Theme based on Capsule
            let themeId = 'standard';
            if (rocket.partStack) {
                const capsule = rocket.partStack.find(p => p.definition.type === 'capsule');
                if (capsule && capsule.definition.cockpit?.themeId) {
                    themeId = capsule.definition.cockpit.themeId;
                }
            }
            this.setTheme(themeId);

            // Setup navball controls
            if (this.navballUI) {
                this.navballUI.setRocketControls(rocket);
            }
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

        // Create Rocket Info Panel with bodies (embedded)
        this.rocketInfoPanel = new RocketInfoPanel({ bodies: this.bodies, embedded: true });

        // Create Staging Panel (embedded)
        this.stagingPanel = new StagingPanel({ embedded: true });
        if (rocket) {
            this.stagingPanel.setRocket(rocket);
        }

        // Create Celestial Bodies Panel (embedded)
        this.celestialBodiesPanel = new CelestialBodiesPanel({
            embedded: true,
            bodies: this.bodies,
            onFocus: (body) => {
                this.renderer.followedBody = body;
                if (this.renderer instanceof ThreeRenderer) {
                    this.renderer.autoZoomToBody(body);
                }
            },
            onOrbit: (body) => this.placeRocketInOrbit(body),
            onTarget: (body) => this.setTarget(body)
        });

        // Integrate Telemetry into Navball
        if (this.rocketInfoPanel?.getContent() && this.navballUI) {
            this.navballUI.addLeftContent(this.rocketInfoPanel.getContent()!);
        }

        // Create the tabbed panel containers with all embedded panels
        this.createTabbedPanels();

        this.updateMissionHUD();
    }

    private createMissionDisplay(): void {
        const container = document.createElement('div');
        container.id = 'mission-display';
        container.style.position = 'absolute';
        container.style.top = '10px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        container.style.padding = '8px 15px';
        container.style.borderRadius = '20px';
        container.style.color = '#fff';
        container.style.fontFamily = 'monospace';
        container.style.fontSize = '14px';
        container.style.cursor = 'pointer';
        container.title = "Click to View Mission Log";
        container.addEventListener('click', () => {
            this.toggleMissionLog();
        });
        container.style.textAlign = 'center';
        container.style.pointerEvents = 'auto';
        container.style.border = '1px solid #444';

        container.innerHTML = `<span style="color:#aaa; font-size:10px">${i18next.t('ui.currentObjective')}</span><br><span id="mission-title">Loading...</span>`;

        document.body.appendChild(container);
    }

    private setupInput(): void {
        // Input is now handled by InputHandler in ThreeRenderer
    }

    private placeRocketInOrbit(body: Body): void {
        const rocket = (this.renderer as any).currentRocket || this.currentRocket;
        if (!rocket) {
            console.warn('No rocket available');
            return;
        }

        const physicalRadius = body.radius;
        const VISUAL_SCALE = 1.0;
        const visualRadius = physicalRadius * VISUAL_SCALE;
        const orbitAltitude = Math.max(200000, visualRadius * 0.1);
        const orbitRadius = visualRadius + orbitAltitude;

        const G = 6.674e-11;
        const orbitalSpeed = Math.sqrt((G * body.mass) / orbitRadius);

        const newPosX = body.position.x + orbitRadius;
        const newPosY = body.position.y;
        const newVelX = body.velocity.x;
        const newVelY = body.velocity.y + orbitalSpeed;

        setTimeout(() => {
            rocket.body.position = new Vector2(newPosX, newPosY);
            rocket.body.velocity = new Vector2(newVelX, newVelY);
            rocket.rotation = Math.PI / 2;

            if ((window as any).game?.collisionManager) {
                const game = (window as any).game;
                game.collisionManager.syncPositions([game.bodies || []], rocket);
                game.breakRestingState(); // Use method instead of setting properties
            }

            this.renderer.followedBody = rocket.body;
            if (this.renderer instanceof ThreeRenderer) {
                this.renderer.autoZoomToBody(body);
            }

            console.log(`✓ Rocket placed in ${(orbitAltitude / 1000).toFixed(0)} km orbit around ${body.name}`);
        }, 100);
    }

    private setTarget(body: Body): void {
        const rocket = (this.renderer as any).currentRocket || this.currentRocket;
        if (rocket) {
            rocket.targetBody = body;
            console.log(`Target set to ${body.name}`);
        }
    }

    setTimeWarp(value: number): void {
        this.timeControlsPanel?.setTimeWarp(value);
    }

    get currentTimeWarp(): number {
        return this.timeControlsPanel?.getCurrentTimeWarp() || 1;
    }

    updateRocketInfo(rocket: Rocket): void {
        if (!rocket) return;
        this.currentRocket = rocket;

        // Update staging panel
        this.stagingPanel?.update();

        const result = this.rocketInfoPanel?.update(rocket);
        const nearestBody = result?.nearestBody;

        // Update RCS/SAS buttons
        if (rocket.controls) {
            this.navballUI?.updateRCSButton(rocket.controls.rcsEnabled);
            this.navballUI?.updateSASButton(rocket.controls.sasEnabled);
        }

        // Autopilot handling
        const autopilotMode = this.navballUI?.getAutopilotMode() || 'off';
        if (autopilotMode !== 'off' && nearestBody) {
            const referenceBody = rocket.targetBody || nearestBody;
            const velocityVector = rocket.body.velocity.sub(referenceBody.velocity);
            const speed = velocityVector.mag();

            let targetAngle: number | null = null;

            if ((autopilotMode === 'prograde' || autopilotMode === 'retrograde') && speed > 1) {
                targetAngle = Math.atan2(velocityVector.y, velocityVector.x);
                if (autopilotMode === 'retrograde') {
                    targetAngle += Math.PI;
                }
            } else if ((autopilotMode === 'target' || autopilotMode === 'anti-target') && rocket.targetBody) {
                const targetVector = rocket.targetBody.position.sub(rocket.body.position);
                targetAngle = Math.atan2(targetVector.y, targetVector.x);
                if (autopilotMode === 'anti-target') {
                    targetAngle += Math.PI;
                }
            } else if (autopilotMode === 'maneuver' && this.maneuverNodeUI) {
                const nodes = this.maneuverNodeUI.manager.nodes;
                if (nodes.length > 0) {
                    targetAngle = nodes[0].getΔvDirection(rocket, this.bodies);
                }
            }

            if (targetAngle !== null) {
                targetAngle = ((targetAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
                const currentAngle = ((rocket.rotation + Math.PI) % (2 * Math.PI)) - Math.PI;

                let angleDiff = targetAngle - currentAngle;
                if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                const rotationSpeed = 0.05;
                const maxRotation = 0.1;

                if (Math.abs(angleDiff) > 0.01) {
                    const rotation = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff) * rotationSpeed, maxRotation);
                    rocket.rotation += rotation;
                }
            }
        }

        // Render navball
        if (this.navballUI && nearestBody) {
            const referenceBody = rocket.targetBody || nearestBody;
            const velocityVector = rocket.body.velocity.sub(referenceBody.velocity);
            const maneuverNodes = this.maneuverNodeUI?.manager.nodes;
            this.navballUI.render(rocket, velocityVector, nearestBody, maneuverNodes);
        }
    }

    updateDateTime(elapsedSeconds: number): void {
        this.timeControlsPanel?.updateDateTime(elapsedSeconds);
    }

    renderMinimap(bodies: Body[]): void {
        this.minimapRenderer?.render(bodies);
    }

    setTheme(themeId: string): void {
        this.themeManager.setTheme(themeId, this);
    }

    get currentTheme(): string {
        return this.themeManager.getCurrentTheme();
    }

    get activeTheme(): CockpitTheme | null {
        return this.themeManager.getActiveTheme();
    }

    update(): void {
        this.themeManager.update(this.currentRocket, this.bodies);
    }

    updateMissionHUD(): void {
        const titleEl = document.getElementById('mission-title');
        if (!titleEl) return;

        if (!this.missionManager) {
            titleEl.innerText = i18next.t('ui.loading');
            return;
        }

        const game = (window as any).game;
        const currentYear = game ? GameTimeManager.getYear(game.elapsedGameTime) : 1957;

        const mission = this.missionManager.getNextAvailableMission(currentYear);
        if (mission) {
            titleEl.innerText = i18next.t(mission.title);
            titleEl.title = i18next.t(mission.description);
        } else {
            titleEl.innerText = i18next.t('ui.noActiveMission', 'No Active Mission');
            titleEl.title = '';
        }
    }

    private updateTexts(): void {
        this.updateMissionHUD();
        this.missionControlsPanel?.updateTexts();
        // Rebuild celestial bodies panel
        this.celestialBodiesPanel?.setBodies(this.bodies);
    }

    private toggleMissionLog(): void {
        const existing = document.getElementById('mission-log-overlay');
        if (existing) {
            document.body.removeChild(existing);
            return;
        }

        if (!this.missionManager) return;

        const overlay = document.createElement('div');
        overlay.id = 'mission-log-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '50%';
        overlay.style.left = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
        overlay.style.backgroundColor = 'rgba(10, 20, 30, 0.95)';
        overlay.style.border = '2px solid #4466aa';
        overlay.style.padding = '20px';
        overlay.style.color = '#fff';
        overlay.style.borderRadius = '8px';
        overlay.style.width = '400px';
        overlay.style.maxHeight = '600px';
        overlay.style.overflowY = 'auto';
        overlay.style.fontFamily = 'monospace';
        overlay.style.zIndex = '2000';
        overlay.style.boxShadow = '0 0 20px rgba(0,0,0,0.8)';

        const header = document.createElement('h2');
        header.innerText = 'MISSION LOG';
        header.style.textAlign = 'center';
        header.style.color = '#66aaff';
        header.style.marginTop = '0';
        overlay.appendChild(header);

        const list = document.createElement('div');
        list.style.marginTop = '20px';

        const missions = this.missionManager.missions;

        missions.forEach(m => {
            const item = document.createElement('div');
            item.style.marginBottom = '15px';
            item.style.padding = '10px';
            item.style.borderBottom = '1px solid #334455';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';

            const info = document.createElement('div');

            const title = document.createElement('div');
            title.innerText = i18next.t(m.title);
            title.style.fontWeight = 'bold';
            title.style.fontSize = '1.1em';

            const desc = document.createElement('div');
            desc.innerText = i18next.t(m.description);
            desc.style.fontSize = '0.9em';
            desc.style.color = '#aaa';

            if (m.rewardMoney) {
                const reward = document.createElement('div');
                reward.innerText = `💰 +${m.rewardMoney.toLocaleString()} $`;
                reward.style.fontSize = '0.9em';
                reward.style.color = '#FFD700';
                info.appendChild(reward);
            }

            info.appendChild(title);
            info.appendChild(desc);

            const status = document.createElement('div');
            if (m.completed) {
                status.innerText = '✔ COMPLETED';
                status.style.color = '#44ff44';
                title.style.color = '#44ff44';
            } else {
                status.innerText = 'PENDING';
                status.style.color = '#bbbbbb';
                status.style.fontSize = '0.9em';
            }

            item.appendChild(info);
            item.appendChild(status);
            list.appendChild(item);
        });

        overlay.appendChild(list);

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'CLOSE';
        closeBtn.style.marginTop = '20px';
        closeBtn.style.width = '100%';
        closeBtn.style.padding = '10px';
        closeBtn.style.background = '#334455';
        closeBtn.style.border = 'none';
        closeBtn.style.color = 'white';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => document.body.removeChild(overlay);

        overlay.appendChild(closeBtn);
        document.body.appendChild(overlay);
    }

    dispose(): void {
        this.timeControlsPanel?.dispose();
        this.rocketInfoPanel?.dispose();
        this.celestialBodiesPanel?.dispose();
        this.missionControlsPanel?.dispose();
        this.debugPanel?.dispose();
        this.stagingPanel?.dispose();
        this.navballUI?.dispose();
        this.minimapRenderer?.dispose();
        this.hamburgerMenu?.dispose();

        const missionDisplay = document.getElementById('mission-display');
        if (missionDisplay?.parentNode) {
            missionDisplay.parentNode.removeChild(missionDisplay);
        }
    }
}
