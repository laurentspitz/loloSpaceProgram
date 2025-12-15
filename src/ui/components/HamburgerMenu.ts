/**
 * HamburgerMenu - Groups secondary panels on mobile screens
 */
import i18next from 'i18next';

interface MenuPanel {
    id: string;
    title: string;
    element: HTMLElement;
    iconEmoji: string;
}

export class HamburgerMenu {
    private container: HTMLDivElement;
    private menuButton: HTMLButtonElement;
    private menuContent: HTMLDivElement;
    private panels: MenuPanel[] = [];
    private isOpen: boolean = false;

    constructor() {
        // Menu Button (hamburger icon)
        this.menuButton = document.createElement('button');
        this.menuButton.id = 'hamburger-menu-btn';
        this.menuButton.innerHTML = '☰';
        this.menuButton.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            width: 44px;
            height: 44px;
            background: rgba(30, 30, 30, 0.95);
            border: 1px solid #444;
            border-radius: 8px;
            color: #fff;
            font-size: 24px;
            cursor: pointer;
            z-index: 1000;
            display: none; /* Hidden by default, shown on mobile */
        `;
        this.menuButton.onclick = () => this.toggle();

        // Menu Content (dropdown)
        this.menuContent = document.createElement('div');
        this.menuContent.id = 'hamburger-menu-content';
        this.menuContent.style.cssText = `
            position: absolute;
            top: 60px;
            left: 10px;
            background: rgba(30, 30, 30, 0.95);
            border: 1px solid #444;
            border-radius: 8px;
            padding: 10px;
            display: none;
            flex-direction: column;
            gap: 5px;
            z-index: 999;
            min-width: 200px;
            max-height: 70vh;
            overflow-y: auto;
        `;

        // Container
        this.container = document.createElement('div');
        this.container.id = 'hamburger-menu';
        this.container.appendChild(this.menuButton);
        this.container.appendChild(this.menuContent);
        document.body.appendChild(this.container);

        // Add media query styles
        this.addResponsiveStyles();

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.container.contains(e.target as Node)) {
                this.close();
            }
        });
    }

    private addResponsiveStyles(): void {
        const style = document.createElement('style');
        style.id = 'hamburger-menu-styles';
        style.textContent = `
            /* Show hamburger on mobile */
            @media (max-width: 768px) {
                #hamburger-menu-btn {
                    display: flex !important;
                    align-items: center;
                    justify-content: center;
                }
                
                /* Hide secondary panels on mobile - they go in hamburger */
                .secondary-panel {
                    display: none !important;
                }
            }
            
            /* Touch-friendly panel headers */
            .panel-header {
                min-height: 44px;
                display: flex;
                align-items: center;
                padding: 0 12px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Add a panel to the hamburger menu (for mobile view)
     */
    addPanel(id: string, title: string, iconEmoji: string, element: HTMLElement): void {
        this.panels.push({ id, title, iconEmoji, element });
        this.renderMenuItems();
    }

    /**
     * Remove a panel from the menu
     */
    removePanel(id: string): void {
        this.panels = this.panels.filter(p => p.id !== id);
        this.renderMenuItems();
    }

    private renderMenuItems(): void {
        this.menuContent.innerHTML = '';

        this.panels.forEach(panel => {
            const item = document.createElement('button');
            item.className = 'hamburger-menu-item';
            item.innerHTML = `${panel.iconEmoji} ${panel.title}`;
            item.style.cssText = `
                background: #3a3a3a;
                border: 1px solid #555;
                border-radius: 4px;
                color: #fff;
                padding: 12px;
                text-align: left;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s;
            `;
            item.onmouseover = () => item.style.background = '#4a4a4a';
            item.onmouseout = () => item.style.background = '#3a3a3a';
            item.onclick = () => {
                this.showPanel(panel);
                this.close();
            };
            this.menuContent.appendChild(item);
        });
    }

    private showPanel(panel: MenuPanel): void {
        // Show the panel as a modal on mobile
        const modal = document.createElement('div');
        modal.className = 'mobile-panel-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: rgba(30, 30, 30, 0.95);
            border: 1px solid #444;
            border-radius: 12px;
            padding: 20px;
            max-width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
        `;

        // Clone the panel content
        const clone = panel.element.cloneNode(true) as HTMLElement;
        clone.style.position = 'relative';
        clone.style.display = 'block';
        content.appendChild(clone);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕ ' + i18next.t('menu.close', 'Close');
        closeBtn.style.cssText = `
            margin-top: 15px;
            width: 100%;
            padding: 12px;
            background: #444;
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 16px;
            cursor: pointer;
        `;
        closeBtn.onclick = () => modal.remove();
        content.appendChild(closeBtn);

        modal.appendChild(content);
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        document.body.appendChild(modal);
    }

    toggle(): void {
        this.isOpen ? this.close() : this.open();
    }

    open(): void {
        this.isOpen = true;
        this.menuContent.style.display = 'flex';
        this.menuButton.innerHTML = '✕';
    }

    close(): void {
        this.isOpen = false;
        this.menuContent.style.display = 'none';
        this.menuButton.innerHTML = '☰';
    }

    dispose(): void {
        this.container.remove();
        document.getElementById('hamburger-menu-styles')?.remove();
    }
}

// Singleton
let instance: HamburgerMenu | null = null;

export function getHamburgerMenu(): HamburgerMenu {
    if (!instance) {
        instance = new HamburgerMenu();
    }
    return instance;
}
