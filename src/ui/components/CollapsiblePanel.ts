/**
 * Creates a collapsible panel component with Hangar-style design
 */
export interface CollapsiblePanelOptions {
    titleText: string;
    content: HTMLElement;
    isCollapsed?: boolean;
    width?: string;
    /** Panel position affects toggle arrow direction */
    side?: 'left' | 'right' | 'top' | 'bottom';
    /** If true, panel is secondary and hidden on mobile */
    isSecondary?: boolean;
}

export interface CollapsiblePanelResult {
    container: HTMLDivElement;
    toggle: () => void;
    setCollapsed: (collapsed: boolean) => void;
}

export function createCollapsiblePanel(
    titleText: string,
    content: HTMLElement,
    isCollapsed: boolean = true,
    width: string = '200px',
    side: 'left' | 'right' | 'top' | 'bottom' = 'right',
    isSecondary: boolean = false
): CollapsiblePanelResult {
    const container = document.createElement('div');
    container.className = 'game-panel';
    if (isSecondary) container.classList.add('secondary-panel');
    container.style.cssText = `
        min-width: ${width};
        margin-bottom: 0;
        background: rgba(30, 30, 30, 0.95);
        border: 1px solid #444;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    `;

    // Title bar - touch-friendly (44px min height)
    const titleBar = document.createElement('div');
    titleBar.className = 'panel-header';
    if (isCollapsed) titleBar.classList.add('collapsed');
    titleBar.style.cssText = `
        min-height: 44px;
        padding: 0 12px;
        background: #333;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
        transition: background 0.2s;
    `;
    titleBar.onmouseover = () => titleBar.style.background = '#3a3a3a';
    titleBar.onmouseout = () => titleBar.style.background = '#333';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerText = titleText;
    title.style.cssText = `
        font-weight: bold;
        font-size: 12px;
        color: #eee;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    `;

    // Toggle button with arrows based on side
    const toggleBtn = document.createElement('span');
    toggleBtn.className = 'panel-toggle';
    toggleBtn.style.cssText = `
        font-size: 12px;
        color: #aaa;
        transition: transform 0.3s;
    `;

    // Set arrow based on side and state
    const getArrow = (collapsed: boolean) => {
        if (side === 'left') return collapsed ? '▶' : '◀';
        if (side === 'right') return collapsed ? '◀' : '▶';
        if (side === 'top') return collapsed ? '▼' : '▲';
        return collapsed ? '▲' : '▼'; // bottom
    };
    toggleBtn.innerText = getArrow(isCollapsed);

    titleBar.appendChild(title);
    titleBar.appendChild(toggleBtn);
    container.appendChild(titleBar);

    // Content Container with smooth animation
    const contentContainer = document.createElement('div');
    contentContainer.className = 'panel-content';
    contentContainer.style.cssText = `
        overflow: hidden;
        transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
        background: rgba(20, 20, 20, 0.8);
    `;

    // Initial state
    if (isCollapsed) {
        contentContainer.style.maxHeight = '0px';
        contentContainer.style.opacity = '0';
        contentContainer.style.padding = '0 10px';
    } else {
        contentContainer.style.maxHeight = '500px';
        contentContainer.style.opacity = '1';
        contentContainer.style.padding = '10px';
    }

    contentContainer.appendChild(content);
    container.appendChild(contentContainer);

    const setCollapsed = (collapsed: boolean) => {
        isCollapsed = collapsed;
        toggleBtn.innerText = getArrow(isCollapsed);

        if (isCollapsed) {
            contentContainer.style.maxHeight = '0px';
            contentContainer.style.opacity = '0';
            contentContainer.style.padding = '0 10px';
            titleBar.classList.add('collapsed');
        } else {
            contentContainer.style.maxHeight = '500px';
            contentContainer.style.opacity = '1';
            contentContainer.style.padding = '10px';
            titleBar.classList.remove('collapsed');
        }
    };

    const toggle = () => {
        setCollapsed(!isCollapsed);
    };

    titleBar.onclick = toggle;

    return { container, toggle, setCollapsed };
}
