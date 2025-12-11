import i18next from '../../services/i18n';

export type GameMode = 'mission' | 'sandbox';

export interface GameModeSelection {
    mode: GameMode;
    startYear: number;
}

export class GameModeScreen {
    container: HTMLDivElement;
    onSelectMode: (selection: GameModeSelection) => void;
    onBack: () => void;
    private languageChangeListener: (() => void) | null = null;

    constructor(
        onSelectMode: (selection: GameModeSelection) => void,
        onBack: () => void
    ) {
        this.onSelectMode = onSelectMode;
        this.onBack = onBack;

        this.container = document.createElement('div');
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '20px';
        this.container.style.zIndex = '1';
        this.container.style.alignItems = 'center';
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

        // Title
        const title = document.createElement('h2');
        title.textContent = i18next.t('menu.selectMode');
        title.style.color = '#ffffff';
        title.style.fontSize = '28px';
        title.style.marginBottom = '20px';
        title.style.textShadow = '0 0 10px #00aaff';
        this.container.appendChild(title);

        // Mode buttons container
        const modesContainer = document.createElement('div');
        modesContainer.style.display = 'flex';
        modesContainer.style.gap = '30px';
        modesContainer.style.flexWrap = 'wrap';
        modesContainer.style.justifyContent = 'center';
        this.container.appendChild(modesContainer);

        // Mission Mode Card
        const missionCard = this.createModeCard(
            i18next.t('menu.missionMode'),
            i18next.t('menu.missionModeDesc'),
            '#00ffaa',
            () => this.onSelectMode({ mode: 'mission', startYear: 1957 })
        );
        modesContainer.appendChild(missionCard);

        // Sandbox Mode Card
        const sandboxCard = this.createModeCard(
            i18next.t('menu.sandboxMode'),
            i18next.t('menu.sandboxModeDesc'),
            '#ffaa00',
            () => this.onSelectMode({ mode: 'sandbox', startYear: 2100 })
        );
        modesContainer.appendChild(sandboxCard);

        // Back Button
        const backBtn = this.createButton(i18next.t('menu.back'), '#ffffff');
        backBtn.style.padding = '10px 20px';
        backBtn.style.fontSize = '18px';
        backBtn.style.marginTop = '20px';
        backBtn.onclick = () => this.onBack();
        this.container.appendChild(backBtn);
    }

    private cleanup() {
        this.container.innerHTML = '';
    }

    private createModeCard(title: string, description: string, color: string, onClick: () => void): HTMLDivElement {
        const card = document.createElement('div');
        card.style.width = '280px';
        card.style.padding = '25px';
        card.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        card.style.border = `2px solid ${color}`;
        card.style.borderRadius = '12px';
        card.style.cursor = 'pointer';
        card.style.transition = 'all 0.3s ease';
        card.style.backdropFilter = 'blur(5px)';

        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        titleEl.style.color = color;
        titleEl.style.fontSize = '22px';
        titleEl.style.margin = '0 0 15px 0';
        titleEl.style.textAlign = 'center';
        card.appendChild(titleEl);

        const descEl = document.createElement('p');
        descEl.textContent = description;
        descEl.style.color = '#cccccc';
        descEl.style.fontSize = '14px';
        descEl.style.lineHeight = '1.5';
        descEl.style.margin = '0';
        descEl.style.textAlign = 'center';
        card.appendChild(descEl);

        card.onmouseover = () => {
            card.style.backgroundColor = color;
            card.style.boxShadow = `0 0 20px ${color}`;
            titleEl.style.color = '#000';
            descEl.style.color = '#222';
        };

        card.onmouseout = () => {
            card.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
            card.style.boxShadow = 'none';
            titleEl.style.color = color;
            descEl.style.color = '#cccccc';
        };

        card.onclick = onClick;

        return card;
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
        btn.style.minWidth = '200px';
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
