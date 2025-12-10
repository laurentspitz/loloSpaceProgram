import { SpaceHistory } from '../data/SpaceHistory';
import i18next from 'i18next';


export class ChronologyMenu {
    container!: HTMLDivElement;
    timelineContainer!: HTMLDivElement;
    descriptionPanel!: HTMLDivElement;

    // Detailed View Elements
    detailContainer!: HTMLDivElement;
    detailTitle!: HTMLHeadingElement;
    detailDesc!: HTMLDivElement;

    onClose: () => void;

    // Track current game year to highlight position
    currentYear: number = 1957;

    constructor(onClose: () => void) {
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
        this.container.style.zIndex = '4000'; // Above everything including AuthMenu
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

        const title = document.createElement('h1');
        title.innerHTML = `${i18next.t('chronology.title')} <span style="font-weight:lighter; font-size: 0.6em; color: #aaa;">${i18next.t('chronology.subtitle')}</span>`;
        title.style.margin = '0';
        title.style.letterSpacing = '2px';

        const closeBtn = document.createElement('button');
        closeBtn.innerText = i18next.t('chronology.close');
        closeBtn.className = 'game-btn'; // Assume standard game-btn class exists
        closeBtn.style.padding = '10px 20px';
        closeBtn.style.border = '1px solid #444';
        closeBtn.style.background = 'transparent';
        closeBtn.style.color = '#fff';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => {
            this.close();
            this.onClose();
        };

        header.appendChild(title);
        header.appendChild(closeBtn);
        this.container.appendChild(header);

        // Content Area
        const content = document.createElement('div');
        content.style.flex = '1';
        content.style.display = 'flex';
        content.style.flexDirection = 'column'; // Stack Timeline and Details
        content.style.overflow = 'hidden';
        content.style.position = 'relative';

        // 1. Horizontal Scrollable Timeline
        this.timelineContainer = document.createElement('div');
        this.timelineContainer.style.height = '50%';
        this.timelineContainer.style.display = 'flex';
        this.timelineContainer.style.alignItems = 'center';
        this.timelineContainer.style.padding = '0 50px'; // Padding on sides
        this.timelineContainer.style.overflowX = 'auto'; // Horizontal scroll
        this.timelineContainer.style.overflowY = 'hidden';
        this.timelineContainer.style.whiteSpace = 'nowrap';
        this.timelineContainer.style.gap = '80px'; // Spacing between nodes
        this.timelineContainer.style.scrollBehavior = 'smooth';

        // Custom scrollbar styling
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
        this.descriptionPanel.style.height = '40%';
        this.descriptionPanel.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
        this.descriptionPanel.style.background = 'rgba(0,0,0,0.3)';
        this.descriptionPanel.style.padding = '40px';
        this.descriptionPanel.style.display = 'flex';
        this.descriptionPanel.style.justifyContent = 'center';
        this.descriptionPanel.style.alignItems = 'center';

        // Initialize Detail Container
        this.detailContainer = document.createElement('div');
        this.detailContainer.style.maxWidth = '800px';
        this.detailContainer.style.width = '100%';
        this.detailContainer.style.display = 'flex';
        this.detailContainer.style.flexDirection = 'column';
        this.detailContainer.style.gap = '20px';
        this.detailContainer.style.opacity = '0'; // Hidden initially
        this.detailContainer.style.transition = 'opacity 0.3s ease';

        this.detailTitle = document.createElement('h2');
        this.detailTitle.style.fontSize = '32px';
        this.detailTitle.style.margin = '0';
        this.detailTitle.style.borderBottom = '1px solid #444';
        this.detailTitle.style.paddingBottom = '10px';

        this.detailDesc = document.createElement('div');
        this.detailDesc.style.fontSize = '16px';
        this.detailDesc.style.lineHeight = '1.6';
        this.detailDesc.style.color = '#ccc';

        this.detailContainer.appendChild(this.detailTitle);
        this.detailContainer.appendChild(this.detailDesc);

        // Placeholder text
        const placeholder = document.createElement('div');
        placeholder.textContent = i18next.t('chronology.selectEvent');
        placeholder.style.color = '#666';
        placeholder.style.position = 'absolute';

        this.descriptionPanel.appendChild(placeholder);
        this.descriptionPanel.appendChild(this.detailContainer);

        content.appendChild(this.timelineContainer);
        content.appendChild(this.descriptionPanel);
        this.container.appendChild(content);

        document.body.appendChild(this.container);
    }

    renderTimelineItems() {
        // Line connecting items
        // We can't easily draw a continuous line in a flex container with gaps, 
        // so we'll use :before/:after on items or a background SVG. 
        // For simplicity, let's just create nodes.

        SpaceHistory.forEach((event) => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.style.display = 'inline-flex';
            item.style.flexDirection = 'column';
            item.style.alignItems = 'center';
            item.style.position = 'relative';
            item.style.cursor = 'pointer';
            item.style.transition = 'transform 0.2s, border-color 0.2s, box-shadow 0.2s'; // Add transitions for new styles
            item.style.border = '2px solid rgba(255,255,255,0.1)'; // Initial border
            item.style.borderRadius = '8px'; // Rounded corners for the item card
            item.style.padding = '15px 10px'; // Padding inside the item card
            item.style.backgroundColor = 'rgba(0,0,0,0.2)'; // Background for the item card

            // Hover effect
            item.onmouseenter = () => item.style.transform = 'scale(1.05)';
            item.onmouseleave = () => item.style.transform = 'scale(1)';

            // Click to show details
            item.onclick = () => {
                const color = this.getNodeColor(event.type);

                // Remove active class from all
                this.timelineContainer.querySelectorAll('.timeline-item').forEach((d: Element) => {
                    const el = d as HTMLDivElement;
                    el.style.borderColor = 'rgba(255,255,255,0.1)';
                    el.style.transform = 'scale(1)';
                    el.style.boxShadow = 'none';
                });
                item.style.borderColor = color;
                item.style.transform = 'scale(1.05)';
                item.style.boxShadow = `0 0 20px ${color}40`;
                const translatedTitle = i18next.t(event.title);
                this.detailTitle.textContent = `${event.year}: ${translatedTitle}`;
                this.detailTitle.style.color = color;

                let descHtml = `<p>${i18next.t(event.description)}</p>`;
                if (event.country) {
                    const flag = this.getFlag(event.country);
                    descHtml += `<p style="color: #aaa; margin-top: 5px; font-size: 14px;">${i18next.t('chronology.madeBy', { flag: flag, country: event.country })}</p>`;
                }

                // Flavor Text (Technology Unlocked)
                if (event.flavorText) {
                    descHtml += `<div style="margin-top: 15px; padding: 10px; background: rgba(0, 170, 255, 0.1); border-left: 3px solid #00aaff; border-radius: 4px;">
                        <span style="color: #00aaff; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">${i18next.t('chronology.techBreakthrough')}</span><br>
                        <span style="color: #fff; font-size: 16px;">${i18next.t(event.flavorText)}</span>
                    </div>`;
                }

                // Unlocked Parts List
                if (event.unlockedParts && event.unlockedParts.length > 0) {
                    descHtml += `<div style="margin-top: 15px;">
                        <span style="color: #4CAF50; font-weight: bold; font-size: 12px; text-transform: uppercase;">${i18next.t('chronology.unlockedParts')}</span>
                        <ul style="margin: 5px 0 0 0; padding-left: 20px; color: #ddd;">
                            ${event.unlockedParts.map(p => `<li>${p}</li>`).join('')}
                        </ul>
                    </div>`;
                }

                this.detailDesc.innerHTML = descHtml;

                this.detailContainer.style.opacity = '1';

                // Remove placeholder if it exists
                const placeholder = this.descriptionPanel.querySelector('div[style*="Select an event"]');
                if (placeholder) { // Check text content slightly more robustly or just by reference if we kept it, but query works for this simple case or re-select by text content
                    // Actually, the selector above 'style*="Select an event"' is risky if text changes.
                    // Better to clean children or keep reference.
                    // Since I imported i18n, the text changes.
                    // Let's just empty the panel before adding container if we want, but detailContainer is appended.
                    // The placeholder was appended directly.
                    // Let's match by reference if possible? No reference stored on instance.
                    // Let's iterate children and remove if it is the placeholder div.
                    Array.from(this.descriptionPanel.children).forEach(child => {
                        if (child !== this.detailContainer && child.textContent === i18next.t('chronology.selectEvent')) {
                            child.remove();
                        }
                    });
                }

                // Scroll to center
                const containerCenter = this.timelineContainer.offsetWidth / 2;
                const cardCenter = item.offsetLeft + item.offsetWidth / 2;
                this.timelineContainer.scrollTo({
                    left: cardCenter - containerCenter,
                    behavior: 'smooth'
                });
            };

            // Year Label
            const yearLabel = document.createElement('div');
            yearLabel.innerText = event.year.toString();
            yearLabel.style.fontSize = '24px';
            yearLabel.style.fontWeight = 'bold';
            yearLabel.style.color = '#fff';
            yearLabel.style.marginBottom = '10px';
            yearLabel.style.fontFamily = 'monospace';

            // Node Circle
            const node = document.createElement('div');
            node.style.width = '20px';
            node.style.height = '20px';
            node.style.borderRadius = '50%';
            node.style.border = '2px solid #fff';
            node.style.backgroundColor = this.getNodeColor(event.type);
            node.style.boxShadow = `0 0 10px ${this.getNodeColor(event.type)}`;
            node.style.marginBottom = '10px';
            node.style.zIndex = '1';

            // Connecting Line (Horizontal) after the node
            // Note: This is tricky with flexbox gaps. 
            // Better visual: just nodes floating.

            // Title Label
            const titleLabel = document.createElement('div');
            titleLabel.innerText = i18next.t(event.title);
            titleLabel.style.fontSize = '14px';
            titleLabel.style.color = '#ccc';
            titleLabel.style.maxWidth = '150px';
            titleLabel.style.whiteSpace = 'normal'; // Allow text wrap within the item width
            titleLabel.style.textAlign = 'center';

            item.appendChild(yearLabel);
            item.appendChild(node);
            item.appendChild(titleLabel);

            this.timelineContainer.appendChild(item);
        });
    }

    getNodeColor(type: string) {
        switch (type) {
            case 'success': return '#00C851'; // Green
            case 'failure': return '#ff4444'; // Red
            case 'discovery': return '#33b5e5'; // Blue
            case 'future': return '#aa66cc'; // Purple
            default: return '#fff';
        }
    }

    getFlag(country: string): string {
        if (country.includes('USA')) return '🇺🇸';
        if (country.includes('USSR')) return '☭'; // Or 🇷🇺
        if (country.includes('China')) return '🇨🇳';
        if (country.includes('ESA') || country.includes('Europe')) return '🇪🇺';
        if (country.includes('International')) return '🌍';
        return '🏳️';
    }

    updateCurrentYear(year: number) {
        this.currentYear = year;
        // Logic to scroll to year or highlight it could go here
    }

    close() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
