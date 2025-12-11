import i18next from 'i18next';
import type { MissionManager, Mission } from '../../missions';
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
 * EventDetailPanel - Renders unified mission/event cards when a year is selected
 * Each mission IS an event - they are displayed as one unified card
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
     * Show details for a selected year
     * Now uses unified mission system - each mission is an event
     */
    showYear(group: YearGroup): void {
        const color = getNodeColor(group.status);

        // Update header
        this.detailTitle.textContent = `${group.year}`;
        this.detailTitle.style.color = color;

        // Clear previous content
        this.detailDesc.innerHTML = '';

        // Use missions directly from the group (already sorted by TimelineRenderer)
        const yearMissions = [...group.missions].sort((a, b) => (a.month || 0) - (b.month || 0));

        // Render each mission as a unified card
        yearMissions.forEach(mission => {
            const card = this.createUnifiedMissionCard(mission);
            this.detailDesc.appendChild(card);
        });

        // If no missions, show placeholder
        if (yearMissions.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.style.cssText = 'color: #888; text-align: center; padding: 40px;';
            placeholder.textContent = i18next.t('chronology.noEvents', 'No events for this year');
            this.detailDesc.appendChild(placeholder);
        }

        // Show the container
        this.detailContainer.style.opacity = '1';

        // Remove placeholder
        const placeholder = this.descriptionPanel.querySelector('.placeholder-text');
        if (placeholder) placeholder.remove();
    }

    /**
     * Create a unified card that shows both event info AND mission objective
     */
    private createUnifiedMissionCard(mission: Mission): HTMLDivElement {
        const card = document.createElement('div');
        const isCompleted = this.missionManager.completedMissionIds.has(mission.id);
        const isObjective = mission.type === 'objective';

        // Color scheme based on type and completion
        const borderColor = isObjective
            ? (isCompleted ? '#00C851' : '#ffbb33')  // Yellow/Green for objectives
            : '#4CAF50';  // Green for events

        Object.assign(card.style, {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '20px',
            borderRadius: '8px',
            borderLeft: `4px solid ${borderColor}`,
            marginBottom: '15px'
        });

        // === HEADER: Title + Flag + Status ===
        let html = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <h3 style="margin: 0; font-size: 20px; color: #fff;">${i18next.t(mission.title)}</h3>
                ${mission.country ? `<span style="font-size: 20px;" title="${mission.country}">${getFlag(mission.country)}</span>` : ''}
            </div>`;

        // Status badge
        if (isObjective) {
            if (isCompleted) {
                html += `<span style="color: #00C851; font-size: 11px; border: 1px solid #00C851; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; font-weight: bold;">✓ ${i18next.t('mission.completed', 'Completed')}</span>`;
            } else {
                html += `<span style="color: #ffbb33; font-size: 11px; border: 1px solid #ffbb33; padding: 3px 10px; border-radius: 12px; text-transform: uppercase;">🎯 ${i18next.t('mission.objective', 'Objective')}</span>`;
            }
        } else {
            html += `<span style="color: #4CAF50; font-size: 11px; border: 1px solid #4CAF50; padding: 3px 10px; border-radius: 12px; text-transform: uppercase;">📜 ${i18next.t('chronology.event', 'Event')}</span>`;
        }
        html += `</div>`;

        // === DESCRIPTION ===
        html += `<p style="color: #ccc; margin: 0 0 15px 0; line-height: 1.6; font-size: 14px;">${i18next.t(mission.description)}</p>`;

        // === FLAVOR TEXT ===
        if (mission.flavorText) {
            html += `<div style="background: rgba(0, 170, 255, 0.1); padding: 10px 14px; border-radius: 6px; border-left: 3px solid #00aaff; margin-bottom: 15px;">
                <i style="color: #00aaff; font-size: 13px;">"${i18next.t(mission.flavorText)}"</i>
            </div>`;
        }

        // === OBJECTIVE SECTION (only for objectives) ===
        if (isObjective && mission.conditionLabel) {
            const conditionBg = isCompleted ? 'rgba(0, 200, 81, 0.1)' : 'rgba(255, 187, 51, 0.1)';
            const conditionBorder = isCompleted ? '#00C851' : '#ffbb33';

            html += `<div style="background: ${conditionBg}; border: 1px solid ${conditionBorder}40; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                <div style="color: ${conditionBorder}; font-size: 12px; margin-bottom: 8px; font-weight: bold; text-transform: uppercase;">
                    🎯 ${i18next.t('mission.condition', 'Success Condition')}
                </div>
                <div style="color: #fff; font-size: 13px; font-family: 'Courier New', monospace; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 4px;">
                    ${i18next.t(mission.conditionLabel)}
                </div>
            </div>`;
        }

        // === REWARDS: Parts + Money ===
        if ((mission.unlockedParts && mission.unlockedParts.length > 0) || mission.rewardMoney) {
            html += `<div style="background: rgba(0, 0, 0, 0.2); padding: 12px; border-radius: 6px;">
                <div style="color: #FFD700; font-size: 12px; margin-bottom: 8px; font-weight: bold;">🏆 ${i18next.t('mission.reward', 'Rewards')}</div>`;

            // Money reward
            if (mission.rewardMoney) {
                html += `<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                    <span style="color: #FFD700; font-size: 16px;">💰</span>
                    <span style="color: #FFD700; font-size: 14px; font-weight: bold;">+${mission.rewardMoney.toLocaleString()} $</span>
                </div>`;
            }

            // Unlocked parts
            if (mission.unlockedParts && mission.unlockedParts.length > 0) {
                html += `<div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${mission.unlockedParts.map(p =>
                    `<span style="background: #2E7D32; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">🔓 ${p}</span>`
                ).join('')}
                </div>`;
            }

            html += `</div>`;
        }

        card.innerHTML = html;
        return card;
    }
}
