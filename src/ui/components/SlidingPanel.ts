/**
 * SlidingPanel - Panel that slides off-screen like Hangar palette
 * 
 * The panel slides out with just an arrow button remaining visible.
 * Click the arrow to slide back in.
 */

export type SlideDirection = 'left' | 'right' | 'top' | 'bottom';

export interface SlidingPanelOptions {
    title: string;
    content: HTMLElement;
    direction: SlideDirection;
    width?: string;
    height?: string;
    startOpen?: boolean;
}

export interface SlidingPanelResult {
    container: HTMLDivElement;
    toggle: () => void;
    open: () => void;
    close: () => void;
    isOpen: () => boolean;
}

export function createSlidingPanel(options: SlidingPanelOptions): SlidingPanelResult {
    const {
        title,
        content,
        direction,
        width = '200px',
        height = 'auto',
        startOpen = true
    } = options;

    let isOpen = startOpen;

    // Root container (anchor point)
    const container = document.createElement('div');
    container.className = 'sliding-panel-root';
    container.style.cssText = `
        position: absolute;
        pointer-events: none;
        z-index: 100;
    `;

    // Slider wrapper (moves panel + button together)
    const slider = document.createElement('div');
    slider.className = 'sliding-panel-slider';
    slider.style.cssText = `
        display: flex;
        pointer-events: auto;
        transition: transform 0.3s ease-in-out;
    `;

    // Panel content
    const panel = document.createElement('div');
    panel.className = 'sliding-panel-content game-panel';
    panel.style.cssText = `
        width: ${width};
        height: ${height};
        background: rgba(30, 30, 30, 0.95);
        border: 1px solid #444;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    `;

    // Header
    if (title) {
        const header = document.createElement('div');
        header.className = 'sliding-panel-header';
        header.style.cssText = `
            padding: 10px 12px;
            background: #333;
            border-bottom: 1px solid #444;
            font-size: 12px;
            font-weight: bold;
            color: #eee;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;
        header.textContent = title;
        panel.appendChild(header);
    }

    // Body (content)
    const body = document.createElement('div');
    body.className = 'sliding-panel-body';
    body.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 10px;
    `;
    body.appendChild(content);
    panel.appendChild(body);

    // Toggle button (arrow)
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'sliding-panel-toggle';

    // Configure based on direction
    const isHorizontal = direction === 'left' || direction === 'right';
    const btnWidth = isHorizontal ? '24px' : '64px';
    const btnHeight = isHorizontal ? '64px' : '24px';

    toggleBtn.style.cssText = `
        width: ${btnWidth};
        height: ${btnHeight};
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
    `;

    // Set border radius and positioning based on direction
    if (direction === 'left') {
        slider.style.flexDirection = 'row';
        slider.style.alignItems = 'flex-start';
        toggleBtn.style.borderLeft = 'none';
        toggleBtn.style.borderRadius = '0 6px 6px 0';
        toggleBtn.style.marginTop = '20px';
    } else if (direction === 'right') {
        slider.style.flexDirection = 'row-reverse';
        slider.style.alignItems = 'flex-start';
        toggleBtn.style.borderRight = 'none';
        toggleBtn.style.borderRadius = '6px 0 0 6px';
        toggleBtn.style.marginTop = '20px';
    } else if (direction === 'top') {
        slider.style.flexDirection = 'column';
        slider.style.alignItems = 'center';
        toggleBtn.style.borderTop = 'none';
        toggleBtn.style.borderRadius = '0 0 6px 6px';
    } else { // bottom
        slider.style.flexDirection = 'column-reverse';
        slider.style.alignItems = 'center';
        toggleBtn.style.borderBottom = 'none';
        toggleBtn.style.borderRadius = '6px 6px 0 0';
    }

    // Get arrow for state
    const getArrow = (open: boolean) => {
        if (direction === 'left') return open ? '◀' : '▶';
        if (direction === 'right') return open ? '▶' : '◀';
        if (direction === 'top') return open ? '▲' : '▼';
        return open ? '▼' : '▲'; // bottom
    };

    // Get transform for closed state
    const getClosedTransform = () => {
        const panelWidth = parseInt(width) || 200;
        const panelHeight = parseInt(height) || 200;

        if (direction === 'left') return `translateX(-${panelWidth + 2}px)`;
        if (direction === 'right') return `translateX(${panelWidth + 2}px)`;
        if (direction === 'top') return `translateY(-${panelHeight + 2}px)`;
        return `translateY(${panelHeight + 2}px)`; // bottom
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

    toggleBtn.onclick = toggle;

    // Assemble
    slider.appendChild(panel);
    slider.appendChild(toggleBtn);
    container.appendChild(slider);

    // Initial state
    updateState();

    return {
        container,
        toggle,
        open,
        close,
        isOpen: () => isOpen
    };
}
