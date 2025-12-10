/**
 * Creates a collapsible panel component
 */
export interface CollapsiblePanelOptions {
    titleText: string;
    content: HTMLElement;
    isCollapsed?: boolean;
    width?: string;
}

export interface CollapsiblePanelResult {
    container: HTMLDivElement;
    toggle: () => void;
}

export function createCollapsiblePanel(
    titleText: string,
    content: HTMLElement,
    isCollapsed: boolean = true,
    width: string = '200px'
): CollapsiblePanelResult {
    const container = document.createElement('div');
    container.className = 'game-panel';
    container.style.minWidth = width;
    container.style.marginBottom = '0';

    // Title bar
    const titleBar = document.createElement('div');
    titleBar.className = 'panel-header';
    if (isCollapsed) titleBar.classList.add('collapsed');

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerText = titleText;

    const toggleBtn = document.createElement('span');
    toggleBtn.className = 'panel-toggle';
    toggleBtn.innerText = isCollapsed ? '+' : '−';

    titleBar.appendChild(title);
    titleBar.appendChild(toggleBtn);
    container.appendChild(titleBar);

    // Content Container
    const contentContainer = document.createElement('div');
    contentContainer.style.overflow = 'hidden';
    contentContainer.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';

    // Initial state
    if (isCollapsed) {
        contentContainer.style.maxHeight = '0px';
        contentContainer.style.opacity = '0';
    } else {
        contentContainer.style.maxHeight = '500px';
        contentContainer.style.opacity = '1';
    }

    contentContainer.appendChild(content);
    container.appendChild(contentContainer);

    const toggle = () => {
        isCollapsed = !isCollapsed;
        toggleBtn.innerText = isCollapsed ? '+' : '−';

        if (isCollapsed) {
            contentContainer.style.maxHeight = '0px';
            contentContainer.style.opacity = '0';
            titleBar.classList.add('collapsed');
        } else {
            contentContainer.style.maxHeight = '500px';
            contentContainer.style.opacity = '1';
            titleBar.classList.remove('collapsed');
        }
    };

    titleBar.onclick = toggle;

    return { container, toggle };
}
