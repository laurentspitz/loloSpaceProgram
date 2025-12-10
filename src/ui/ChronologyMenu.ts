import { SpaceHistory, type HistoryEvent } from '../data/SpaceHistory';
import i18next from 'i18next';
import { MissionManager } from '../systems/MissionSystem';

interface YearGroup {
    year: number;
    events: HistoryEvent[];
    status: 'success' | 'failure' | 'discovery' | 'future' | 'mixed';
}

export class ChronologyMenu {
    container!: HTMLDivElement;
    timelineContainer!: HTMLDivElement;
    descriptionPanel!: HTMLDivElement;

    // Detailed View Elements
    detailContainer!: HTMLDivElement;
    detailTitle!: HTMLHeadingElement;
    detailDesc!: HTMLDivElement;

    onClose: () => void;

    // Current game state
    currentYear: number;
    missionManager: MissionManager;

    constructor(currentYear: number, missionManager: MissionManager, onClose: () => void) {
        this.currentYear = currentYear;
        this.missionManager = missionManager;
        this.onClose = onClose;
        this.createUI();
    }

    createUI() {
        // Main Overlay
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.backgroundColor = 'rgba(10, 10, 20, 0.95)';
        this.container.style.zIndex = '4000';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.fontFamily = "'Segoe UI', sans-serif";
        this.container.style.color = '#eee';
        this.container.style.backdropFilter = 'blur(5px)';

        // Header
        const header = document.createElement('div');
        header.style.padding = '20px 40px';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
        header.style.background = 'linear-gradient(to right, rgba(0,0,0,0.5), transparent)';
        header.style.flexShrink = '0'; // Prevent shrinking

        const title = document.createElement('h1');
        title.innerHTML = `${i18next.t('chronology.title')} <span style="font-weight:lighter; font-size: 0.6em; color: #aaa;">${this.currentYear}</span>`;
        title.style.margin = '0';
        title.style.letterSpacing = '2px';

        // Close Button (Harmonized)
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = i18next.t('menu.back'); // Use standardized Back text
        closeBtn.className = 'game-btn'; // Use standardized class if available, or style similar
        Object.assign(closeBtn.style, {
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '10px 20px',
            fontSize: '18px',
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
        this.container.appendChild(closeBtn);

        header.appendChild(title);
        this.container.appendChild(header);

        // Content Area
        const content = document.createElement('div');
        content.style.flex = '1';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.overflow = 'hidden';
        content.style.position = 'relative';

        // 1. Horizontal Scrollable Timeline
        this.timelineContainer = document.createElement('div');
        this.timelineContainer.style.height = '50%';
        this.timelineContainer.style.display = 'flex';
        this.timelineContainer.style.alignItems = 'center';
        this.timelineContainer.style.padding = '0 50px';
        this.timelineContainer.style.overflowX = 'auto';
        this.timelineContainer.style.overflowY = 'hidden';
        this.timelineContainer.style.whiteSpace = 'nowrap';
        this.timelineContainer.style.position = 'relative';

        // Timeline Axis Line
        const axisLine = document.createElement('div');
        axisLine.style.position = 'absolute';
        axisLine.style.top = '50%';
        axisLine.style.left = '0';
        axisLine.style.height = '2px';
        axisLine.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        axisLine.style.width = '10000px';
        axisLine.style.zIndex = '0'; // Behind items
        this.timelineContainer.appendChild(axisLine);

        // Custom scrollbar
        const style = document.createElement('style');
        style.innerHTML = `
            ::-webkit-scrollbar {
                height: 10px;
                background: #111;
            }
            ::-webkit-scrollbar-thumb {
                background: #444;
                border-radius: 5px;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: #666;
            }
        `;
        this.container.appendChild(style);

        this.renderTimelineItems();

        // 2. Details / Context Panel (Bottom)
        this.descriptionPanel = document.createElement('div');
        this.descriptionPanel.style.height = '50%';
        this.descriptionPanel.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
        this.descriptionPanel.style.background = 'rgba(0,0,0,0.3)';
        this.descriptionPanel.style.padding = '40px';
        this.descriptionPanel.style.display = 'flex';
        this.descriptionPanel.style.justifyContent = 'center';
        this.descriptionPanel.style.alignItems = 'flex-start'; // Align top
        this.descriptionPanel.style.overflowY = 'auto'; // Scrollable details

        // Initialize Detail Container
        this.detailContainer = document.createElement('div');
        this.detailContainer.style.maxWidth = '900px';
        this.detailContainer.style.width = '100%';
        this.detailContainer.style.display = 'flex';
        this.detailContainer.style.flexDirection = 'column';
        this.detailContainer.style.gap = '30px';
        this.detailContainer.style.opacity = '0';
        this.detailContainer.style.transition = 'opacity 0.3s ease';

        this.detailTitle = document.createElement('h2'); // For Year Title
        this.detailTitle.style.fontSize = '36px';
        this.detailTitle.style.margin = '0';
        this.detailTitle.style.borderBottom = '1px solid #444';
        this.detailTitle.style.paddingBottom = '10px';
        this.detailTitle.style.textAlign = 'center';

        this.detailDesc = document.createElement('div'); // Container for event cards
        this.detailDesc.style.display = 'flex';
        this.detailDesc.style.flexDirection = 'column';
        this.detailDesc.style.gap = '20px';

        this.detailContainer.appendChild(this.detailTitle);
        this.detailContainer.appendChild(this.detailDesc);

        // Placeholder text
        const placeholder = document.createElement('div');
        placeholder.textContent = i18next.t('chronology.selectEvent');
        placeholder.style.color = '#666';
        placeholder.style.fontSize = '18px';
        placeholder.className = 'placeholder-text';
        placeholder.style.marginTop = '50px';

        this.descriptionPanel.appendChild(placeholder);
        this.descriptionPanel.appendChild(this.detailContainer);

        content.appendChild(this.timelineContainer);
        content.appendChild(this.descriptionPanel);
        this.container.appendChild(content);

        document.body.appendChild(this.container);
    }

    renderTimelineItems() {
        const startYear = 1957;
        const pixelsPerYear = 200; // More spacing

        // Group by Year
        const years: Map<number, YearGroup> = new Map();

        SpaceHistory.forEach(event => {
            if (!years.has(event.year)) {
                years.set(event.year, {
                    year: event.year,
                    events: [],
                    status: 'mixed'
                });
            }
            years.get(event.year)!.events.push(event);
        });

        // Determine aggregated status color for the node
        years.forEach(group => {
            // Logic: if any failure -> mixed/failure, if all success -> success
            // Simple logic: use type of first event or 'mixed' if multiple types
            const types = new Set(group.events.map(e => e.type));
            if (types.has('future')) group.status = 'future';
            else if (types.size > 1) group.status = 'mixed';
            else group.status = group.events[0].type;
        });

        const sortedYears = Array.from(years.values()).sort((a, b) => a.year - b.year);

        sortedYears.forEach((group) => {
            const isFuture = group.year > this.currentYear;
            const isLocked = isFuture;

            const yearDiff = group.year - startYear;
            const positionLeft = yearDiff * pixelsPerYear + 100;

            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.style.position = 'absolute';
            item.style.left = `${positionLeft}px`;
            item.style.top = '50%';
            item.style.transform = 'translate(-50%, -50%)';
            item.style.display = 'flex';
            item.style.flexDirection = 'column';
            item.style.alignItems = 'center';
            item.style.zIndex = '10'; // Above line
            item.style.cursor = isLocked ? 'default' : 'pointer';
            item.style.width = '60px'; // Hit area
            item.style.height = '100px';
            item.style.justifyContent = 'center';

            // Interaction
            if (!isLocked) {
                // Use addEventListener for better reliability
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
                    e.stopPropagation(); // Prevent bubbling
                    this.selectYear(group, item);
                });
            }

            // Year Label (Above)
            const yearLabel = document.createElement('div');
            yearLabel.innerText = group.year.toString();
            yearLabel.style.fontSize = '20px';
            yearLabel.style.fontWeight = 'bold';
            yearLabel.style.color = isLocked ? '#555' : '#fff';
            yearLabel.style.marginBottom = '15px';
            yearLabel.style.fontFamily = 'monospace';
            yearLabel.style.pointerEvents = 'none'; // Click through

            // Node Circle
            const node = document.createElement('div');
            node.className = 'node-circle';
            node.style.width = '24px';
            node.style.height = '24px';
            node.style.borderRadius = '50%';
            node.style.border = isLocked ? '2px solid #555' : '3px solid #fff';
            node.style.backgroundColor = isLocked ? '#222' : this.getNodeColor(group.status);
            node.style.boxShadow = isLocked ? 'none' : `0 0 15px ${this.getNodeColor(group.status)}40`;
            node.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            node.style.pointerEvents = 'none'; // Click through to item

            // Event Count Badge (if > 1)
            if (group.events.length > 1 && !isLocked) {
                const badge = document.createElement('div');
                badge.textContent = group.events.length.toString();
                badge.style.position = 'absolute';
                badge.style.top = '55px'; // Adjust based on layout
                badge.style.right = '10px';
                badge.style.backgroundColor = '#fff';
                badge.style.color = '#000';
                badge.style.borderRadius = '50%';
                badge.style.width = '16px';
                badge.style.height = '16px';
                badge.style.fontSize = '10px';
                badge.style.fontWeight = 'bold';
                badge.style.display = 'flex';
                badge.style.justifyContent = 'center';
                badge.style.alignItems = 'center';
                badge.style.pointerEvents = 'none';
                item.appendChild(badge);
            }

            item.appendChild(yearLabel);
            item.appendChild(node);

            this.timelineContainer.appendChild(item);
        });
    }

    selectYear(group: YearGroup, item: HTMLDivElement) {
        const color = this.getNodeColor(group.status);

        // Reset all items
        this.timelineContainer.querySelectorAll('.timeline-item').forEach((el: Element) => {
            const div = el as HTMLDivElement;
            div.classList.remove('active');
            const n = div.querySelector('.node-circle') as HTMLElement;
            if (n) {
                n.style.transform = 'scale(1)';
                n.style.boxShadow = 'none'; // Reset glow
                // Re-apply base glow? Logic simplified
            }
        });

        // Activate current
        item.classList.add('active');
        const activeNode = item.querySelector('.node-circle') as HTMLElement;
        if (activeNode) {
            activeNode.style.transform = 'scale(1.5)';
            activeNode.style.boxShadow = `0 0 25px ${color}`;
        }

        // Header
        this.detailTitle.textContent = `${group.year}`;
        this.detailTitle.style.color = color;

        // Render EVENTS list
        this.detailDesc.innerHTML = ''; // Clear previous

        // Add each event as a card
        group.events.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            eventCard.style.padding = '20px';
            eventCard.style.borderRadius = '8px';
            eventCard.style.borderLeft = `4px solid ${this.getNodeColor(event.type)}`;

            // Header: Title + Flag
            let headerHtml = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; font-size: 22px; color: #fff;">${i18next.t(event.title)}</h3>`;

            if (event.country) {
                const flag = this.getFlag(event.country);
                headerHtml += `<span style="font-size: 24px; title="${event.country}">${flag}</span>`;
            }
            headerHtml += `</div>`;

            let contentHtml = `<p style="color: #ccc; margin: 0 0 15px 0; line-height: 1.5;">${i18next.t(event.description)}</p>`;

            // Flavor Text
            if (event.flavorText) {
                contentHtml += `<div style="background: rgba(0, 170, 255, 0.1); padding: 8px 12px; border-radius: 4px; border-left: 2px solid #00aaff; margin-bottom: 15px;">
                     <i style="color: #00aaff; font-size: 14px;">"${i18next.t(event.flavorText)}"</i>
                </div>`;
            }

            // Unlocked Parts
            if (event.unlockedParts && event.unlockedParts.length > 0) {
                contentHtml += `<div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
                    ${event.unlockedParts.map(p =>
                    `<span style="background: #2E7D32; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">🔓 ${p}</span>`
                ).join('')}
                 </div>`;
            }

            // Related Missions
            if (event.relatedMissionIds && event.relatedMissionIds.length > 0) {
                contentHtml += `<div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                    <div style="font-size: 12px; text-transform: uppercase; color: #aaa; margin-bottom: 8px;">${i18next.t('chronology.relatedMissions')}</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">`;

                event.relatedMissionIds.forEach(missionId => {
                    const mission = this.missionManager.missions.find(m => m.id === missionId);
                    if (mission) {
                        const isCompleted = this.missionManager.completedMissionIds.has(missionId);
                        const statusColor = isCompleted ? '#00C851' : '#ffbb33';
                        const icon = isCompleted ? '✓' : '○';

                        contentHtml += `
                        <div style="display: flex; align-items: center; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
                            <span style="color: ${statusColor}; font-weight: bold; margin-right: 10px;">${icon}</span>
                            <span style="color: #eee;">${mission.title}</span>
                            ${isCompleted ? `<span style="margin-left: auto; color: ${statusColor}; font-size: 12px; border: 1px solid ${statusColor}; padding: 2px 6px; border-radius: 10px;">COMPLETED</span>` : ''}
                        </div>`;
                    }
                });
                contentHtml += `</div></div>`;
            }

            eventCard.innerHTML = headerHtml + contentHtml;
            this.detailDesc.appendChild(eventCard);
        });

        this.detailContainer.style.opacity = '1';

        // Remove placeholder
        const placeholder = this.descriptionPanel.querySelector('.placeholder-text');
        if (placeholder) placeholder.remove();

        // Scroll timeline
        const itemLeft = parseInt(item.style.left || '0');
        const containerWidth = this.timelineContainer.clientWidth;
        const scrollTarget = itemLeft - (containerWidth / 2);

        this.timelineContainer.scrollTo({
            left: scrollTarget,
            behavior: 'smooth'
        });
    }

    getNodeColor(type: string) {
        switch (type) {
            case 'success': return '#00C851';
            case 'failure': return '#ff4444';
            case 'discovery': return '#33b5e5';
            case 'future': return '#aa66cc';
            case 'mixed': return '#FF8800'; // Orange for mixed years
            default: return '#fff';
        }
    }

    getFlag(country: string): string {
        if (country.includes('USA')) return '🇺🇸';
        if (country.includes('USSR')) return '☭';
        if (country.includes('China')) return '🇨🇳';
        if (country.includes('ESA') || country.includes('Europe')) return '🇪🇺';
        if (country.includes('International')) return '🌍';
        return '🏳️';
    }

    close() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
