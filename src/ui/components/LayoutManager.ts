/**
 * LayoutManager - Manages panel positions to prevent overlapping
 * 
 * Defines layout zones and automatically stacks panels within each zone.
 */

export type LayoutZone = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface PanelRegistration {
    id: string;
    element: HTMLElement;
    zone: LayoutZone;
    priority: number; // Lower = closer to corner
}

class LayoutManagerClass {
    private panels: Map<string, PanelRegistration> = new Map();

    constructor() {
        // Debounced layout update on window resize
        let resizeTimeout: number | null = null;
        window.addEventListener('resize', () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = window.setTimeout(() => this.updateLayout(), 100);
        });
    }

    /**
     * Register a panel with the layout manager
     */
    register(id: string, element: HTMLElement, zone: LayoutZone, priority: number = 0): void {
        this.panels.set(id, { id, element, zone, priority });
        this.updateLayout();
    }

    /**
     * Unregister a panel
     */
    unregister(id: string): void {
        this.panels.delete(id);
        this.updateLayout();
    }

    /**
     * Update all panel positions
     */
    updateLayout(): void {
        const zones: Record<LayoutZone, PanelRegistration[]> = {
            'top-left': [],
            'top-right': [],
            'bottom-left': [],
            'bottom-right': []
        };

        // Group panels by zone
        this.panels.forEach(panel => {
            zones[panel.zone].push(panel);
        });

        // Sort by priority and position each zone
        Object.entries(zones).forEach(([zone, panels]) => {
            panels.sort((a, b) => a.priority - b.priority);
            this.positionZone(zone as LayoutZone, panels);
        });
    }

    private positionZone(zone: LayoutZone, panels: PanelRegistration[]): void {
        const margin = 10;
        let offset = margin;

        panels.forEach(panel => {
            const el = panel.element;
            el.style.position = 'absolute';

            // Horizontal position
            if (zone.includes('left')) {
                el.style.left = `${margin}px`;
                el.style.right = 'auto';
            } else {
                el.style.right = `${margin}px`;
                el.style.left = 'auto';
            }

            // Vertical position - stack from corner
            if (zone.includes('top')) {
                el.style.top = `${offset}px`;
                el.style.bottom = 'auto';
            } else {
                el.style.bottom = `${offset}px`;
                el.style.top = 'auto';
            }

            // Update offset for next panel
            const rect = el.getBoundingClientRect();
            offset += rect.height + margin;
        });
    }

    /**
     * Check if we're on a small screen (mobile)
     */
    isMobileViewport(): boolean {
        return window.innerWidth < 768;
    }
}

// Singleton instance
export const LayoutManager = new LayoutManagerClass();
