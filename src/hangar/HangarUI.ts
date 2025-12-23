import { PartRegistry } from './PartRegistry';
import { RocketAssembly } from './RocketAssembly';
import type { PartDefinition } from './PartDefinition';
import { RocketSaveManager } from './RocketSaveManager';
import { GameTimeManager } from '../managers/GameTimeManager';
import i18next from 'i18next';
import { Agencies } from '../config/Agencies';
import { HangarStagingPanel } from './HangarStagingPanel';
import { getAllLaunchPads } from '../config/LaunchPads';


export class HangarUI {
    container: HTMLDivElement;
    palette: HTMLDivElement;
    statsPanel: HTMLDivElement;
    actionsPanel: HTMLDivElement;
    assembly: RocketAssembly;
    onPartSelected: (partId: string) => void;
    onLaunch: () => void;
    onSave: (name: string) => void;
    onLoad: (assembly: RocketAssembly) => void;
    onBack: () => void;
    onNew: () => void;

    // Stat value elements
    massValue!: HTMLSpanElement;
    costValue!: HTMLSpanElement;
    deltaVValue!: HTMLSpanElement;
    twrValue!: HTMLSpanElement;

    rocketNameInput!: HTMLInputElement;
    mirrorButton!: HTMLButtonElement;
    cogButton!: HTMLButtonElement;
    isMirrorActive: boolean = false;
    isCoGActive: boolean = false;

    onToggleMirror: (active: boolean) => void;
    onToggleCoG: (active: boolean) => void;

    // Selected launch pad for sandbox mode
    selectedLaunchPad: string = 'baikonur';
    onLaunchPadChange?: (launchPadId: string) => void;

    // Sidebar State
    private isPaletteOpen: boolean = true;
    private currentGroupBy: 'type' | 'country' | 'agency' | 'year' | 'family' = 'type';
    private collapsedGroups: Set<string> = new Set(); // Default all open (Opt-out)
    private stagingPanel: HangarStagingPanel | null = null;


    private languageChangeListener: (() => void) | null = null;
    private getTime: () => number;

    constructor(
        assembly: RocketAssembly,
        onPartSelected: (partId: string) => void,
        onLaunch: () => void,
        onSave: (name: string) => void,
        onLoad: (assembly: RocketAssembly) => void,
        onBack: () => void,
        onNew: () => void,
        onToggleMirror: (active: boolean) => void,
        onToggleCoG: (active: boolean) => void,
        getTime: () => number // Injected time provider (Manual assignment)
    ) {
        this.getTime = getTime;
        this.assembly = assembly;
        this.onPartSelected = onPartSelected;
        this.onLaunch = onLaunch;
        this.onSave = onSave;
        this.onLoad = onLoad;
        this.onBack = onBack;
        this.onNew = onNew;
        this.onToggleMirror = onToggleMirror;
        this.onToggleCoG = onToggleCoG;

        this.container = document.createElement('div');
        this.container.id = 'hangar-ui';
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none'; // Let clicks pass through to canvas

        this.palette = this.createPalette();
        this.statsPanel = this.createStatsPanel();
        this.rocketNameInput = this.createNameInput();
        this.mirrorButton = this.createMirrorButton();
        this.cogButton = this.createCoGButton();

        this.container.appendChild(this.palette);
        this.container.appendChild(this.statsPanel);
        this.container.appendChild(this.rocketNameInput);
        this.container.appendChild(this.mirrorButton);
        this.container.appendChild(this.cogButton);
        this.container.appendChild(this.createBackButton());

        // Staging Panel
        this.stagingPanel = new HangarStagingPanel(this.assembly);
        this.container.appendChild(this.stagingPanel.getContainer());

        // Actions Panel (right side)
        this.actionsPanel = this.createActionsPanel();
        this.container.appendChild(this.actionsPanel);

        document.body.appendChild(this.container);

        // Key Listeners
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'm' && document.activeElement !== this.rocketNameInput) {
                this.toggleMirror();
            }
            if (e.key.toLowerCase() === 'c' && document.activeElement !== this.rocketNameInput) {
                this.toggleCoG();
            }
        });

        // Initial stats update
        this.updateStats();

        // Listen for language changes
        this.languageChangeListener = () => {
            this.refreshUI();
        };
        i18next.on('languageChanged', this.languageChangeListener);
    }

    private refreshUI() {
        // Update Name Input Placeholder
        if (this.rocketNameInput) {
            this.rocketNameInput.placeholder = i18next.t('hangar.untitledRocket');
        }

        // Re-render Palette
        if (this.palette) {
            this.palette.innerHTML = ''; // Clear existing
            this.renderPaletteContent(this.palette); // Re-populate
        }

        // Re-render Stats Panel
        if (this.statsPanel) {
            this.statsPanel.innerHTML = '';
            this.renderStatsPanelContent(this.statsPanel);
            this.updateStats(); // Re-bind values
        }
    }

    private toggleMirror() {
        this.isMirrorActive = !this.isMirrorActive;
        this.mirrorButton.style.backgroundColor = this.isMirrorActive ? '#00aaff' : 'rgba(30, 30, 30, 0.9)';
        this.onToggleMirror(this.isMirrorActive);
    }

    private toggleCoG() {
        this.isCoGActive = !this.isCoGActive;
        this.cogButton.style.backgroundColor = this.isCoGActive ? '#FF00FF' : 'rgba(30, 30, 30, 0.9)';
        this.onToggleCoG(this.isCoGActive);
    }

    private createMirrorButton(): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.innerHTML = i18next.t('hangar.mirrorMode');
        btn.style.position = 'absolute';
        btn.style.top = '60px'; // Below name input
        btn.style.left = '50%';
        btn.style.transform = 'translateX(-50%)';
        btn.style.padding = '8px 15px';
        btn.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';
        btn.style.color = '#fff';
        btn.style.border = '1px solid #444';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.pointerEvents = 'auto';
        btn.style.fontWeight = 'bold';
        btn.style.fontSize = '14px';

        btn.onclick = () => this.toggleMirror();
        return btn;
    }

    private createCoGButton(): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.innerHTML = i18next.t('hangar.showCoG');
        btn.style.position = 'absolute';
        btn.style.top = '100px'; // Below mirror button
        btn.style.left = '50%';
        btn.style.transform = 'translateX(-50%)';
        btn.style.padding = '8px 15px';
        btn.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';
        btn.style.color = '#fff';
        btn.style.border = '1px solid #444';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.pointerEvents = 'auto';
        btn.style.fontWeight = 'bold';
        btn.style.fontSize = '14px';

        btn.onclick = () => this.toggleCoG();
        return btn;
    }

    public setRocketName(name: string) {
        if (this.rocketNameInput) {
            this.rocketNameInput.value = name;
        }
    }

    private createNameInput(): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = this.assembly.name;
        input.placeholder = i18next.t('hangar.untitledRocket');
        input.style.position = 'absolute';
        input.style.top = '20px';
        input.style.left = '50%';
        input.style.transform = 'translateX(-50%)';
        input.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';
        input.style.border = '1px solid #444';
        input.style.borderRadius = '4px';
        input.style.color = '#fff';
        input.style.padding = '8px 15px';
        input.style.fontSize = '16px';
        input.style.textAlign = 'center';
        input.style.pointerEvents = 'auto';
        input.style.width = '300px';

        input.addEventListener('input', () => {
            this.assembly.name = input.value;
        });

        return input;
    }

    private createBackButton(): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.innerHTML = i18next.t('menu.back');
        btn.style.position = 'absolute';
        btn.style.top = '20px';
        btn.style.right = '20px';
        btn.style.padding = '10px 20px';
        btn.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';
        btn.style.color = '#fff';
        btn.style.border = '1px solid #444';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';
        btn.style.pointerEvents = 'auto';
        btn.style.fontWeight = 'bold';
        btn.style.fontSize = '14px';

        btn.onmouseover = () => btn.style.backgroundColor = '#3a3a3a';
        btn.onmouseout = () => btn.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';

        btn.onclick = () => this.onBack();
        return btn;
    }

    private createPalette(): HTMLDivElement {
        // Root Container (Anchor)
        const root = document.createElement('div');
        root.style.position = 'absolute';
        root.style.top = '20px';
        root.style.left = '20px';
        root.style.height = 'calc(100% - 40px)';
        root.style.pointerEvents = 'none'; // Allow clicks to pass through spacer areas
        root.style.zIndex = '100'; // Ensure above scene

        // Sliding Wrapper (Moves both Palette and Button)
        const slider = document.createElement('div');
        slider.style.display = 'flex';
        slider.style.alignItems = 'flex-start'; // Align top
        slider.style.height = '100%';
        slider.style.pointerEvents = 'auto'; // Re-enable clicks
        slider.style.transition = 'transform 0.3s ease-in-out';
        slider.style.transform = 'translateX(0)'; // Start open

        // Palette Content (The List)
        const palette = document.createElement('div');
        palette.id = 'hangar-palette';
        palette.style.width = '260px'; // Palette width
        palette.style.backgroundColor = 'rgba(30, 30, 30, 0.95)';
        palette.style.border = '1px solid #444';
        palette.style.borderRadius = '8px';
        palette.style.display = 'flex';
        palette.style.flexDirection = 'column';
        palette.style.height = '100%';
        palette.style.overflow = 'hidden';
        palette.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';

        // Toggle Button (Outside palette, inside slider)
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '◀';
        toggleBtn.style.width = '24px';
        toggleBtn.style.height = '64px';
        toggleBtn.style.marginTop = '20px'; // Fallback
        toggleBtn.style.alignSelf = 'center'; // Proper flex centering
        toggleBtn.style.backgroundColor = '#444';
        toggleBtn.style.border = '1px solid #555';
        toggleBtn.style.borderLeft = 'none';
        toggleBtn.style.borderRadius = '0 6px 6px 0';
        toggleBtn.style.color = '#fff';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.display = 'flex';
        toggleBtn.style.alignItems = 'center';
        toggleBtn.style.justifyContent = 'center';
        toggleBtn.style.fontSize = '12px';
        toggleBtn.style.boxShadow = '2px 0 5px rgba(0,0,0,0.3)';

        toggleBtn.onclick = () => {
            this.isPaletteOpen = !this.isPaletteOpen;
            if (this.isPaletteOpen) {
                slider.style.transform = 'translateX(0)';
                toggleBtn.textContent = '◀';
            } else {
                slider.style.transform = 'translateX(-262px)'; // Width + Border approx
                toggleBtn.textContent = '▶';
            }
        };

        slider.appendChild(palette);
        slider.appendChild(toggleBtn);
        root.appendChild(slider);

        this.renderPaletteContent(palette);

        return root;
    }

    private renderPaletteContent(palette: HTMLDivElement) {
        palette.innerHTML = '';

        // 1. Header & Controls
        const header = document.createElement('div');
        header.style.padding = '10px';
        header.style.borderBottom = '1px solid #444';
        header.style.backgroundColor = '#222';

        const title = document.createElement('h3');
        const currentYear = GameTimeManager.getYear((window as any).game?.elapsedGameTime || 0);
        title.textContent = i18next.t('hangar.partsYear', { year: currentYear });
        title.style.margin = '0 0 10px 0';
        title.style.fontSize = '14px';
        title.style.textAlign = 'center';
        title.style.color = '#aaa';
        header.appendChild(title);

        // Group By Selector
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const label = document.createElement('span');
        label.textContent = i18next.t('hangar.groupBy', { defaultValue: 'Group:' });
        label.style.fontSize = '12px';
        label.style.color = '#ddd';
        row.appendChild(label);

        const select = document.createElement('select');
        select.style.backgroundColor = '#444';
        select.style.color = '#fff';
        select.style.border = '1px solid #666';
        select.style.borderRadius = '4px';
        select.style.padding = '4px';
        select.style.fontSize = '14px';

        const options = ['type', 'country', 'agency', 'year', 'family'];
        options.forEach(opt => {
            const op = document.createElement('option');
            op.value = opt;
            op.textContent = i18next.t(`hangar.group.${opt}`, { defaultValue: opt.charAt(0).toUpperCase() + opt.slice(1) });
            if (opt === this.currentGroupBy) op.selected = true;
            select.appendChild(op);
        });

        select.onchange = () => {
            this.currentGroupBy = select.value as any;
            this.refreshPaletteList(listContainer);
        };
        row.appendChild(select);
        header.appendChild(row);

        palette.appendChild(header);

        // 2. Scrollable List Area
        const listContainer = document.createElement('div');
        listContainer.style.flex = '1';
        listContainer.style.overflowY = 'auto';
        listContainer.style.overflowX = 'hidden';
        listContainer.style.padding = '10px';

        // Custom Scrollbar
        const style = document.createElement('style');
        style.textContent = `
            #hangar-palette ::-webkit-scrollbar { width: 6px; }
            #hangar-palette ::-webkit-scrollbar-track { background: #222; }
            #hangar-palette ::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
            #hangar-palette ::-webkit-scrollbar-thumb:hover { background: #777; }
        `;
        palette.appendChild(style);

        palette.appendChild(listContainer);

        this.refreshPaletteList(listContainer);
    }

    private refreshPaletteList(container: HTMLDivElement) {
        container.innerHTML = '';

        // Get time from injected provider
        const effectiveTime = this.getTime();
        const currentYear = GameTimeManager.getYear(effectiveTime);

        const allParts = PartRegistry.getAll().filter(part => {
            const partYear = part.creationYear || 1957;
            return partYear <= currentYear;
        });

        console.log(`[HangarUI] Found ${allParts.length} parts for year ${currentYear}`, allParts);

        if (allParts.length === 0) {
            container.innerHTML = `<div style="color:#888;text-align:center">${i18next.t('hangar.noParts')}</div>`;
            return;
        }

        // Group Parts
        const groups = this.groupParts(allParts);

        // Render Groups
        groups.forEach(group => {
            this.rendergroupAccordion(container, group);
        });

        // Add Trash at bottom
        const trash = document.createElement('div');
        trash.id = 'hangar-trash';
        trash.style.marginTop = '20px';
        trash.style.padding = '20px';
        trash.style.border = '2px dashed #ff4444';
        trash.style.borderRadius = '8px';
        trash.style.color = '#ff4444';
        trash.style.textAlign = 'center';
        trash.style.fontWeight = 'bold';
        trash.textContent = i18next.t('hangar.dropToDelete');
        container.appendChild(trash);
    }

    private groupParts(parts: PartDefinition[]): { name: string, parts: PartDefinition[] }[] {
        const map = new Map<string, PartDefinition[]>();

        parts.forEach(part => {
            let key = 'Other';

            switch (this.currentGroupBy) {
                case 'type':
                    key = i18next.t(`partType.${part.type}`, { defaultValue: part.type });
                    break;
                case 'country':
                    key = part.country || 'Unknown';
                    break;
                case 'agency':
                    key = part.agency ? (Agencies[part.agency]?.name || part.agency) : 'Unknown';
                    break;
                case 'year':
                    key = part.creationYear ? part.creationYear.toString() : 'Unknown';
                    break;
                case 'family':
                    key = part.family || 'Generic';
                    break;
            }

            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(part);
        });

        // Sort Groups
        const sortedKeys = Array.from(map.keys()).sort();
        // Custom sort for 'type' could be added here to prioritize capsules/tanks/engines

        return sortedKeys.map(key => ({
            name: key,
            parts: map.get(key)!
        }));
    }

    private rendergroupAccordion(container: HTMLDivElement, group: { name: string, parts: PartDefinition[] }) {
        const isCollapsed = this.collapsedGroups.has(group.name);

        const section = document.createElement('div');
        section.style.marginBottom = '2px'; // Tighter spacing
        section.style.border = '1px solid #444';
        section.style.borderRadius = '4px';
        section.style.overflow = 'hidden';

        // Header
        const header = document.createElement('div');
        header.style.padding = '12px 10px'; // Larger touch target
        header.style.backgroundColor = '#333';
        header.style.cursor = 'pointer';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.userSelect = 'none';
        header.style.transition = 'background-color 0.2s';

        header.onmouseover = () => header.style.backgroundColor = '#3a3a3a';
        header.onmouseout = () => header.style.backgroundColor = '#333';

        const title = document.createElement('span');
        title.textContent = `${group.name} (${group.parts.length})`;
        title.style.fontWeight = 'bold';
        title.style.color = '#eee';
        title.style.fontSize = '13px';

        const arrow = document.createElement('span');
        arrow.textContent = isCollapsed ? '▶' : '▼';
        arrow.style.fontSize = '12px';
        arrow.style.color = '#aaa';

        header.appendChild(title);
        header.appendChild(arrow);

        header.onclick = () => {
            if (this.collapsedGroups.has(group.name)) {
                this.collapsedGroups.delete(group.name);
            } else {
                this.collapsedGroups.add(group.name);
            }

            // Re-render toggle
            const body = section.querySelector('.group-body') as HTMLElement;
            if (body) {
                if (this.collapsedGroups.has(group.name)) {
                    body.style.display = 'none';
                    arrow.textContent = '▶';
                } else {
                    body.style.display = 'grid';
                    arrow.textContent = '▼';
                }
            }
        };

        section.appendChild(header);

        // Body (Items)
        const body = document.createElement('div');
        body.className = 'group-body';
        body.style.display = isCollapsed ? 'none' : 'grid'; // Default open
        body.style.gridTemplateColumns = 'repeat(auto-fill, minmax(60px, 1fr))';
        body.style.gap = '8px';
        body.style.padding = '10px';
        body.style.backgroundColor = '#2a2a2a';

        group.parts.forEach(part => {
            const item = this.createPartItem(part);
            body.appendChild(item);
        });

        section.appendChild(body);
        container.appendChild(section);
    }

    private createPartItem(part: PartDefinition): HTMLDivElement {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.flexDirection = 'column';
        item.style.alignItems = 'center';
        item.style.padding = '5px';
        item.style.backgroundColor = '#3a3a3a';
        item.style.borderRadius = '4px';
        item.style.cursor = 'pointer';

        // Icon
        const icon = document.createElement('img');
        icon.src = part.texture;
        icon.style.width = '40px';
        icon.style.height = '40px';
        icon.style.objectFit = 'contain';
        item.appendChild(icon);

        // Name (Truncated)
        const name = document.createElement('span');
        name.textContent = i18next.t(part.name);
        name.style.fontSize = '10px';
        name.style.color = '#ccc';
        name.style.textAlign = 'center';
        name.style.marginTop = '4px';
        name.style.overflow = 'hidden';
        name.style.textOverflow = 'ellipsis';
        name.style.whiteSpace = 'nowrap';
        name.style.maxWidth = '100%';
        item.appendChild(name);

        // Interaction - Mouse
        item.onmousedown = (e) => {
            e.preventDefault();
            this.onPartSelected(part.id);
        };

        // Interaction - Touch (for mobile)
        item.ontouchstart = (e) => {
            e.preventDefault();
            this.onPartSelected(part.id);
        };

        // Tooltip (desktop only - use long press for mobile)
        const tooltip = this.createTooltip(part);
        let tooltipTimeout: number | null = null;

        item.onmouseenter = () => {
            item.style.backgroundColor = '#555';
            document.body.appendChild(tooltip);
            const rect = item.getBoundingClientRect();
            tooltip.style.left = `${rect.right + 10}px`;
            tooltip.style.top = `${rect.top}px`;
        };
        item.onmouseleave = () => {
            item.style.backgroundColor = '#3a3a3a';
            if (tooltip.parentElement) document.body.removeChild(tooltip);
        };

        // Long press for tooltip on mobile
        item.ontouchend = () => {
            if (tooltipTimeout) {
                clearTimeout(tooltipTimeout);
                tooltipTimeout = null;
            }
            if (tooltip.parentElement) document.body.removeChild(tooltip);
        };

        return item;
    }



    createTooltip(part: PartDefinition): HTMLDivElement {
        const tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = '#1a1a1a';
        tooltip.style.border = '2px solid #444';
        tooltip.style.borderRadius = '4px';
        tooltip.style.padding = '10px';
        tooltip.style.color = '#ddd';
        tooltip.style.fontSize = '12px';
        tooltip.style.zIndex = '10000';
        tooltip.style.minWidth = '200px';
        tooltip.style.pointerEvents = 'none';

        let content = `<strong>${i18next.t(part.name)}</strong><br>`;
        content += `<em>${i18next.t(part.description)}</em><br><br>`;

        if (part.country) {
            content += `${i18next.t('hangar.country', { defaultValue: 'Country' })}: ${part.country}<br>`;
        }
        if (part.agency && Agencies[part.agency]) {
            content += `${i18next.t('hangar.agency', { defaultValue: 'Agency' })}: ${Agencies[part.agency].name}<br>`;
        } else if (part.agency) {
            content += `${i18next.t('hangar.agency', { defaultValue: 'Agency' })}: ${part.agency}<br>`;
        }

        if (part.stats.mass !== undefined) {
            content += `${i18next.t('hangar.mass')} ${part.stats.mass} kg<br>`;
        }
        if (part.stats.fuel !== undefined) {
            content += `Fuel: ${part.stats.fuel} kg<br>`;
        }
        if (part.stats.thrust !== undefined) {
            content += `Thrust: ${(part.stats.thrust / 1000).toFixed(0)} kN<br>`;
        }
        if (part.stats.isp !== undefined) {
            content += `ISP: ${part.stats.isp}s<br>`;
        }
        if (part.stats.cost !== undefined) {
            content += `${i18next.t('hangar.cost')} $${part.stats.cost}<br>`;
        }
        if (part.stats.electricity !== undefined) {
            content += `Electricity: ${part.stats.electricity} EC<br>`;
        }
        if (part.stats.sasConsumption !== undefined) {
            content += `SAS Consume: ${part.stats.sasConsumption} EC/s<br>`;
        }
        if (part.stats.chargeRate !== undefined) {
            content += `${i18next.t('hangar.chargeRate', { defaultValue: 'Charge Rate:' })} ${part.stats.chargeRate} EC/s<br>`;
        }

        tooltip.innerHTML = content;
        return tooltip;
    }

    isOverPalette(x: number, y: number): boolean {
        const rect = this.palette.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }

    private createStatsPanel(): HTMLDivElement {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.bottom = '20px';
        wrapper.style.left = '50%';
        wrapper.style.transform = 'translateX(-50%)';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'center';
        wrapper.style.pointerEvents = 'auto';

        // Toggle button (horizontal: 64x24, like flipped version of side panels)
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '▼';
        toggleBtn.style.width = '64px';
        toggleBtn.style.height = '24px';
        toggleBtn.style.backgroundColor = '#444';
        toggleBtn.style.border = '1px solid #555';
        toggleBtn.style.borderBottom = 'none';
        toggleBtn.style.borderRadius = '6px 6px 0 0';
        toggleBtn.style.color = '#fff';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.fontSize = '12px';

        const panel = document.createElement('div');
        panel.style.width = '280px';
        panel.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';
        panel.style.border = '1px solid #444';
        panel.style.borderRadius = '8px';
        panel.style.padding = '10px';
        panel.style.color = '#fff';

        let isOpen = true;
        toggleBtn.onclick = () => {
            isOpen = !isOpen;
            panel.style.display = isOpen ? 'block' : 'none';
            toggleBtn.textContent = isOpen ? '▼' : '▲';
        };

        wrapper.appendChild(toggleBtn);
        wrapper.appendChild(panel);

        this.renderStatsPanelContent(panel);
        return wrapper;
    }

    private renderStatsPanelContent(panel: HTMLDivElement) {
        panel.style.fontFamily = 'monospace';

        const createStatRow = (label: string, valueSpan: HTMLSpanElement, color?: string) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            row.appendChild(labelSpan);
            if (color) {
                valueSpan.style.color = color;
            }
            row.appendChild(valueSpan);
            return row;
        };

        const title = document.createElement('h3');
        title.style.margin = '0 0 10px 0';
        title.style.textAlign = 'center';
        title.style.color = '#00aaff';
        title.textContent = i18next.t('hangar.rocketStats');
        panel.appendChild(title);

        this.massValue = document.createElement('span');
        panel.appendChild(createStatRow(i18next.t('hangar.mass'), this.massValue));

        this.costValue = document.createElement('span');
        panel.appendChild(createStatRow(i18next.t('hangar.cost'), this.costValue));

        this.deltaVValue = document.createElement('span');
        panel.appendChild(createStatRow(i18next.t('hangar.deltaV'), this.deltaVValue, '#00ff00'));

        this.twrValue = document.createElement('span');
        panel.appendChild(createStatRow(i18next.t('hangar.twr'), this.twrValue));
    }

    private createActionsPanel(): HTMLDivElement {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.bottom = '20px';
        wrapper.style.right = '20px';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'flex-end';
        wrapper.style.pointerEvents = 'auto';

        // Toggle button (vertical: 24x64, same as parts palette and staging panel)
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '▶';
        toggleBtn.style.width = '24px';
        toggleBtn.style.height = '64px';
        toggleBtn.style.backgroundColor = '#444';
        toggleBtn.style.border = '1px solid #555';
        toggleBtn.style.borderRight = 'none';
        toggleBtn.style.borderRadius = '6px 0 0 6px';
        toggleBtn.style.color = '#fff';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.fontSize = '12px';

        const panel = document.createElement('div');
        panel.style.width = '140px';
        panel.style.backgroundColor = 'rgba(30, 30, 30, 0.9)';
        panel.style.border = '1px solid #444';
        panel.style.borderRadius = '8px';
        panel.style.padding = '10px';
        panel.style.color = '#fff';
        panel.style.display = 'flex';
        panel.style.flexDirection = 'column';
        panel.style.gap = '8px';

        let isOpen = true;
        toggleBtn.onclick = () => {
            isOpen = !isOpen;
            panel.style.display = isOpen ? 'flex' : 'none';
            toggleBtn.textContent = isOpen ? '▶' : '◀';
        };

        // New Button
        const newButton = document.createElement('button');
        newButton.style.width = '100%';
        newButton.style.padding = '8px';
        newButton.style.backgroundColor = '#ff9800';
        newButton.style.color = 'white';
        newButton.style.border = 'none';
        newButton.style.borderRadius = '4px';
        newButton.style.cursor = 'pointer';
        newButton.style.fontWeight = 'bold';
        newButton.textContent = i18next.t('hangar.new');
        newButton.onclick = () => {
            if (this.assembly.parts.length > 0) {
                this.showConfirmDialog(
                    i18next.t('hangar.startNewPrompt'),
                    () => this.onNew()
                );
            } else {
                this.onNew();
            }
        };
        panel.appendChild(newButton);

        // Load Button
        const loadButton = document.createElement('button');
        loadButton.style.width = '100%';
        loadButton.style.padding = '8px';
        loadButton.style.backgroundColor = '#4a9eff';
        loadButton.style.color = 'white';
        loadButton.style.border = 'none';
        loadButton.style.borderRadius = '4px';
        loadButton.style.cursor = 'pointer';
        loadButton.style.fontWeight = 'bold';
        loadButton.textContent = i18next.t('hangar.load');
        loadButton.onclick = () => this.showLoadDialog();
        panel.appendChild(loadButton);

        // Save Button
        const saveButton = document.createElement('button');
        saveButton.style.width = '100%';
        saveButton.style.padding = '8px';
        saveButton.style.backgroundColor = '#5a5a5a';
        saveButton.style.color = 'white';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '4px';
        saveButton.style.cursor = 'pointer';
        saveButton.style.fontWeight = 'bold';
        saveButton.textContent = '💾 ' + i18next.t('settings.save');
        saveButton.onclick = () => this.showSaveDialog();
        panel.appendChild(saveButton);

        // Launch Pad Selector
        const launchPadLabel = document.createElement('div');
        launchPadLabel.style.fontSize = '11px';
        launchPadLabel.style.color = '#999';
        launchPadLabel.style.marginBottom = '2px';
        launchPadLabel.textContent = '📍 Launch Site';
        panel.appendChild(launchPadLabel);

        const launchPadSelect = document.createElement('select');
        launchPadSelect.style.width = '100%';
        launchPadSelect.style.padding = '6px';
        launchPadSelect.style.backgroundColor = '#2a2a2a';
        launchPadSelect.style.color = '#fff';
        launchPadSelect.style.border = '1px solid #444';
        launchPadSelect.style.borderRadius = '4px';
        launchPadSelect.style.cursor = 'pointer';
        launchPadSelect.style.fontSize = '12px';

        // Populate with launch pads grouped by country
        const launchPads = getAllLaunchPads().sort((a, b) => a.country.localeCompare(b.country));
        for (const pad of launchPads) {
            const option = document.createElement('option');
            option.value = pad.id;
            option.textContent = `${pad.name} (${pad.latitude}°N)`;
            if (pad.id === this.selectedLaunchPad) {
                option.selected = true;
            }
            launchPadSelect.appendChild(option);
        }

        launchPadSelect.onchange = () => {
            this.selectedLaunchPad = launchPadSelect.value;
            if (this.onLaunchPadChange) {
                this.onLaunchPadChange(this.selectedLaunchPad);
            }
        };
        panel.appendChild(launchPadSelect);

        // Launch Button
        const launchButton = document.createElement('button');
        launchButton.id = 'launch-btn';
        launchButton.style.width = '100%';
        launchButton.style.padding = '10px';
        launchButton.style.marginTop = '5px';
        launchButton.style.backgroundColor = '#00aaff';
        launchButton.style.color = 'white';
        launchButton.style.border = 'none';
        launchButton.style.borderRadius = '4px';
        launchButton.style.cursor = 'pointer';
        launchButton.style.fontWeight = 'bold';
        launchButton.style.fontSize = '14px';
        launchButton.textContent = '🚀 ' + i18next.t('hangar.launch');
        launchButton.onclick = () => this.onLaunch();
        panel.appendChild(launchButton);

        wrapper.appendChild(toggleBtn);
        wrapper.appendChild(panel);
        return wrapper;
    }

    updateStats() {
        const stats = this.assembly.getStats();
        const deltaV = this.assembly.calculateDeltaV();
        const dryMass = stats.mass - (stats.fuel || 0);
        const twr = stats.thrust && stats.mass > 0 ? stats.thrust / (stats.mass * 9.81) : 0;

        this.massValue.textContent = `${stats.mass.toFixed(0)} kg`;
        this.costValue.textContent = `$${stats.cost.toFixed(0)}`;
        this.deltaVValue.textContent = `${deltaV.toFixed(0)} m/s`;
        this.twrValue.textContent = twr.toFixed(2);

        // Update mass breakdown tooltip
        this.massValue.title = `Dry Mass: ${dryMass.toFixed(0)} kg\nFuel: ${(stats.fuel || 0).toFixed(0)} kg\nTotal: ${stats.mass.toFixed(0)} kg`;

        // Update staging panel
        this.stagingPanel?.update();
    }

    showSaveDialog() {
        const existingDialog = document.getElementById('save-dialog');
        if (existingDialog && existingDialog.parentElement && existingDialog.parentElement.parentElement) {
            existingDialog.parentElement.parentElement.removeChild(existingDialog.parentElement);
        }

        const overlay = this.createDialogOverlay();
        const dialog = document.createElement('div');
        dialog.id = 'save-dialog';
        dialog.style.backgroundColor = '#2a2a2a';
        dialog.style.border = '2px solid #444';
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '20px';
        dialog.style.minWidth = '300px';
        dialog.style.maxWidth = '400px';

        const title = document.createElement('h3');
        title.textContent = i18next.t('hangar.saveRocket');
        title.style.color = '#fff';
        title.style.margin = '0 0 15px 0';
        dialog.appendChild(title);

        const input = document.createElement('input');
        input.type = 'text';
        input.value = this.assembly.name;
        input.placeholder = i18next.t('hangar.enterName');
        input.style.width = '100%';
        input.style.padding = '8px';
        input.style.marginBottom = '15px';
        input.style.backgroundColor = '#1a1a1a';
        input.style.color = '#fff';
        input.style.border = '1px solid #444';
        input.style.borderRadius = '4px';
        input.style.fontSize = '14px';
        input.style.boxSizing = 'border-box';
        dialog.appendChild(input);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = i18next.t('settings.save');
        saveBtn.style.flex = '1';
        saveBtn.style.padding = '8px';
        saveBtn.style.backgroundColor = '#00aaff';
        saveBtn.style.color = 'white';
        saveBtn.style.border = 'none';
        saveBtn.style.borderRadius = '4px';
        saveBtn.style.cursor = 'pointer';
        saveBtn.style.fontWeight = 'bold';
        saveBtn.onclick = async () => {
            const name = input.value.trim();
            if (!name) {
                alert(i18next.t('hangar.pleaseEnterName'));
                return;
            }

            // Check authentication status
            const { FirebaseService } = await import('../services/firebase');
            const user = FirebaseService.auth.currentUser;

            // Check if rocket already exists
            if (await RocketSaveManager.exists(name, user?.uid)) {
                this.showConfirmDialog(
                    i18next.t('hangar.overridePrompt', { name: name }),
                    () => {
                        this.onSave(name);
                        overlay.remove();
                    }
                );
            } else {
                this.onSave(name);
                overlay.remove();
            }
        };
        buttonContainer.appendChild(saveBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = i18next.t('settings.cancel');
        cancelBtn.style.flex = '1';
        cancelBtn.style.padding = '8px';
        cancelBtn.style.backgroundColor = '#5a5a5a';
        cancelBtn.style.color = 'white';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '4px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.onclick = () => overlay.remove();
        buttonContainer.appendChild(cancelBtn);

        dialog.appendChild(buttonContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Focus input and select on enter
        input.focus();
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveBtn.click();
        });
    }

    async showLoadDialog() {
        const existingDialog = document.getElementById('load-dialog');
        if (existingDialog && existingDialog.parentElement && existingDialog.parentElement.parentElement) {
            existingDialog.parentElement.parentElement.removeChild(existingDialog.parentElement);
        }

        const { FirebaseService } = await import('../services/firebase');
        const user = FirebaseService.auth.currentUser;
        const savedRockets = await RocketSaveManager.list(user?.uid);

        const overlay = this.createDialogOverlay();
        const dialog = document.createElement('div');
        dialog.id = 'load-dialog';
        dialog.style.backgroundColor = '#2a2a2a';
        dialog.style.border = '2px solid #444';
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '20px';
        dialog.style.minWidth = '400px';
        dialog.style.maxWidth = '500px';
        dialog.style.maxHeight = '70vh';
        dialog.style.overflowY = 'auto';

        const title = document.createElement('h3');
        title.textContent = i18next.t('hangar.loadRocket');
        title.style.color = '#fff';
        title.style.margin = '0 0 15px 0';
        dialog.appendChild(title);

        if (savedRockets.length === 0) {
            const empty = document.createElement('p');
            empty.textContent = i18next.t('hangar.noSavedRockets');
            empty.style.color = '#999';
            empty.style.textAlign = 'center';
            empty.style.padding = '20px';
            dialog.appendChild(empty);
        } else {
            savedRockets.forEach(rocket => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.padding = '10px';
                item.style.marginBottom = '8px';
                item.style.backgroundColor = '#1a1a1a';
                item.style.borderRadius = '4px';
                item.style.cursor = 'pointer';
                item.style.transition = 'background 0.2s';

                const info = document.createElement('div');
                info.style.flex = '1';

                const name = document.createElement('div');
                name.textContent = rocket.name;
                name.style.color = '#fff';
                name.style.fontWeight = 'bold';
                name.style.marginBottom = '4px';
                info.appendChild(name);

                const details = document.createElement('div');
                details.style.color = '#999';
                details.style.fontSize = '12px';
                const date = new Date(rocket.savedAt).toLocaleString();
                details.textContent = `${rocket.partCount} parts • ${date}`;
                info.appendChild(details);

                item.appendChild(info);

                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.style.padding = '5px 10px';
                deleteBtn.style.backgroundColor = '#ff4444';
                deleteBtn.style.color = 'white';
                deleteBtn.style.border = 'none';
                deleteBtn.style.borderRadius = '4px';
                deleteBtn.style.cursor = 'pointer';
                deleteBtn.style.marginLeft = '10px';
                deleteBtn.onclick = async (e) => {
                    e.stopPropagation();
                    this.showConfirmDialog(
                        i18next.t('hangar.deletePrompt', { name: rocket.name }),
                        async () => {
                            const { FirebaseService } = await import('../services/firebase');
                            const user = FirebaseService.auth.currentUser;
                            // Use rocket.id (Firebase ID) instead of rocket.name
                            await RocketSaveManager.delete((rocket as any).id || rocket.name, user?.uid);
                            await this.showLoadDialog(); // Refresh list
                        }
                    );
                };
                item.appendChild(deleteBtn);

                item.onmouseover = () => item.style.backgroundColor = '#3a3a3a';
                item.onmouseout = () => item.style.backgroundColor = '#1a1a1a';
                item.onclick = async () => {
                    const { FirebaseService } = await import('../services/firebase');
                    const user = FirebaseService.auth.currentUser;
                    // Use rocket.id (Firebase ID) instead of rocket.name
                    const loaded = await RocketSaveManager.load((rocket as any).id || rocket.name, user?.uid);
                    if (loaded) {
                        this.rocketNameInput.value = loaded.name; // Update Input
                        this.onLoad(loaded);
                        overlay.remove();
                    } else {
                        alert(`Failed to load "${rocket.name}"`);
                    }
                };

                dialog.appendChild(item);
            });
        }

        const closeBtn = document.createElement('button');
        closeBtn.textContent = i18next.t('settings.close');
        closeBtn.style.marginTop = '15px';
        closeBtn.style.width = '100%';
        closeBtn.style.padding = '8px';
        closeBtn.style.backgroundColor = '#5a5a5a';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => overlay.remove();
        dialog.appendChild(closeBtn);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    showConfirmDialog(message: string, onConfirm: () => void, onCancel?: () => void) {
        const overlay = this.createDialogOverlay();
        // Higher z-index to be on top of load dialog
        overlay.style.zIndex = '20000';

        const dialog = document.createElement('div');
        dialog.style.backgroundColor = '#2a2a2a';
        dialog.style.border = '2px solid #ff4444'; // Red border for danger
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '20px';
        dialog.style.minWidth = '300px';
        dialog.style.maxWidth = '400px';
        dialog.style.textAlign = 'center';

        const text = document.createElement('p');
        text.textContent = message;
        text.style.color = '#fff';
        text.style.marginBottom = '20px';
        text.style.fontSize = '16px';
        dialog.appendChild(text);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.justifyContent = 'center';

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = i18next.t('settings.confirm');
        confirmBtn.style.padding = '8px 20px';
        confirmBtn.style.backgroundColor = '#ff4444';
        confirmBtn.style.color = 'white';
        confirmBtn.style.border = 'none';
        confirmBtn.style.borderRadius = '4px';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.style.fontWeight = 'bold';
        confirmBtn.onclick = () => {
            onConfirm();
            overlay.remove();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = i18next.t('settings.cancel');
        cancelBtn.style.padding = '8px 20px';
        cancelBtn.style.backgroundColor = '#5a5a5a';
        cancelBtn.style.color = 'white';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '4px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.onclick = () => {
            if (onCancel) onCancel();
            overlay.remove();
        };

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);
        dialog.appendChild(buttonContainer);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    private createDialogOverlay(): HTMLDivElement {
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
        overlay.style.pointerEvents = 'auto';
        return overlay;
    }
    /**
     * Set callback for when a part is hovered in the staging panel
     */
    setPartHoverCallback(callback: (instanceId: string | null) => void): void {
        if (this.stagingPanel) {
            this.stagingPanel.onPartHover = callback;
        }
    }

    dispose() {
        this.stagingPanel?.dispose();
        if (this.languageChangeListener) {
            i18next.off('languageChanged', this.languageChangeListener);
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
