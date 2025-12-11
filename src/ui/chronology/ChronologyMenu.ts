import i18next from 'i18next';
import type { MissionManager } from '../../missions';
import type { YearGroup } from './types';
import { TimelineRenderer } from './TimelineRenderer';
import { EventDetailPanel } from './EventDetailPanel';
import { getNodeColor } from './ChronologyUtils';

/**
 * ChronologyMenu - Main controller for the space history timeline view
 */
export class ChronologyMenu {
    private container!: HTMLDivElement;
    private timelineContainer!: HTMLDivElement;
    private descriptionPanel!: HTMLDivElement;
    private detailContainer!: HTMLDivElement;
    private detailTitle!: HTMLHeadingElement;
    private detailDesc!: HTMLDivElement;

    private timelineRenderer!: TimelineRenderer;
    private eventDetailPanel!: EventDetailPanel;

    private onClose: () => void;
    private currentYear: number;
    private missionManager: MissionManager;

    constructor(currentYear: number, missionManager: MissionManager, onClose: () => void) {
        this.currentYear = currentYear;
        this.missionManager = missionManager;
        this.onClose = onClose;
        this.createUI();
    }

    private createUI(): void {
        // Main overlay container
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(10, 10, 20, 0.95)',
            zIndex: '4000',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Segoe UI', sans-serif",
            color: '#eee',
            backdropFilter: 'blur(5px)'
        });

        this.createHeader();
        this.createContent();

        document.body.appendChild(this.container);
    }

    private createHeader(): void {
        const header = document.createElement('div');
        Object.assign(header.style, {
            padding: '20px 40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'linear-gradient(to right, rgba(0,0,0,0.5), transparent)',
            flexShrink: '0'
        });

        const title = document.createElement('h2');
        title.innerHTML = `${i18next.t('chronology.title')} <span style="font-weight:lighter; font-size: 0.7em; color: #aaa;">${this.currentYear}</span>`;
        Object.assign(title.style, {
            margin: '0',
            letterSpacing: '2px',
            fontSize: '24px'
        });
        header.appendChild(title);

        // Close button - consistent with HubScreen
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = i18next.t('menu.back');
        closeBtn.className = 'game-btn';
        Object.assign(closeBtn.style, {
            padding: '10px 20px',
            fontSize: '14px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            cursor: 'pointer',
            borderRadius: '5px',
            backdropFilter: 'blur(5px)'
        });
        closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        closeBtn.onmouseleave = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        closeBtn.onclick = () => {
            this.close();
            this.onClose();
        };

        header.appendChild(closeBtn);
        this.container.appendChild(header);
    }

    private createContent(): void {
        const content = document.createElement('div');
        Object.assign(content.style, {
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
        });

        // Timeline area (top half)
        this.timelineContainer = document.createElement('div');
        Object.assign(this.timelineContainer.style, {
            height: '50%',
            display: 'flex',
            alignItems: 'center',
            padding: '0 50px',
            overflowX: 'auto',
            overflowY: 'hidden',
            whiteSpace: 'nowrap',
            position: 'relative'
        });

        // Axis line is now rendered by TimelineRenderer

        // Custom scrollbar styles
        const style = document.createElement('style');
        style.innerHTML = `
            ::-webkit-scrollbar { height: 10px; background: #111; }
            ::-webkit-scrollbar-thumb { background: #444; border-radius: 5px; }
            ::-webkit-scrollbar-thumb:hover { background: #666; }
        `;
        this.container.appendChild(style);

        // Initialize timeline renderer with missionManager for mission completion tracking
        this.timelineRenderer = new TimelineRenderer({
            container: this.timelineContainer,
            currentYear: this.currentYear,
            missionManager: this.missionManager,
            onYearSelect: (group, item) => this.handleYearSelect(group, item)
        });
        this.timelineRenderer.render();

        // Details area (bottom half)
        this.descriptionPanel = document.createElement('div');
        Object.assign(this.descriptionPanel.style, {
            height: '50%',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0,0,0,0.3)',
            padding: '40px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            overflowY: 'auto'
        });

        // Detail container
        this.detailContainer = document.createElement('div');
        Object.assign(this.detailContainer.style, {
            maxWidth: '900px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '30px',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });

        this.detailTitle = document.createElement('h2');
        Object.assign(this.detailTitle.style, {
            fontSize: '36px',
            margin: '0',
            borderBottom: '1px solid #444',
            paddingBottom: '10px',
            textAlign: 'center'
        });

        this.detailDesc = document.createElement('div');
        Object.assign(this.detailDesc.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
        });

        this.detailContainer.appendChild(this.detailTitle);
        this.detailContainer.appendChild(this.detailDesc);

        // Placeholder text
        const placeholder = document.createElement('div');
        placeholder.textContent = i18next.t('chronology.selectEvent');
        placeholder.className = 'placeholder-text';
        Object.assign(placeholder.style, {
            color: '#666',
            fontSize: '18px',
            marginTop: '50px'
        });

        this.descriptionPanel.appendChild(placeholder);
        this.descriptionPanel.appendChild(this.detailContainer);

        // Initialize event detail panel
        this.eventDetailPanel = new EventDetailPanel({
            detailContainer: this.detailContainer,
            detailTitle: this.detailTitle,
            detailDesc: this.detailDesc,
            descriptionPanel: this.descriptionPanel,
            missionManager: this.missionManager
        });

        content.appendChild(this.timelineContainer);
        content.appendChild(this.descriptionPanel);
        this.container.appendChild(content);
    }

    private handleYearSelect(group: YearGroup, item: HTMLDivElement): void {
        // Reset all nodes
        this.timelineRenderer.resetAllNodes();

        // Activate selected node
        item.classList.add('active');
        const activeNode = item.querySelector('.node-circle') as HTMLElement;
        if (activeNode) {
            const color = getNodeColor(group.status);
            activeNode.style.transform = 'scale(1.5)';
            activeNode.style.boxShadow = `0 0 25px ${color}`;
        }

        // Show event details
        this.eventDetailPanel.showYear(group);

        // Scroll to selected item
        this.timelineRenderer.scrollToItem(item);
    }

    close(): void {
        // Clean up timeline renderer (removes tooltip)
        if (this.timelineRenderer) {
            this.timelineRenderer.destroy();
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
