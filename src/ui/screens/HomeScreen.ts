import i18next from '../../services/i18n';

export class HomeScreen {
    container: HTMLDivElement;
    onNewGame: () => void;
    onLoadGame: () => void;
    onOpenSettings: () => void;
    private languageChangeListener: (() => void) | null = null;

    constructor(
        onNewGame: () => void,
        onLoadGame: () => void,
        onOpenSettings: () => void
    ) {
        this.onNewGame = onNewGame;
        this.onLoadGame = onLoadGame;
        this.onOpenSettings = onOpenSettings;

        this.container = document.createElement('div');
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '20px';
        this.container.style.zIndex = '1';
    }

    mount(parent: HTMLElement) {
        this.cleanup(); // Ensure clean start
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
        this.container.innerHTML = ''; // Basic clear

        // New Game Button
        const newGameBtn = this.createButton(i18next.t('menu.newGame'), '#00ffaa');
        newGameBtn.onclick = () => this.onNewGame();
        this.container.appendChild(newGameBtn);

        // Load Game Button
        const loadBtn = this.createButton(i18next.t('menu.loadGame'), '#FF9800');
        loadBtn.onclick = () => this.onLoadGame();
        this.container.appendChild(loadBtn);

        // Settings Button
        const settingsBtn = this.createButton(i18next.t('menu.settings'), '#aaaaaa');
        settingsBtn.onclick = () => this.onOpenSettings();
        this.container.appendChild(settingsBtn);

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
