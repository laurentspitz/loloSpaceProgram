import i18next from '../../services/i18n';

export class HubScreen {
    container: HTMLDivElement;
    onPlay: (state: any) => void;
    onOpenHangar: () => void;
    onOpenChronology: () => void;
    onBack: () => void;
    private languageChangeListener: (() => void) | null = null;
    private pendingState: any = null;

    constructor(
        onPlay: (state: any) => void,
        onOpenHangar: () => void,
        onOpenChronology: () => void,
        onBack: () => void
    ) {
        this.onPlay = onPlay;
        this.onOpenHangar = onOpenHangar;
        this.onOpenChronology = onOpenChronology;
        this.onBack = onBack;

        this.container = document.createElement('div');
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '20px';
        this.container.style.zIndex = '1';
    }

    setPendingState(state: any) {
        this.pendingState = state;
    }

    mount(parent: HTMLElement) {
        this.cleanup();
        this.render();
        parent.appendChild(this.container);

        // Listen for language changes
        this.languageChangeListener = () => {
            this.render();
        };
        i18next.on('languageChanged', this.languageChangeListener);
    }

    unmount() {
        if (this.languageChangeListener) {
            i18next.off('languageChanged', this.languageChangeListener);
            this.languageChangeListener = null;
        }
        if (this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
    }

    private render() {
        this.container.innerHTML = '';

        // Continue / Play Button
        const solarSystemBtn = this.createButton(i18next.t('menu.continue'), '#00aaff');
        solarSystemBtn.onclick = () => {
            this.onPlay(this.pendingState);
        };
        this.container.appendChild(solarSystemBtn);

        // Build Rocket Button
        const hangarBtn = this.createButton(i18next.t('menu.buildRocket'), '#ffaa00');
        hangarBtn.onclick = () => this.onOpenHangar();
        this.container.appendChild(hangarBtn);

        // Chronology Button
        const chronologyBtn = this.createButton(i18next.t('menu.chronology'), '#aa00ff');
        chronologyBtn.onclick = async () => {
            // Lazy load ChronologyMenu
            const { ChronologyMenu } = await import('../ChronologyMenu');
            new ChronologyMenu(() => {
                // On close, do nothing (stay in hub)
            });
        };
        this.container.appendChild(chronologyBtn);

        // Back Button
        const backBtn = this.createButton(i18next.t('menu.back'), '#ffffff');
        backBtn.style.padding = '10px 20px'; // Smaller override
        backBtn.style.fontSize = '18px';
        backBtn.style.marginTop = '20px';
        backBtn.onclick = () => this.onBack();
        this.container.appendChild(backBtn);
    }

    private cleanup() {
        this.container.innerHTML = '';
    }

    private createButton(text: string, color: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.innerHTML = text;
        btn.style.padding = '15px 30px';
        btn.style.fontSize = '24px';
        btn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        btn.style.color = color;
        btn.style.border = `2px solid ${color}`;
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.3s ease';
        btn.style.minWidth = '300px';
        btn.style.backdropFilter = 'blur(5px)';

        btn.onmouseover = () => {
            btn.style.backgroundColor = color;
            btn.style.color = '#000';
            btn.style.boxShadow = `0 0 15px ${color}`;
        };

        btn.onmouseout = () => {
            btn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            btn.style.color = color;
            btn.style.boxShadow = 'none';
        };

        return btn;
    }
}
