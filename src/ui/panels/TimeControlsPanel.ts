import { GameTimeManager } from '../../managers/GameTimeManager';
import { createSlidingPanel } from '../components/SlidingPanel';
import i18next from 'i18next';

export interface TimeControlsPanelOptions {
    onTimeWarpChange?: (factor: number) => void;
    /** If true, panel is embedded in a tabbed container */
    embedded?: boolean;
}

/**
 * Time Controls Panel - handles time warp and date/time display
 */
export class TimeControlsPanel {
    private container: HTMLDivElement | null = null;
    private content: HTMLDivElement | null = null;
    private timeSpeedDisplay: HTMLElement | null = null;
    private currentTimeWarp: number = 1;
    private warpLevels: number[] = [0, 0.1, 0.2, 0.5, 1, 5, 10, 50, 100, 500, 1000, 5000];
    private onTimeWarpChange?: (factor: number) => void;
    private embedded: boolean = false;

    constructor(options: TimeControlsPanelOptions = {}) {
        this.onTimeWarpChange = options.onTimeWarpChange;
        this.embedded = options.embedded || false;
        this.create();
    }

    private create(): void {
        // Content Wrapper
        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.gap = '8px';

        // Date/Time Display - Initialize with game start date (1957)
        const initialDate = GameTimeManager.getDate(0);
        const initialYear = initialDate.getUTCFullYear();
        const initialMonth = String(initialDate.getUTCMonth() + 1).padStart(2, '0');
        const initialDay = String(initialDate.getUTCDate()).padStart(2, '0');
        const initialDateString = `${initialYear}-${initialMonth}-${initialDay} 00:00:00`;

        const dateDisplay = document.createElement('div');
        dateDisplay.id = 'game-date-display';
        dateDisplay.style.color = '#88ccff';
        dateDisplay.style.fontFamily = 'monospace';
        dateDisplay.style.fontSize = '12px';
        dateDisplay.style.display = 'flex';
        dateDisplay.style.justifyContent = 'space-between';
        dateDisplay.innerHTML = `<span style="color:#aaa">${i18next.t('ui.date')}</span> <span id="game-date-val">${initialDateString}</span>`;
        content.appendChild(dateDisplay);

        // Elapsed time
        const elapsedDisplay = document.createElement('div');
        elapsedDisplay.id = 'game-elapsed-display';
        elapsedDisplay.style.color = '#aaaaaa';
        elapsedDisplay.style.fontFamily = 'monospace';
        elapsedDisplay.style.fontSize = '11px';
        elapsedDisplay.style.textAlign = 'right';
        elapsedDisplay.innerText = i18next.t('ui.elapsed') + ' 00:00:00';
        content.appendChild(elapsedDisplay);

        // Divider
        const divider = document.createElement('div');
        divider.style.width = '100%';
        divider.style.height = '1px';
        divider.style.backgroundColor = '#555';
        content.appendChild(divider);

        // Time warp controls row
        const controlsRow = document.createElement('div');
        controlsRow.style.display = 'flex';
        controlsRow.style.justifyContent = 'flex-end';
        controlsRow.style.alignItems = 'center';
        controlsRow.style.gap = '2px';

        const decreaseBtn = document.createElement('button');
        decreaseBtn.innerHTML = '&#9194;';
        decreaseBtn.title = "Decrease Warp (,)";
        decreaseBtn.className = 'game-btn game-btn-icon';
        decreaseBtn.onclick = () => this.changeTimeWarp(-1);

        const pauseBtn = document.createElement('button');
        pauseBtn.innerHTML = '&#9208;';
        pauseBtn.title = "Stop Warp (/)";
        pauseBtn.className = 'game-btn game-btn-icon';
        pauseBtn.style.color = '#ff4444';
        pauseBtn.onclick = () => this.setTimeWarp(0);

        const playBtn = document.createElement('button');
        playBtn.innerHTML = '&#9654;';
        playBtn.title = "Realtime (1x)";
        playBtn.className = 'game-btn game-btn-icon';
        playBtn.style.color = '#00C851';
        playBtn.onclick = () => this.setTimeWarp(1);

        const increaseBtn = document.createElement('button');
        increaseBtn.innerHTML = '&#9193;';
        increaseBtn.title = "Increase Warp (.)";
        increaseBtn.className = 'game-btn game-btn-icon';
        increaseBtn.onclick = () => this.changeTimeWarp(1);

        controlsRow.appendChild(decreaseBtn);
        controlsRow.appendChild(pauseBtn);
        controlsRow.appendChild(playBtn);
        controlsRow.appendChild(increaseBtn);

        // Speed Display
        const speedDisplay = document.createElement('span');
        speedDisplay.innerText = '1x';
        speedDisplay.style.color = '#00C851';
        speedDisplay.style.fontFamily = 'monospace';
        speedDisplay.style.fontWeight = 'bold';
        speedDisplay.style.minWidth = '40px';
        speedDisplay.style.textAlign = 'center';
        speedDisplay.style.marginLeft = '5px';
        this.timeSpeedDisplay = speedDisplay;
        controlsRow.appendChild(speedDisplay);

        content.appendChild(controlsRow);

        // Store content for embedded mode
        this.content = content;

        // In embedded mode, don't create sliding wrapper
        if (this.embedded) {
            return;
        }

        // Create Sliding Panel (slides off-screen like Hangar)
        const { container } = createSlidingPanel({
            title: '',
            content,
            direction: 'right',
            width: '240px',
            startOpen: true
        });
        container.style.top = '10px';
        container.style.right = '10px';
        container.id = 'time-controls-panel';

        document.body.appendChild(container);
        this.container = container;
    }

    setTimeWarp(levelIndexOrValue: number): void {
        this.currentTimeWarp = levelIndexOrValue;

        if (this.timeSpeedDisplay) {
            // Format display: show decimals for slow motion
            const displayValue = levelIndexOrValue < 1 && levelIndexOrValue > 0
                ? levelIndexOrValue.toFixed(1)
                : String(levelIndexOrValue);
            this.timeSpeedDisplay.innerText = displayValue + 'x';

            if (levelIndexOrValue === 0) {
                this.timeSpeedDisplay.style.color = '#ff4444'; // Red - paused
            } else if (levelIndexOrValue < 1) {
                this.timeSpeedDisplay.style.color = '#00bfff'; // Cyan - slow motion
            } else if (levelIndexOrValue === 1) {
                this.timeSpeedDisplay.style.color = '#00C851'; // Green - realtime
            } else {
                this.timeSpeedDisplay.style.color = '#ffbb33'; // Orange - fast forward
            }
        }

        if (this.onTimeWarpChange) {
            this.onTimeWarpChange(this.currentTimeWarp);
        }
    }

    private changeTimeWarp(direction: number): void {
        let currentIndex = this.warpLevels.indexOf(this.currentTimeWarp);
        if (currentIndex === -1) currentIndex = 1;

        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= this.warpLevels.length) newIndex = this.warpLevels.length - 1;

        this.setTimeWarp(this.warpLevels[newIndex]);
    }

    getCurrentTimeWarp(): number {
        return this.currentTimeWarp;
    }

    updateDateTime(elapsedSeconds: number): void {
        const currentDate = GameTimeManager.getDate(elapsedSeconds);

        const year = currentDate.getUTCFullYear();
        const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getUTCDate()).padStart(2, '0');
        const hours = String(currentDate.getUTCHours()).padStart(2, '0');
        const minutes = String(currentDate.getUTCMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getUTCSeconds()).padStart(2, '0');

        const dateString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        const dateVal = document.getElementById('game-date-val');
        if (dateVal) {
            dateVal.innerText = dateString;
        }

        // Calculate Mission Elapsed Time (MET)
        const totalSeconds = Math.floor(elapsedSeconds);
        const metSeconds = totalSeconds % 60;
        const metMinutes = Math.floor(totalSeconds / 60) % 60;
        const metHours = Math.floor(totalSeconds / 3600) % 24;
        const metDays = Math.floor(totalSeconds / 86400);

        const metString = `MET: ${metDays}d ${metHours}h ${metMinutes}m ${metSeconds}s`;

        const elapsedDisplay = document.getElementById('game-elapsed-display');
        if (elapsedDisplay) {
            elapsedDisplay.innerText = metString;
        }
    }

    /** Get the content element (for embedded mode) */
    getContent(): HTMLDivElement | null {
        return this.content;
    }

    dispose(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
