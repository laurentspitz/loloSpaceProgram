import i18next from 'i18next';
import { GAME_START_YEAR } from '../../config';
import type { MissionManager } from '../../missions';
import type { YearGroup } from './types';
import { getNodeColor } from './ChronologyUtils';

export interface TimelineRendererOptions {
    container: HTMLDivElement;
    currentYear: number;
    missionManager: MissionManager;
    onYearSelect: (group: YearGroup, item: HTMLDivElement) => void;
}

/**
 * TimelineRenderer - Renders the horizontal graduated timeline with year nodes
 * Now uses unified mission system instead of SpaceHistory
 */
export class TimelineRenderer {
    private container: HTMLDivElement;
    private currentYear: number;
    private missionManager: MissionManager;
    private onYearSelect: (group: YearGroup, item: HTMLDivElement) => void;
    private yearGroups: Map<number, YearGroup> = new Map();
    private tooltip: HTMLDivElement | null = null;

    private static readonly START_YEAR = GAME_START_YEAR;
    private static readonly END_YEAR = 2100;
    private static readonly PIXELS_PER_YEAR = 80;
    private static readonly TIMELINE_PADDING = 100;

    constructor(options: TimelineRendererOptions) {
        this.container = options.container;
        this.currentYear = options.currentYear;
        this.missionManager = options.missionManager;
        this.onYearSelect = options.onYearSelect;
    }

    /**
     * Group missions by year and render timeline nodes
     */
    render(): void {
        // Group missions by year
        this.yearGroups = new Map();
        this.missionManager.missions.forEach(mission => {
            if (!this.yearGroups.has(mission.year)) {
                this.yearGroups.set(mission.year, {
                    year: mission.year,
                    missions: [],
                    status: 'mixed'
                });
            }
            this.yearGroups.get(mission.year)!.missions.push(mission);
        });

        // Determine aggregated status for each year
        this.yearGroups.forEach(group => {
            const isFuture = group.year > this.currentYear;
            const hasObjectives = group.missions.some(m => m.type === 'objective');
            const allCompleted = group.missions.every(m =>
                m.type === 'event' || this.missionManager.completedMissionIds.has(m.id)
            );

            if (isFuture) group.status = 'future';
            else if (hasObjectives && allCompleted) group.status = 'success';
            else if (hasObjectives) group.status = 'discovery';  // In progress
            else group.status = 'success';  // Events only = automatically completed
        });

        // Render graduated timeline axis
        this.renderGraduatedAxis();

        // Render year nodes on top of the axis
        const sortedYears = Array.from(this.yearGroups.values()).sort((a, b) => a.year - b.year);
        sortedYears.forEach(group => {
            const isFuture = group.year > this.currentYear;
            const isLocked = isFuture;
            const positionLeft = this.yearToPosition(group.year);

            const item = this.createYearNode(group, positionLeft, isLocked);
            this.container.appendChild(item);
        });

        // Create tooltip element
        this.createTooltip();
    }

    private yearToPosition(year: number): number {
        return (year - TimelineRenderer.START_YEAR) * TimelineRenderer.PIXELS_PER_YEAR + TimelineRenderer.TIMELINE_PADDING;
    }

    private renderGraduatedAxis(): void {
        // Main axis container
        const axisContainer = document.createElement('div');
        Object.assign(axisContainer.style, {
            position: 'absolute',
            top: '50%',
            left: '0',
            height: '40px',
            transform: 'translateY(-50%)',
            width: `${this.yearToPosition(TimelineRenderer.END_YEAR) + TimelineRenderer.TIMELINE_PADDING}px`,
            zIndex: '1'
        });

        // Main axis line with gradient
        const axisLine = document.createElement('div');
        Object.assign(axisLine.style, {
            position: 'absolute',
            top: '50%',
            left: '0',
            height: '3px',
            transform: 'translateY(-50%)',
            width: '100%',
            background: 'linear-gradient(to right, rgba(100, 200, 255, 0.1), rgba(100, 200, 255, 0.4) 10%, rgba(100, 200, 255, 0.4) 90%, rgba(100, 200, 255, 0.1))',
            borderRadius: '2px'
        });
        axisContainer.appendChild(axisLine);

        // Add tick marks
        for (let year = TimelineRenderer.START_YEAR; year <= TimelineRenderer.END_YEAR; year++) {
            const isMajorTick = year % 10 === 0;
            const isMinorTick = year % 5 === 0;

            if (!isMajorTick && !isMinorTick) continue;

            const tickPosition = this.yearToPosition(year);
            const isPast = year <= this.currentYear;

            // Tick mark
            const tick = document.createElement('div');
            Object.assign(tick.style, {
                position: 'absolute',
                left: `${tickPosition}px`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: isMajorTick ? '2px' : '1px',
                height: isMajorTick ? '16px' : '8px',
                backgroundColor: isPast
                    ? (isMajorTick ? 'rgba(100, 200, 255, 0.8)' : 'rgba(100, 200, 255, 0.4)')
                    : (isMajorTick ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)')
            });
            axisContainer.appendChild(tick);

            // Year label for major ticks (only show if no event node exists at this year)
            if (isMajorTick && !this.yearGroups.has(year)) {
                const yearLabel = document.createElement('div');
                yearLabel.textContent = year.toString();
                Object.assign(yearLabel.style, {
                    position: 'absolute',
                    left: `${tickPosition}px`,
                    bottom: '-8px',
                    transform: 'translateX(-50%)',
                    fontSize: '10px',
                    color: isPast ? 'rgba(100, 200, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)',
                    fontFamily: 'monospace',
                    pointerEvents: 'none'
                });
                axisContainer.appendChild(yearLabel);
            }
        }

        this.container.appendChild(axisContainer);
    }

    private createTooltip(): void {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'timeline-tooltip';
        Object.assign(this.tooltip.style, {
            position: 'fixed',
            padding: '10px 14px',
            background: 'rgba(10, 20, 40, 0.95)',
            border: '1px solid rgba(100, 200, 255, 0.4)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '12px',
            pointerEvents: 'none',
            opacity: '0',
            transition: 'opacity 0.2s ease',
            zIndex: '5000', // Must be above ChronologyMenu overlay (z-index 4000)
            maxWidth: '280px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)'
        });
        document.body.appendChild(this.tooltip);
    }

    private showTooltip(group: YearGroup, x: number, y: number): void {
        if (!this.tooltip) return;

        // Build tooltip content
        const missionCount = group.missions.length;
        const objectiveCount = group.missions.filter(m => m.type === 'objective').length;
        const completedCount = this.getCompletedMissionCount(group);

        let html = `<div style="font-weight: bold; font-size: 14px; color: ${getNodeColor(group.status)}; margin-bottom: 6px;">${group.year}</div>`;
        html += `<div style="color: #aaa; margin-bottom: 8px;">${missionCount} ${i18next.t('chronology.events', { count: missionCount })}</div>`;

        // List ALL missions for this year
        html += `<div style="display: flex; flex-direction: column; gap: 4px;">`;
        group.missions.forEach(mission => {
            const icon = mission.type === 'objective'
                ? (this.missionManager.completedMissionIds.has(mission.id) ? '✓' : '🎯')
                : '📜';
            html += `<div style="color: #eee; font-size: 11px;">• ${icon} ${i18next.t(mission.title)}</div>`;
        });
        html += `</div>`;

        if (objectiveCount > 0) {
            html += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); color: ${completedCount === objectiveCount ? '#00C851' : '#ffbb33'};">`;
            html += `🎯 ${completedCount}/${objectiveCount} ${i18next.t('chronology.missionsCompleted')}`;
            html += `</div>`;
        }

        this.tooltip.innerHTML = html;
        this.tooltip.style.left = `${x + 15}px`;
        this.tooltip.style.top = `${y - 10}px`;
        this.tooltip.style.opacity = '1';
    }

    private hideTooltip(): void {
        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
        }
    }

    /**
     * Get missions for a year by matching yearRequired
     */
    private getMissionsForYear(year: number) {
        return this.missionManager.missions.filter(m => m.year === year);
    }

    private getMissionCount(group: YearGroup): number {
        return this.getMissionsForYear(group.year).length;
    }

    private getCompletedMissionCount(group: YearGroup): number {
        const missions = this.getMissionsForYear(group.year);
        return missions.filter(m => this.missionManager.completedMissionIds.has(m.id)).length;
    }

    private createYearNode(group: YearGroup, positionLeft: number, isLocked: boolean): HTMLDivElement {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        Object.assign(item.style, {
            position: 'absolute',
            left: `${positionLeft}px`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: '10',
            cursor: isLocked ? 'default' : 'pointer',
            width: '50px',
            height: '90px',
            justifyContent: 'center'
        });

        // Year label (above the node)
        const yearLabel = document.createElement('div');
        yearLabel.innerText = group.year.toString();
        Object.assign(yearLabel.style, {
            fontSize: '12px',
            fontWeight: 'bold',
            color: isLocked ? '#555' : '#fff',
            marginBottom: '8px',
            fontFamily: 'monospace',
            pointerEvents: 'none'
        });

        // Node circle with count/checkmark inside
        const nodeColor = getNodeColor(group.status);
        const missionCount = this.getMissionCount(group);
        const completedCount = this.getCompletedMissionCount(group);
        const allCompleted = missionCount > 0 && completedCount === missionCount;

        const node = document.createElement('div');
        node.className = 'node-circle';
        Object.assign(node.style, {
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: isLocked ? '2px solid #555' : '2px solid rgba(255, 255, 255, 0.8)',
            backgroundColor: isLocked ? '#222' : nodeColor,
            boxShadow: isLocked ? 'none' : `0 0 15px ${nodeColor}50, inset 0 0 10px rgba(255, 255, 255, 0.2)`,
            transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease',
            pointerEvents: 'none',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
        });

        // Content inside the circle: show mission progress (Option B)
        if (!isLocked) {
            if (allCompleted && missionCount > 0) {
                // Green checkmark for all missions completed
                node.innerHTML = '✓';
                node.style.color = '#00ff00';
                node.style.textShadow = '0 0 5px #00ff00';
            } else if (missionCount > 0) {
                // Show mission progress (completed/total)
                node.textContent = `${completedCount}/${missionCount}`;
                node.style.fontSize = '10px';
            }
            // If no missions, just show empty colored dot
        }

        // Hover/click interactions
        if (!isLocked) {
            item.addEventListener('mouseenter', (e) => {
                if (!item.classList.contains('active')) {
                    const n = item.querySelector('.node-circle') as HTMLElement;
                    if (n) {
                        n.style.transform = 'scale(1.3)';
                        n.style.boxShadow = `0 0 25px ${nodeColor}80, inset 0 0 10px rgba(255, 255, 255, 0.3)`;
                    }
                }
                this.showTooltip(group, e.clientX, e.clientY);
            });

            item.addEventListener('mousemove', (e) => {
                if (this.tooltip) {
                    this.tooltip.style.left = `${e.clientX + 15}px`;
                    this.tooltip.style.top = `${e.clientY - 10}px`;
                }
            });

            item.addEventListener('mouseleave', () => {
                if (!item.classList.contains('active')) {
                    const n = item.querySelector('.node-circle') as HTMLElement;
                    if (n) {
                        n.style.transform = 'scale(1)';
                        n.style.boxShadow = `0 0 15px ${nodeColor}50, inset 0 0 10px rgba(255, 255, 255, 0.2)`;
                    }
                }
                this.hideTooltip();
            });

            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onYearSelect(group, item);
            });
        }

        item.appendChild(yearLabel);
        item.appendChild(node);

        return item;
    }

    /**
     * Reset all nodes to inactive state
     */
    resetAllNodes(): void {
        this.container.querySelectorAll('.timeline-item').forEach((el: Element) => {
            const div = el as HTMLDivElement;
            div.classList.remove('active');
            const n = div.querySelector('.node-circle') as HTMLElement;
            if (n) {
                n.style.transform = 'scale(1)';
            }
        });
    }

    /**
     * Scroll timeline to center on a specific item
     */
    scrollToItem(item: HTMLDivElement): void {
        const itemLeft = parseInt(item.style.left || '0');
        const containerWidth = this.container.clientWidth;
        const scrollTarget = itemLeft - (containerWidth / 2);

        this.container.scrollTo({
            left: scrollTarget,
            behavior: 'smooth'
        });
    }

    /**
     * Cleanup tooltip on destroy
     */
    destroy(): void {
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
    }
}
