import { SpaceHistory } from '../../data/SpaceHistory';
import type { YearGroup } from './types';
import { getNodeColor } from './ChronologyUtils';

export interface TimelineRendererOptions {
    container: HTMLDivElement;
    currentYear: number;
    onYearSelect: (group: YearGroup, item: HTMLDivElement) => void;
}

/**
 * TimelineRenderer - Renders the horizontal timeline with year nodes
 */
export class TimelineRenderer {
    private container: HTMLDivElement;
    private currentYear: number;
    private onYearSelect: (group: YearGroup, item: HTMLDivElement) => void;
    private yearGroups: Map<number, YearGroup> = new Map();

    constructor(options: TimelineRendererOptions) {
        this.container = options.container;
        this.currentYear = options.currentYear;
        this.onYearSelect = options.onYearSelect;
    }

    /**
     * Group events by year and render timeline nodes
     */
    render(): void {
        const startYear = 1957;
        const pixelsPerYear = 200;

        // Group events by year
        this.yearGroups = new Map();
        SpaceHistory.forEach(event => {
            if (!this.yearGroups.has(event.year)) {
                this.yearGroups.set(event.year, {
                    year: event.year,
                    events: [],
                    status: 'mixed'
                });
            }
            this.yearGroups.get(event.year)!.events.push(event);
        });

        // Determine aggregated status for each year
        this.yearGroups.forEach(group => {
            const types = new Set(group.events.map(e => e.type));
            if (types.has('future')) group.status = 'future';
            else if (types.size > 1) group.status = 'mixed';
            else group.status = group.events[0].type;
        });

        const sortedYears = Array.from(this.yearGroups.values()).sort((a, b) => a.year - b.year);

        // Render each year node
        sortedYears.forEach(group => {
            const isFuture = group.year > this.currentYear;
            const isLocked = isFuture;
            const yearDiff = group.year - startYear;
            const positionLeft = yearDiff * pixelsPerYear + 100;

            const item = this.createYearNode(group, positionLeft, isLocked);
            this.container.appendChild(item);
        });
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
            width: '60px',
            height: '100px',
            justifyContent: 'center'
        });

        // Hover/click interactions
        if (!isLocked) {
            item.addEventListener('mouseenter', () => {
                if (!item.classList.contains('active')) {
                    const n = item.querySelector('.node-circle') as HTMLElement;
                    if (n) n.style.transform = 'scale(1.3)';
                }
            });
            item.addEventListener('mouseleave', () => {
                if (!item.classList.contains('active')) {
                    const n = item.querySelector('.node-circle') as HTMLElement;
                    if (n) n.style.transform = 'scale(1)';
                }
            });
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onYearSelect(group, item);
            });
        }

        // Year label
        const yearLabel = document.createElement('div');
        yearLabel.innerText = group.year.toString();
        Object.assign(yearLabel.style, {
            fontSize: '20px',
            fontWeight: 'bold',
            color: isLocked ? '#555' : '#fff',
            marginBottom: '15px',
            fontFamily: 'monospace',
            pointerEvents: 'none'
        });

        // Node circle
        const node = document.createElement('div');
        node.className = 'node-circle';
        const nodeColor = getNodeColor(group.status);
        Object.assign(node.style, {
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: isLocked ? '2px solid #555' : '3px solid #fff',
            backgroundColor: isLocked ? '#222' : nodeColor,
            boxShadow: isLocked ? 'none' : `0 0 15px ${nodeColor}40`,
            transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            pointerEvents: 'none'
        });

        // Event count badge
        if (group.events.length > 1 && !isLocked) {
            const badge = document.createElement('div');
            badge.textContent = group.events.length.toString();
            Object.assign(badge.style, {
                position: 'absolute',
                top: '55px',
                right: '10px',
                backgroundColor: '#fff',
                color: '#000',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '10px',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                pointerEvents: 'none'
            });
            item.appendChild(badge);
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
                n.style.boxShadow = 'none';
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
}
