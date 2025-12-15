import { Rocket } from '../../entities/Rocket';
import { stagingSystem } from '../../systems/StagingSystem';
import type { Stage, StageItem } from '../../systems/StagingSystem';
import { createSlidingPanel } from '../components/SlidingPanel';
import i18next from 'i18next';

export interface StagingPanelOptions {
    /** If true, panel is embedded in a tabbed container */
    embedded?: boolean;
}

/**
 * StagingPanel - Displays staging info and controls during flight
 */
export class StagingPanel {
    private container: HTMLDivElement | null = null;
    private content: HTMLDivElement | null = null;
    private stagesContainer: HTMLDivElement | null = null;
    private rocket: Rocket | null = null;
    private lastMeshVersion: number = -1;
    private embedded: boolean = false;

    constructor(options: StagingPanelOptions = {}) {
        this.embedded = options.embedded || false;
        this.create();
    }

    /**
     * Set the rocket to display staging for
     */
    setRocket(rocket: Rocket | null) {
        this.rocket = rocket;
        stagingSystem.setRocket(rocket);
        this.lastMeshVersion = -1; // Force refresh
    }

    /**
     * Create the panel UI
     */
    private create(): void {
        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.gap = '8px';
        content.style.maxHeight = '400px';
        content.style.overflowY = 'auto';
        content.style.paddingRight = '4px';

        // Stages container
        this.stagesContainer = document.createElement('div');
        this.stagesContainer.style.display = 'flex';
        this.stagesContainer.style.flexDirection = 'column';
        this.stagesContainer.style.gap = '8px';
        content.appendChild(this.stagesContainer);

        // Crossfeed toggle button
        const crossfeedContainer = document.createElement('div');
        crossfeedContainer.style.display = 'flex';
        crossfeedContainer.style.alignItems = 'center';
        crossfeedContainer.style.justifyContent = 'space-between';
        crossfeedContainer.style.padding = '8px';
        crossfeedContainer.style.backgroundColor = 'rgba(50, 50, 50, 0.5)';
        crossfeedContainer.style.borderRadius = '4px';
        crossfeedContainer.style.marginTop = '8px';

        const crossfeedLabel = document.createElement('span');
        crossfeedLabel.textContent = 'Crossfeed';
        crossfeedLabel.style.fontSize = '11px';
        crossfeedLabel.style.color = '#aaa';
        crossfeedContainer.appendChild(crossfeedLabel);

        const crossfeedToggle = document.createElement('button');
        crossfeedToggle.id = 'crossfeed-toggle';
        crossfeedToggle.style.padding = '4px 10px';
        crossfeedToggle.style.fontSize = '10px';
        crossfeedToggle.style.border = 'none';
        crossfeedToggle.style.borderRadius = '4px';
        crossfeedToggle.style.cursor = 'pointer';
        crossfeedToggle.style.backgroundColor = '#aa0000';
        crossfeedToggle.textContent = 'OFF';
        crossfeedToggle.onclick = () => {
            if (this.rocket) {
                this.rocket.crossfeedEnabled = !this.rocket.crossfeedEnabled;
                crossfeedToggle.textContent = this.rocket.crossfeedEnabled ? 'ON' : 'OFF';
                crossfeedToggle.style.backgroundColor = this.rocket.crossfeedEnabled ? '#00aa00' : '#aa0000';
            }
        };
        crossfeedContainer.appendChild(crossfeedToggle);
        content.appendChild(crossfeedContainer);

        // Store content for embedded mode
        this.content = content;

        // In embedded mode, don't create sliding wrapper
        if (this.embedded) {
            return;
        }

        // Create Sliding Panel (slides off-screen like Hangar)
        const { container } = createSlidingPanel({
            title: 'STAGING',
            content,
            direction: 'right',
            width: '200px',
            startOpen: true
        });
        container.id = 'staging-panel';
        container.style.top = '60px';
        container.style.right = '10px';
        container.style.zIndex = '100';

        document.body.appendChild(container);
        this.container = container;
    }

    /**
     * Update the staging display
     */
    update(): void {
        if (!this.rocket || !this.stagesContainer) return;

        // Only rebuild if rocket mesh changed (stage separation, etc.)
        if (this.rocket.meshVersion === this.lastMeshVersion) {
            // Just update fuel gauges
            this.updateFuelGauges();
            return;
        }

        this.lastMeshVersion = this.rocket.meshVersion;
        this.rebuild();
    }

    /**
     * Rebuild the entire staging UI
     */
    private rebuild(): void {
        if (!this.stagesContainer) return;

        this.stagesContainer.innerHTML = '';

        const stages = stagingSystem.getStages();
        if (stages.length === 0) {
            const noStages = document.createElement('div');
            noStages.style.color = '#888';
            noStages.style.fontSize = '12px';
            noStages.style.textAlign = 'center';
            noStages.textContent = 'No stages';
            this.stagesContainer.appendChild(noStages);
            return;
        }

        // Display stages from top (last) to bottom (first)
        for (let i = stages.length - 1; i >= 0; i--) {
            const stage = stages[i];
            if (stage.isSeparated) continue; // Don't show separated stages

            const stageEl = this.createStageElement(stage);
            this.stagesContainer.appendChild(stageEl);
        }
    }

    /**
     * Create a stage element
     */
    private createStageElement(stage: Stage): HTMLDivElement {
        const stageDiv = document.createElement('div');
        stageDiv.className = 'stage-block';
        stageDiv.dataset.stageIndex = stage.index.toString();

        // Styling
        stageDiv.style.backgroundColor = stage.isActive ? 'rgba(0, 100, 200, 0.3)' : 'rgba(50, 50, 50, 0.5)';
        stageDiv.style.border = stage.isActive ? '2px solid #0088ff' : '1px solid #444';
        stageDiv.style.borderRadius = '6px';
        stageDiv.style.padding = '8px';
        stageDiv.style.transition = 'all 0.3s ease';

        // Header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '6px';
        header.style.borderBottom = '1px solid #555';
        header.style.paddingBottom = '4px';

        const title = document.createElement('span');
        title.style.fontWeight = 'bold';
        title.style.color = stage.isActive ? '#0088ff' : '#ccc';
        title.textContent = `Stage ${stage.index}`;

        if (stage.isActive) {
            const activeBadge = document.createElement('span');
            activeBadge.style.backgroundColor = '#0088ff';
            activeBadge.style.color = 'white';
            activeBadge.style.padding = '2px 6px';
            activeBadge.style.borderRadius = '3px';
            activeBadge.style.fontSize = '10px';
            activeBadge.style.marginLeft = '8px';
            activeBadge.textContent = 'ACTIVE';
            title.appendChild(activeBadge);
        }

        header.appendChild(title);
        stageDiv.appendChild(header);

        // Items
        const itemsDiv = document.createElement('div');
        itemsDiv.style.display = 'flex';
        itemsDiv.style.flexDirection = 'column';
        itemsDiv.style.gap = '4px';
        itemsDiv.style.fontSize = '11px';

        for (const item of stage.items) {
            // isStillAttached: stage hasn't been dropped (engines can fire)
            // isCurrentStage: this is the current active stage (decouplers can be triggered)
            const itemEl = this.createItemElement(item, !stage.isSeparated, stage.isActive);
            itemsDiv.appendChild(itemEl);
        }

        stageDiv.appendChild(itemsDiv);
        return stageDiv;
    }

    /**
     * Create an item element
     * @param item - The stage item
     * @param isStillAttached - Stage is still attached (not separated) - engines can fire
     * @param isCurrentStage - This is the current active stage - decouplers can be triggered
     */
    private createItemElement(item: StageItem, isStillAttached: boolean, isCurrentStage: boolean): HTMLDivElement {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'stage-item';
        itemDiv.dataset.instanceId = item.instanceId;
        itemDiv.style.display = 'flex';
        itemDiv.style.alignItems = 'center';
        itemDiv.style.gap = '6px';
        itemDiv.style.padding = '4px';
        itemDiv.style.backgroundColor = 'rgba(0,0,0,0.2)';
        itemDiv.style.borderRadius = '4px';

        // Icon based on type
        const icon = document.createElement('span');
        icon.style.width = '16px';
        icon.style.textAlign = 'center';

        switch (item.type) {
            case 'engine':
            case 'booster':
                icon.textContent = '🔥';
                break;
            case 'tank':
                icon.textContent = '⛽';
                break;
            case 'decoupler':
                icon.textContent = '💥';
                break;
            case 'fairing':
                icon.textContent = '🛡️';
                break;
            case 'parachute':
                icon.textContent = '🪂';
                break;
            case 'capsule':
                icon.textContent = '🚀';
                break;
            default:
                icon.textContent = '📦';
        }
        itemDiv.appendChild(icon);

        // Name (truncated)
        const name = document.createElement('span');
        name.style.flex = '1';
        name.style.overflow = 'hidden';
        name.style.textOverflow = 'ellipsis';
        name.style.whiteSpace = 'nowrap';
        name.style.color = '#ddd';

        // Try to translate the name
        const translatedName = i18next.exists(item.name) ? i18next.t(item.name) : item.partId.replace(/-/g, ' ').replace(/^./, s => s.toUpperCase());
        name.textContent = translatedName;
        name.title = translatedName;
        itemDiv.appendChild(name);

        // Controls based on type
        if (item.type === 'engine' || item.type === 'booster') {
            // Engine toggle button - shows ON if stage is still attached AND has throttle
            const toggle = document.createElement('button');
            toggle.className = 'engine-toggle';
            toggle.style.padding = '2px 6px';
            toggle.style.fontSize = '9px';
            toggle.style.border = 'none';
            toggle.style.borderRadius = '3px';
            toggle.style.cursor = 'pointer';
            // Initial state: isStillAttached means this stage hasn't been dropped yet
            // item.active comes from Rocket and means engine is currently firing
            let currentState = isStillAttached && (item.active ?? false);
            toggle.style.backgroundColor = currentState ? '#00aa00' : '#aa0000';
            toggle.textContent = currentState ? 'ON' : 'OFF';
            toggle.onclick = () => {
                // Toggle the state
                currentState = !currentState;
                stagingSystem.toggleEngine(item.instanceId, currentState);
                // Update button visually immediately
                toggle.style.backgroundColor = currentState ? '#00aa00' : '#aa0000';
                toggle.textContent = currentState ? 'ON' : 'OFF';
            };
            itemDiv.appendChild(toggle);
        } else if (item.type === 'tank' && item.fuelPercent !== undefined) {
            // Fuel gauge
            const gaugeContainer = document.createElement('div');
            gaugeContainer.style.width = '40px';
            gaugeContainer.style.height = '8px';
            gaugeContainer.style.backgroundColor = '#333';
            gaugeContainer.style.borderRadius = '4px';
            gaugeContainer.style.overflow = 'hidden';
            gaugeContainer.style.border = '1px solid #555';

            const gaugeBar = document.createElement('div');
            gaugeBar.className = 'fuel-gauge';
            gaugeBar.dataset.instanceId = item.instanceId;
            gaugeBar.style.height = '100%';
            gaugeBar.style.width = `${item.fuelPercent}%`;
            gaugeBar.style.backgroundColor = item.fuelPercent < 20 ? '#ff4444' : (item.fuelPercent < 50 ? '#ffbb33' : '#00C851');
            gaugeBar.style.transition = 'width 0.2s, background-color 0.2s';

            gaugeContainer.appendChild(gaugeBar);
            itemDiv.appendChild(gaugeContainer);
        } else if (item.type === 'decoupler' && isCurrentStage) {
            // Decouple button
            const btn = document.createElement('button');
            btn.style.padding = '2px 4px';
            btn.style.fontSize = '8px';
            btn.style.border = 'none';
            btn.style.borderRadius = '3px';
            btn.style.cursor = 'pointer';
            btn.style.backgroundColor = '#ff6600';
            btn.style.color = 'white';
            btn.textContent = '⚡';
            btn.title = 'Decouple';
            btn.onclick = () => {
                stagingSystem.activateDecoupler(item.instanceId);
            };
            itemDiv.appendChild(btn);
        } else if (item.type === 'fairing' && !item.deployed) {
            // Eject button
            const btn = document.createElement('button');
            btn.style.padding = '2px 4px';
            btn.style.fontSize = '8px';
            btn.style.border = 'none';
            btn.style.borderRadius = '3px';
            btn.style.cursor = 'pointer';
            btn.style.backgroundColor = '#cc00cc';
            btn.style.color = 'white';
            btn.textContent = 'EJECT';
            btn.onclick = () => {
                stagingSystem.ejectFairing();
            };
            itemDiv.appendChild(btn);
        } else if (item.type === 'parachute' && !item.deployed) {
            // Deploy button
            const btn = document.createElement('button');
            btn.style.padding = '2px 4px';
            btn.style.fontSize = '8px';
            btn.style.border = 'none';
            btn.style.borderRadius = '3px';
            btn.style.cursor = 'pointer';
            btn.style.backgroundColor = '#00aaaa';
            btn.style.color = 'white';
            btn.textContent = 'DEPLOY';
            btn.onclick = () => {
                stagingSystem.deployParachute();
            };
            itemDiv.appendChild(btn);
        }

        return itemDiv;
    }
    /**
     * Update fuel gauges without rebuilding
     */
    private updateFuelGauges(): void {
        if (!this.rocket || !this.stagesContainer) return;

        // Get fresh stage data with actual fuel states per tank
        const stages = stagingSystem.getStages();

        // Update fuel gauges and engine toggles per stage
        const stageBlocks = this.stagesContainer.querySelectorAll('.stage-block') as NodeListOf<HTMLElement>;
        stageBlocks.forEach(stageBlock => {
            const stageIndex = parseInt(stageBlock.dataset.stageIndex || '0');
            const stage = stages.find(s => s.index === stageIndex);
            if (!stage) return;

            // Update fuel gauges for tanks in this stage
            const gauges = stageBlock.querySelectorAll('.fuel-gauge') as NodeListOf<HTMLElement>;
            const tanks = stage.items.filter(item => item.type === 'tank');

            gauges.forEach((gauge, idx) => {
                const tank = tanks[idx];
                if (tank && tank.fuelPercent !== undefined) {
                    const fuelPercent = tank.fuelPercent;
                    gauge.style.width = `${fuelPercent}%`;
                    gauge.style.backgroundColor = fuelPercent < 20 ? '#ff4444' : (fuelPercent < 50 ? '#ffbb33' : '#00C851');
                }
            });

            // Find engine items and update their toggles
            const toggles = stageBlock.querySelectorAll('.engine-toggle') as NodeListOf<HTMLButtonElement>;
            const engines = stage.items.filter(item => item.type === 'engine' || item.type === 'booster');

            toggles.forEach((toggle, idx) => {
                const engine = engines[idx];
                if (engine) {
                    // Use actual part.active state from Rocket
                    const isOn = engine.active ?? false;
                    toggle.style.backgroundColor = isOn ? '#00aa00' : '#aa0000';
                    toggle.textContent = isOn ? 'ON' : 'OFF';
                }
            });
        });
    }

    /**
     * Show the panel
     */
    show(): void {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    /**
     * Hide the panel
     */
    hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Get the container element
     */
    getContainer(): HTMLDivElement | null {
        return this.container;
    }

    /** Get the content element (for embedded mode) */
    getContent(): HTMLDivElement | null {
        return this.content;
    }

    /**
     * Clean up
     */
    dispose(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.stagesContainer = null;
    }
}
