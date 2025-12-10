import i18next from 'i18next';
import type { HistoryEvent } from '../../data/SpaceHistory';
import type { MissionManager } from '../../systems/MissionSystem';
import type { YearGroup } from './types';
import { getNodeColor, getFlag } from './ChronologyUtils';

export interface EventDetailPanelOptions {
    detailContainer: HTMLDivElement;
    detailTitle: HTMLHeadingElement;
    detailDesc: HTMLDivElement;
    descriptionPanel: HTMLDivElement;
    missionManager: MissionManager;
}

/**
 * EventDetailPanel - Renders event detail cards when a year is selected
 */
export class EventDetailPanel {
    private detailContainer: HTMLDivElement;
    private detailTitle: HTMLHeadingElement;
    private detailDesc: HTMLDivElement;
    private descriptionPanel: HTMLDivElement;
    private missionManager: MissionManager;

    constructor(options: EventDetailPanelOptions) {
        this.detailContainer = options.detailContainer;
        this.detailTitle = options.detailTitle;
        this.detailDesc = options.detailDesc;
        this.descriptionPanel = options.descriptionPanel;
        this.missionManager = options.missionManager;
    }

    /**
     * Show event details for a selected year
     */
    showYear(group: YearGroup): void {
        const color = getNodeColor(group.status);

        // Update header
        this.detailTitle.textContent = `${group.year}`;
        this.detailTitle.style.color = color;

        // Clear previous content
        this.detailDesc.innerHTML = '';

        // Render each event as a card
        group.events.forEach(event => {
            const eventCard = this.createEventCard(event);
            this.detailDesc.appendChild(eventCard);
        });

        // Show the container
        this.detailContainer.style.opacity = '1';

        // Remove placeholder
        const placeholder = this.descriptionPanel.querySelector('.placeholder-text');
        if (placeholder) placeholder.remove();
    }

    private createEventCard(event: HistoryEvent): HTMLDivElement {
        const eventCard = document.createElement('div');
        Object.assign(eventCard.style, {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '20px',
            borderRadius: '8px',
            borderLeft: `4px solid ${getNodeColor(event.type)}`
        });

        // Header with title and flag
        let headerHtml = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="margin: 0; font-size: 22px; color: #fff;">${i18next.t(event.title)}</h3>`;

        if (event.country) {
            const flag = getFlag(event.country);
            headerHtml += `<span style="font-size: 24px; title="${event.country}">${flag}</span>`;
        }
        headerHtml += `</div>`;

        // Description
        let contentHtml = `<p style="color: #ccc; margin: 0 0 15px 0; line-height: 1.5;">${i18next.t(event.description)}</p>`;

        // Flavor text
        if (event.flavorText) {
            contentHtml += `<div style="background: rgba(0, 170, 255, 0.1); padding: 8px 12px; border-radius: 4px; border-left: 2px solid #00aaff; margin-bottom: 15px;">
                <i style="color: #00aaff; font-size: 14px;">"${i18next.t(event.flavorText)}"</i>
            </div>`;
        }

        // Unlocked parts
        if (event.unlockedParts && event.unlockedParts.length > 0) {
            contentHtml += `<div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
                ${event.unlockedParts.map(p =>
                `<span style="background: #2E7D32; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">🔓 ${p}</span>`
            ).join('')}
            </div>`;
        }

        // Related missions
        if (event.relatedMissionIds && event.relatedMissionIds.length > 0) {
            contentHtml += this.renderRelatedMissions(event.relatedMissionIds);
        }

        eventCard.innerHTML = headerHtml + contentHtml;
        return eventCard;
    }

    private renderRelatedMissions(missionIds: string[]): string {
        let html = `<div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
            <div style="font-size: 12px; text-transform: uppercase; color: #aaa; margin-bottom: 8px;">${i18next.t('chronology.relatedMissions')}</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">`;

        missionIds.forEach(missionId => {
            const mission = this.missionManager.missions.find(m => m.id === missionId);
            if (mission) {
                const isCompleted = this.missionManager.completedMissionIds.has(missionId);
                const statusColor = isCompleted ? '#00C851' : '#ffbb33';
                const icon = isCompleted ? '✓' : '○';

                html += `<div style="display: flex; align-items: center; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
                    <span style="color: ${statusColor}; font-weight: bold; margin-right: 10px;">${icon}</span>
                    <span style="color: #eee;">${mission.title}</span>
                    ${isCompleted ? `<span style="margin-left: auto; color: ${statusColor}; font-size: 12px; border: 1px solid ${statusColor}; padding: 2px 6px; border-radius: 10px;">COMPLETED</span>` : ''}
                </div>`;
            }
        });

        html += `</div></div>`;
        return html;
    }
}
