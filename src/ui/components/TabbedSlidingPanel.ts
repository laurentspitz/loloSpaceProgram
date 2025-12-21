/**
 * TabbedSlidingPanel - Groups multiple panels into tabs, slides off-screen
 * 
 * One sliding panel with tab buttons at top. Each tab shows different content.
 * Slides with arrow button like Hangar palette.
 */

export type SlideDirection = 'left' | 'right';

export interface TabDefinition {
    id: string;
    title: string;
    icon: string;  // Emoji or short text
    content: HTMLElement;
}

export interface TabbedSlidingPanelOptions {
    tabs: TabDefinition[];
    direction: SlideDirection;
    width?: string;
    startOpen?: boolean;
    defaultTab?: string;
    headerContent?: HTMLElement;
}

export interface TabbedSlidingPanelResult {
    container: HTMLDivElement;
    toggle: () => void;
    open: () => void;
    close: () => void;
    selectTab: (tabId: string) => void;
    addTab: (tab: TabDefinition) => void;
    isOpen: () => boolean;
}

export function createTabbedSlidingPanel(options: TabbedSlidingPanelOptions): TabbedSlidingPanelResult {
    const {
        tabs,
        direction,
        width = '240px',
        startOpen = true,
        defaultTab,
        headerContent
    } = options;

    let isOpen = startOpen;
    let activeTabId = defaultTab || (tabs.length > 0 ? tabs[0].id : '');
    const tabContents: Map<string, HTMLElement> = new Map();

    // Root container (anchor point)
    const container = document.createElement('div');
    container.className = 'tabbed-sliding-panel-root';
    container.style.cssText = `
        position: absolute;
        pointer-events: none;
        z-index: 100;
    `;

    // Slider wrapper (moves panel + button together)
    const slider = document.createElement('div');
    slider.className = 'tabbed-sliding-panel-slider';
    slider.style.cssText = `
        display: flex;
        pointer-events: auto;
        transition: transform 0.3s ease-in-out;
        flex-direction: ${direction === 'left' ? 'row' : 'row-reverse'};
        align-items: flex-start;
    `;

    // Main panel
    const panel = document.createElement('div');
    panel.className = 'tabbed-sliding-panel-content';
    panel.style.cssText = `
        width: ${width};
        background: rgba(30, 30, 30, 0.95);
        border: 1px solid #444;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        max-height: 80vh;
    `;

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.className = 'tabbed-panel-tabbar';
    tabBar.style.cssText = `
        display: flex;
        background: #222;
        border-bottom: 1px solid #444;
        overflow-x: auto;
        flex-shrink: 0;
    `;

    // Tab content container
    const contentArea = document.createElement('div');
    contentArea.className = 'tabbed-panel-content-area';
    contentArea.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 10px;
    `;

    // Create tab buttons
    const tabButtons: Map<string, HTMLButtonElement> = new Map();

    const selectTab = (tabId: string) => {
        activeTabId = tabId;

        // Update button styles
        tabButtons.forEach((btn, id) => {
            if (id === tabId) {
                btn.style.background = '#444';
                btn.style.borderBottom = '2px solid #4a9eff';
                btn.style.color = '#fff';
            } else {
                btn.style.background = 'transparent';
                btn.style.borderBottom = '2px solid transparent';
                btn.style.color = '#888';
            }
        });

        // Show/hide content
        tabContents.forEach((content, id) => {
            content.style.display = id === tabId ? 'block' : 'none';
        });
    };

    const createTabButton = (tab: TabDefinition) => {
        const btn = document.createElement('button');
        btn.className = 'tabbed-panel-tab';
        btn.title = tab.title;
        btn.innerHTML = `<span style="font-size:14px">${tab.icon}</span><span style="font-size:10px;margin-left:4px">${tab.title}</span>`;
        btn.style.cssText = `
            flex: 1;
            min-width: 60px;
            padding: 8px 4px;
            background: transparent;
            border: none;
            border-bottom: 2px solid transparent;
            color: #888;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            transition: all 0.2s;
        `;
        btn.onclick = () => selectTab(tab.id);

        tabButtons.set(tab.id, btn);
        return btn;
    };

    // Add initial tabs
    tabs.forEach(tab => {
        tabBar.appendChild(createTabButton(tab));
        tab.content.style.display = 'none';
        contentArea.appendChild(tab.content);
        tabContents.set(tab.id, tab.content);
    });

    // Toggle button (arrow)
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'tabbed-sliding-panel-toggle';
    toggleBtn.style.cssText = `
        width: 24px;
        height: 64px;
        background: #444;
        border: 1px solid #555;
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        box-shadow: 2px 0 5px rgba(0,0,0,0.3);
        flex-shrink: 0;
        margin-top: 20px;
        ${direction === 'left' ? 'border-left: none; border-radius: 0 6px 6px 0;' : 'border-right: none; border-radius: 6px 0 0 6px;'}
    `;

    const getArrow = (open: boolean) => {
        return direction === 'left'
            ? (open ? '◀' : '▶')
            : (open ? '▶' : '◀');
    };

    const getClosedTransform = () => {
        const panelWidth = parseInt(width) || 240;
        return direction === 'left'
            ? `translateX(-${panelWidth + 2}px)`
            : `translateX(${panelWidth + 2}px)`;
    };

    const updateState = () => {
        toggleBtn.textContent = getArrow(isOpen);
        slider.style.transform = isOpen ? 'translate(0, 0)' : getClosedTransform();
    };

    const toggle = () => {
        isOpen = !isOpen;
        updateState();
    };

    const open = () => {
        isOpen = true;
        updateState();
    };

    const close = () => {
        isOpen = false;
        updateState();
    };

    const addTab = (tab: TabDefinition) => {
        tabBar.appendChild(createTabButton(tab));
        tab.content.style.display = 'none';
        contentArea.appendChild(tab.content);
        tabContents.set(tab.id, tab.content);
    };

    toggleBtn.onclick = toggle;

    // Assemble panel
    if (headerContent) {
        const headerWrapper = document.createElement('div');
        headerWrapper.style.padding = '10px';
        headerWrapper.style.borderBottom = '1px solid #444';
        headerWrapper.style.background = '#252525';
        headerWrapper.appendChild(headerContent);
        panel.appendChild(headerWrapper);
    }
    panel.appendChild(tabBar);
    panel.appendChild(contentArea);

    // Assemble slider
    slider.appendChild(panel);
    slider.appendChild(toggleBtn);
    container.appendChild(slider);

    // Initial state
    updateState();
    if (activeTabId) {
        selectTab(activeTabId);
    }

    return {
        container,
        toggle,
        open,
        close,
        selectTab,
        addTab,
        isOpen: () => isOpen
    };
}
