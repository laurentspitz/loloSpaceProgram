import { RocketAssembly } from './RocketAssembly';
import { PartRegistry } from './PartRegistry';
import type { PartType } from './PartDefinition';
import i18next from 'i18next';

interface HangarStageItem {
    instanceId: string;
    partId: string;
    type: PartType;
    name: string;
}

interface HangarStage {
    index: number;
    items: HangarStageItem[];
}

/**
 * HangarStagingPanel - Displays staging info in the Hangar with drag-and-drop
 * 
 * Features:
 * - Drag stages to reorder
 * - Drag parts between stages
 * - Add empty stages with + buttons
 * - Stage 0 at top (payload), higher numbers below (first to activate)
 */
export class HangarStagingPanel {
    private container: HTMLDivElement;
    private stagesContainer: HTMLDivElement | null = null;
    private assembly: RocketAssembly;

    // Stages storage (allows custom/manual stages)
    private stages: HangarStage[] = [];

    // Drag state
    private draggedStageIndex: number | null = null;
    private draggedItem: { stageIndex: number; itemIndex: number } | null = null;

    // Callback for part hover highlight
    onPartHover?: (instanceId: string | null) => void;

    constructor(assembly: RocketAssembly) {
        this.assembly = assembly;
        this.container = this.create();
    }

    getContainer(): HTMLDivElement {
        return this.container;
    }

    private create(): HTMLDivElement {
        // Root wrapper (fixed position)
        const root = document.createElement('div');
        root.id = 'hangar-staging-panel';
        root.style.position = 'absolute';
        root.style.top = '70px';
        root.style.right = '0';
        root.style.height = 'auto';
        root.style.maxHeight = '450px';
        root.style.pointerEvents = 'auto';
        root.style.display = 'flex';
        root.style.alignItems = 'flex-start';

        // Slider container (for animation)
        const slider = document.createElement('div');
        slider.style.display = 'flex';
        slider.style.alignItems = 'flex-start';
        slider.style.transition = 'transform 0.3s ease';

        // Toggle Button (same size as parts palette: 24x64)
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '▶';
        toggleBtn.style.width = '24px';
        toggleBtn.style.height = '64px';
        toggleBtn.style.marginTop = '20px';
        toggleBtn.style.backgroundColor = '#444';
        toggleBtn.style.border = '1px solid #555';
        toggleBtn.style.borderRight = 'none';
        toggleBtn.style.borderRadius = '6px 0 0 6px';
        toggleBtn.style.color = '#fff';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.display = 'flex';
        toggleBtn.style.alignItems = 'center';
        toggleBtn.style.justifyContent = 'center';
        toggleBtn.style.fontSize = '12px';
        toggleBtn.style.boxShadow = '-2px 0 5px rgba(0,0,0,0.3)';

        // Panel content
        const panel = document.createElement('div');
        panel.style.width = '220px';
        panel.style.maxHeight = '450px';
        panel.style.backgroundColor = 'rgba(20, 25, 35, 0.95)';
        panel.style.border = '1px solid #444';
        panel.style.borderRadius = '8px 0 0 8px';
        panel.style.padding = '10px';
        panel.style.color = '#fff';
        panel.style.overflowY = 'auto';
        panel.style.fontFamily = 'monospace';

        let isOpen = true;
        toggleBtn.onclick = () => {
            isOpen = !isOpen;
            if (isOpen) {
                slider.style.transform = 'translateX(0)';
                toggleBtn.textContent = '▶';
            } else {
                slider.style.transform = 'translateX(220px)';
                toggleBtn.textContent = '◀';
            }
        };

        // Title row
        const titleRow = document.createElement('div');
        titleRow.style.display = 'flex';
        titleRow.style.justifyContent = 'space-between';
        titleRow.style.alignItems = 'center';
        titleRow.style.marginBottom = '8px';
        titleRow.style.paddingBottom = '6px';
        titleRow.style.borderBottom = '1px solid #444';

        const title = document.createElement('h3');
        title.style.margin = '0';
        title.style.color = '#0088ff';
        title.style.fontSize = '14px';
        title.textContent = 'STAGING';
        titleRow.appendChild(title);

        // Buttons row
        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.gap = '4px';

        // Add stage button
        const addBtn = document.createElement('button');
        addBtn.textContent = '+ Stage';
        addBtn.title = 'Add empty stage';
        addBtn.style.padding = '2px 6px';
        addBtn.style.fontSize = '10px';
        addBtn.style.backgroundColor = '#0066aa';
        addBtn.style.color = '#fff';
        addBtn.style.border = 'none';
        addBtn.style.borderRadius = '3px';
        addBtn.style.cursor = 'pointer';
        addBtn.onclick = () => this.addEmptyStage();
        btnRow.appendChild(addBtn);

        // Reset button
        const resetBtn = document.createElement('button');
        resetBtn.textContent = '↻';
        resetBtn.title = 'Reset to auto-calculated stages';
        resetBtn.style.padding = '2px 6px';
        resetBtn.style.fontSize = '10px';
        resetBtn.style.backgroundColor = '#444';
        resetBtn.style.color = '#fff';
        resetBtn.style.border = 'none';
        resetBtn.style.borderRadius = '3px';
        resetBtn.style.cursor = 'pointer';
        resetBtn.onclick = () => {
            this.stages = this.calculateStagesFromParts();
            this.render();
        };
        btnRow.appendChild(resetBtn);

        titleRow.appendChild(btnRow);
        panel.appendChild(titleRow);

        // Stages container
        this.stagesContainer = document.createElement('div');
        this.stagesContainer.style.display = 'flex';
        this.stagesContainer.style.flexDirection = 'column';
        this.stagesContainer.style.gap = '2px';
        panel.appendChild(this.stagesContainer);

        slider.appendChild(toggleBtn);
        slider.appendChild(panel);
        root.appendChild(slider);

        return root;
    }

    /**
     * Update - recalculates stages from parts if not manually modified
     */
    update(): void {
        // If no custom stages, auto-calculate
        if (this.stages.length === 0) {
            this.stages = this.calculateStagesFromParts();
        } else {
            // Sync stages with current parts (remove missing, keep structure)
            this.syncStagesWithParts();
        }
        this.render();
    }

    /**
     * Sync stages with current parts - remove parts that no longer exist
     */
    private syncStagesWithParts(): void {
        const existingInstanceIds = new Set(this.assembly.parts.map(p => p.instanceId));

        for (const stage of this.stages) {
            stage.items = stage.items.filter(item => existingInstanceIds.has(item.instanceId));
        }

        // Add any new parts to the last stage (or create one)
        const allStagedInstanceIds = new Set(this.stages.flatMap(s => s.items.map(i => i.instanceId)));
        const unstagedParts = this.assembly.parts.filter(p => !allStagedInstanceIds.has(p.instanceId));

        if (unstagedParts.length > 0) {
            if (this.stages.length === 0) {
                this.stages.push({ index: 0, items: [] });
            }

            for (const part of unstagedParts) {
                const def = PartRegistry.get(part.partId);
                if (!def) continue;

                this.stages[0].items.push({
                    instanceId: part.instanceId,
                    partId: part.partId,
                    type: def.type,
                    name: def.name
                });
            }
        }

        // Remove empty stages (except keep at least one if there are parts)
        this.stages = this.stages.filter(s => s.items.length > 0);

        // Reindex stages
        this.stages.forEach((s, i) => s.index = i);
    }

    /**
     * Calculate stages from parts based on decouplers
     */
    private calculateStagesFromParts(): HangarStage[] {
        const stages: HangarStage[] = [];

        if (this.assembly.parts.length === 0) {
            return stages;
        }

        // Sort parts by Y position (bottom to top)
        const sortedParts = [...this.assembly.parts].sort((a, b) => a.position.y - b.position.y);

        let currentStage: HangarStageItem[] = [];
        let stageIndex = 0;

        for (const part of sortedParts) {
            const def = PartRegistry.get(part.partId);
            if (!def) continue;

            const item: HangarStageItem = {
                instanceId: part.instanceId,
                partId: part.partId,
                type: def.type,
                name: def.name
            };

            // If part is decoupler, it gets its OWN stage
            if (def.type === 'decoupler') {
                // Push current stage (parts below decoupler)
                if (currentStage.length > 0) {
                    stages.push({ index: stageIndex++, items: currentStage });
                    currentStage = [];
                }
                // Decoupler in its own stage
                stages.push({ index: stageIndex++, items: [item] });
            } else {
                currentStage.push(item);
            }
        }

        if (currentStage.length > 0) {
            stages.push({ index: stageIndex, items: currentStage });
        }

        return stages;
    }

    /**
     * Render the stages
     */
    private render(): void {
        if (!this.stagesContainer) return;
        this.stagesContainer.innerHTML = '';

        if (this.assembly.parts.length === 0) {
            const empty = document.createElement('div');
            empty.style.color = '#666';
            empty.style.fontSize = '11px';
            empty.style.textAlign = 'center';
            empty.style.padding = '20px';
            empty.textContent = i18next.t('hangar.noParts', 'No parts placed');
            this.stagesContainer.appendChild(empty);
            return;
        }

        if (this.stages.length === 0) {
            const noStages = document.createElement('div');
            noStages.style.color = '#888';
            noStages.style.fontSize = '11px';
            noStages.style.textAlign = 'center';
            noStages.style.padding = '15px';
            noStages.innerHTML = 'Click <b>+ Stage</b> to add stages<br>or add decouplers to auto-create';
            this.stagesContainer.appendChild(noStages);
            return;
        }

        // Display stages from 0 (top/payload) to N (bottom/first to fire)
        for (let i = 0; i < this.stages.length; i++) {
            // Add "+" button above first stage
            if (i === 0) {
                this.stagesContainer.appendChild(this.createAddStageButton(0));
            }

            const stage = this.stages[i];
            const stageEl = this.createStageElement(stage, i);
            this.stagesContainer.appendChild(stageEl);

            // Add "+" button below each stage
            this.stagesContainer.appendChild(this.createAddStageButton(i + 1));
        }
    }

    /**
     * Create add stage button
     */
    private createAddStageButton(insertIndex: number): HTMLDivElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'add-stage-btn-wrapper';
        wrapper.style.height = '0';
        wrapper.style.overflow = 'visible';
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'center';
        wrapper.style.transition = 'height 0.2s ease';

        const btn = document.createElement('button');
        btn.className = 'add-stage-btn';
        btn.textContent = '+';
        btn.title = `Insert stage at position ${insertIndex}`;
        btn.style.width = '24px';
        btn.style.height = '16px';
        btn.style.fontSize = '12px';
        btn.style.fontWeight = 'bold';
        btn.style.backgroundColor = '#0066aa';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.opacity = '0';
        btn.style.transition = 'opacity 0.2s ease';
        btn.style.position = 'relative';
        btn.style.top = '-8px';

        btn.onclick = () => this.insertStage(insertIndex);

        // Show on hover
        wrapper.addEventListener('mouseenter', () => {
            wrapper.style.height = '8px';
            btn.style.opacity = '1';
        });
        wrapper.addEventListener('mouseleave', () => {
            wrapper.style.height = '0';
            btn.style.opacity = '0';
        });

        wrapper.appendChild(btn);
        return wrapper;
    }

    /**
     * Create a stage element
     */
    private createStageElement(stage: HangarStage, displayIndex: number): HTMLDivElement {
        const stageDiv = document.createElement('div');
        stageDiv.className = 'hangar-stage';
        stageDiv.dataset.stageIndex = displayIndex.toString();
        stageDiv.draggable = true;

        // Styling
        const isFirstToFire = displayIndex === this.stages.length - 1;
        stageDiv.style.backgroundColor = isFirstToFire ? 'rgba(255, 100, 0, 0.15)' : 'rgba(40, 45, 60, 0.7)';
        stageDiv.style.border = isFirstToFire ? '2px solid #ff6600' : '2px solid #555';
        stageDiv.style.borderRadius = '6px';
        stageDiv.style.padding = '6px 8px';
        stageDiv.style.cursor = 'grab';
        stageDiv.style.transition = 'all 0.15s ease';
        stageDiv.style.position = 'relative';
        stageDiv.style.minHeight = '30px';

        // Header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '4px';

        // Left side: drag handle + title
        const leftSide = document.createElement('div');
        leftSide.style.display = 'flex';
        leftSide.style.alignItems = 'center';
        leftSide.style.gap = '4px';

        const dragHandle = document.createElement('span');
        dragHandle.textContent = '⠿';
        dragHandle.style.color = '#666';
        dragHandle.style.fontSize = '10px';
        dragHandle.style.cursor = 'grab';
        leftSide.appendChild(dragHandle);

        const titleSpan = document.createElement('span');
        titleSpan.style.fontWeight = 'bold';
        titleSpan.style.fontSize = '11px';
        titleSpan.style.color = isFirstToFire ? '#ff6600' : '#0088ff';
        titleSpan.textContent = `Stage ${displayIndex}`;
        leftSide.appendChild(titleSpan);

        header.appendChild(leftSide);

        // Right side: activation order + delete button
        const rightSide = document.createElement('div');
        rightSide.style.display = 'flex';
        rightSide.style.alignItems = 'center';
        rightSide.style.gap = '4px';

        const activationOrder = this.stages.length - 1 - displayIndex;
        const badge = document.createElement('span');
        badge.style.fontSize = '9px';
        badge.style.padding = '1px 4px';
        badge.style.borderRadius = '3px';
        badge.style.backgroundColor = isFirstToFire ? '#ff6600' : '#333';
        badge.style.color = '#fff';
        badge.textContent = `#${activationOrder + 1}`;
        badge.title = `Activation order: ${activationOrder + 1}${isFirstToFire ? ' (first)' : ''}`;
        rightSide.appendChild(badge);

        // Delete stage button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Delete stage (parts move to stage above)';
        deleteBtn.style.width = '16px';
        deleteBtn.style.height = '16px';
        deleteBtn.style.fontSize = '12px';
        deleteBtn.style.backgroundColor = 'transparent';
        deleteBtn.style.color = '#888';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '3px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.lineHeight = '1';
        deleteBtn.style.padding = '0';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.deleteStage(displayIndex);
        };
        deleteBtn.onmouseenter = () => deleteBtn.style.color = '#ff4444';
        deleteBtn.onmouseleave = () => deleteBtn.style.color = '#888';
        rightSide.appendChild(deleteBtn);

        header.appendChild(rightSide);
        stageDiv.appendChild(header);

        // Items container (drop zone for parts)
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'stage-items';
        itemsContainer.dataset.stageIndex = displayIndex.toString();
        itemsContainer.style.display = 'flex';
        itemsContainer.style.flexDirection = 'column';
        itemsContainer.style.gap = '2px';
        itemsContainer.style.minHeight = '20px';
        itemsContainer.style.padding = '4px';
        itemsContainer.style.borderRadius = '4px';
        itemsContainer.style.backgroundColor = 'rgba(0,0,0,0.2)';

        if (stage.items.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.style.color = '#555';
            placeholder.style.fontSize = '9px';
            placeholder.style.textAlign = 'center';
            placeholder.style.padding = '4px';
            placeholder.textContent = 'Drop parts here';
            itemsContainer.appendChild(placeholder);
        } else {
            for (let i = 0; i < stage.items.length; i++) {
                const item = stage.items[i];
                const itemEl = this.createItemElement(item, displayIndex, i);
                itemsContainer.appendChild(itemEl);
            }
        }

        // Part drop zone events
        itemsContainer.addEventListener('dragover', (e) => {
            if (this.draggedItem !== null) {
                e.preventDefault();
                itemsContainer.style.backgroundColor = 'rgba(0, 100, 200, 0.3)';
            }
        });

        itemsContainer.addEventListener('dragleave', () => {
            itemsContainer.style.backgroundColor = 'rgba(0,0,0,0.2)';
        });

        itemsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            itemsContainer.style.backgroundColor = 'rgba(0,0,0,0.2)';

            if (this.draggedItem !== null) {
                this.moveItem(this.draggedItem.stageIndex, this.draggedItem.itemIndex, displayIndex);
            }
        });

        stageDiv.appendChild(itemsContainer);

        // Stage drag events
        stageDiv.addEventListener('dragstart', (e) => {
            // Only drag stage if not dragging an item
            if (this.draggedItem === null) {
                this.draggedStageIndex = displayIndex;
                stageDiv.style.opacity = '0.5';
                e.dataTransfer?.setData('text/plain', `stage:${displayIndex}`);
            }
        });

        stageDiv.addEventListener('dragend', () => {
            stageDiv.style.opacity = '1';
            this.draggedStageIndex = null;
        });

        stageDiv.addEventListener('dragover', (e) => {
            if (this.draggedStageIndex !== null && this.draggedStageIndex !== displayIndex) {
                e.preventDefault();
                stageDiv.style.borderTopColor = '#0088ff';
                stageDiv.style.borderTopWidth = '3px';
            }
        });

        stageDiv.addEventListener('dragleave', () => {
            stageDiv.style.borderTopColor = isFirstToFire ? '#ff6600' : '#555';
            stageDiv.style.borderTopWidth = '2px';
        });

        stageDiv.addEventListener('drop', (e) => {
            e.preventDefault();
            stageDiv.style.borderTopColor = isFirstToFire ? '#ff6600' : '#555';
            stageDiv.style.borderTopWidth = '2px';

            if (this.draggedStageIndex !== null && this.draggedStageIndex !== displayIndex) {
                this.reorderStages(this.draggedStageIndex, displayIndex);
            }
        });

        return stageDiv;
    }

    /**
     * Create an item element with drag support
     */
    private createItemElement(item: HangarStageItem, stageIndex: number, itemIndex: number): HTMLDivElement {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'stage-item';
        itemDiv.draggable = true;
        itemDiv.style.display = 'flex';
        itemDiv.style.alignItems = 'center';
        itemDiv.style.gap = '4px';
        itemDiv.style.padding = '3px 4px';
        itemDiv.style.fontSize = '10px';
        itemDiv.style.borderRadius = '3px';
        itemDiv.style.backgroundColor = 'rgba(60, 65, 80, 0.5)';
        itemDiv.style.cursor = 'grab';
        itemDiv.style.transition = 'all 0.1s ease';

        // Icon
        const icon = document.createElement('span');
        icon.style.width = '14px';
        icon.style.textAlign = 'center';
        icon.textContent = this.getTypeIcon(item.type);
        itemDiv.appendChild(icon);

        // Name
        const name = document.createElement('span');
        name.style.flex = '1';
        name.style.overflow = 'hidden';
        name.style.textOverflow = 'ellipsis';
        name.style.whiteSpace = 'nowrap';
        name.style.color = '#ccc';

        const translatedName = i18next.exists(item.name) ? i18next.t(item.name) : item.partId;
        name.textContent = translatedName;
        name.title = translatedName;
        itemDiv.appendChild(name);

        // Item drag events
        itemDiv.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            this.draggedItem = { stageIndex, itemIndex };
            this.draggedStageIndex = null; // Ensure not dragging stage
            itemDiv.style.opacity = '0.5';
            e.dataTransfer?.setData('text/plain', `item:${stageIndex}:${itemIndex}`);
        });

        itemDiv.addEventListener('dragend', () => {
            itemDiv.style.opacity = '1';
            this.draggedItem = null;
        });

        // Hover effect + callback for highlighting part on rocket
        itemDiv.addEventListener('mouseenter', () => {
            itemDiv.style.backgroundColor = 'rgba(80, 85, 110, 0.7)';
            this.onPartHover?.(item.instanceId);
        });
        itemDiv.addEventListener('mouseleave', () => {
            itemDiv.style.backgroundColor = 'rgba(60, 65, 80, 0.5)';
            this.onPartHover?.(null);
        });

        return itemDiv;
    }

    private getTypeIcon(type: PartType): string {
        switch (type) {
            case 'engine':
            case 'booster': return '🔥';
            case 'tank': return '⛽';
            case 'decoupler': return '💥';
            case 'fairing': return '🛡️';
            case 'parachute': return '🪂';
            case 'capsule': return '🚀';
            case 'rcs': return '✨';
            default: return '📦';
        }
    }

    /**
     * Add an empty stage at the end
     */
    private addEmptyStage(): void {
        const newIndex = this.stages.length;
        this.stages.push({ index: newIndex, items: [] });
        this.render();
    }

    /**
     * Insert an empty stage at a specific position
     */
    private insertStage(insertIndex: number): void {
        this.stages.splice(insertIndex, 0, { index: insertIndex, items: [] });
        // Reindex
        this.stages.forEach((s, i) => s.index = i);
        this.render();
    }

    /**
     * Delete a stage (move its parts to stage above, or discard if first)
     */
    private deleteStage(stageIndex: number): void {
        if (this.stages.length <= 1) return;

        const stage = this.stages[stageIndex];

        // Move items to previous stage (or next if deleting first)
        if (stage.items.length > 0) {
            const targetIndex = stageIndex > 0 ? stageIndex - 1 : 1;
            if (this.stages[targetIndex]) {
                this.stages[targetIndex].items.push(...stage.items);
            }
        }

        this.stages.splice(stageIndex, 1);
        // Reindex
        this.stages.forEach((s, i) => s.index = i);
        this.render();
    }

    /**
     * Reorder stages
     */
    private reorderStages(fromIndex: number, toIndex: number): void {
        const [moved] = this.stages.splice(fromIndex, 1);
        this.stages.splice(toIndex, 0, moved);
        // Reindex
        this.stages.forEach((s, i) => s.index = i);
        this.render();
    }

    /**
     * Move an item from one stage to another
     */
    private moveItem(fromStageIndex: number, itemIndex: number, toStageIndex: number): void {
        if (fromStageIndex === toStageIndex) return;

        const [item] = this.stages[fromStageIndex].items.splice(itemIndex, 1);
        this.stages[toStageIndex].items.push(item);

        this.render();
    }

    /**
     * Get staging configuration for saving
     */
    getStageConfig(): HangarStage[] {
        return this.stages.map(s => ({
            index: s.index,
            items: s.items.map(i => ({ ...i }))
        }));
    }

    /**
     * Load staging configuration
     */
    setStageConfig(config: HangarStage[] | null): void {
        if (config && config.length > 0) {
            this.stages = config;
        } else {
            this.stages = this.calculateStagesFromParts();
        }
        this.render();
    }

    dispose(): void {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
