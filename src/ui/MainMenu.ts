/**
 * MainMenu - Handles the start screen UI
 */
export class MainMenu {
    container: HTMLDivElement;
    onStartGame: () => void;
    onOpenHangar: () => void;

    constructor(onStartGame: () => void, onOpenHangar: () => void) {
        this.onStartGame = onStartGame;
        this.onOpenHangar = onOpenHangar;

        this.container = document.createElement('div');
        this.container.id = 'main-menu';
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.justifyContent = 'center';
        this.container.style.alignItems = 'center';
        this.container.style.zIndex = '2000';
        this.container.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

        // Title
        const title = document.createElement('h1');
        title.textContent = 'Lolo Space Program';
        title.style.color = '#ffffff';
        title.style.fontSize = '48px';
        title.style.marginBottom = '40px';
        title.style.textShadow = '0 0 10px #00aaff';
        this.container.appendChild(title);

        // Buttons Container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '20px';
        this.container.appendChild(buttonContainer);

        // Solar System Button
        const solarSystemBtn = this.createButton('Solar System (Play)', '#00aaff');
        solarSystemBtn.onclick = () => this.onStartGame();
        buttonContainer.appendChild(solarSystemBtn);

        // Build Rocket Button
        const hangarBtn = this.createButton('Build Rocket (Hangar)', '#ffaa00');
        hangarBtn.onclick = () => this.onOpenHangar();
        buttonContainer.appendChild(hangarBtn);

        document.body.appendChild(this.container);
    }

    private createButton(text: string, color: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.padding = '15px 30px';
        btn.style.fontSize = '24px';
        btn.style.backgroundColor = 'transparent';
        btn.style.color = color;
        btn.style.border = `2px solid ${color}`;
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.3s ease';
        btn.style.minWidth = '300px';

        btn.onmouseover = () => {
            btn.style.backgroundColor = color;
            btn.style.color = '#000';
            btn.style.boxShadow = `0 0 15px ${color}`;
        };

        btn.onmouseout = () => {
            btn.style.backgroundColor = 'transparent';
            btn.style.color = color;
            btn.style.boxShadow = 'none';
        };

        return btn;
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
