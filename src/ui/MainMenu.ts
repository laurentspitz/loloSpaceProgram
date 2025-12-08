import { SettingsPanel } from './SettingsPanel';
import { AuthMenu } from './AuthMenu';
import { FirebaseService } from '../services/firebase';
import { NotificationManager } from './NotificationManager';

export class MainMenu {
    container: HTMLDivElement;
    onStartGame: (state?: any) => void;
    onOpenHangar: () => void;
    authMenu: AuthMenu;

    constructor(onStartGame: (state?: any) => void, onOpenHangar: () => void) {
        this.onStartGame = onStartGame;
        this.onOpenHangar = onOpenHangar;

        // Initialize Auth Menu (Top Right)
        this.authMenu = new AuthMenu();

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

        // --- Load Section ---
        const saveLoadContainer = document.createElement('div');
        saveLoadContainer.style.display = 'flex';
        saveLoadContainer.style.gap = '10px';
        saveLoadContainer.style.justifyContent = 'center';
        saveLoadContainer.style.marginTop = '10px';

        const loadBtn = this.createButton('📂 Load Game', '#FF9800');
        loadBtn.style.minWidth = '300px';
        loadBtn.style.fontSize = '18px';
        loadBtn.onclick = () => this.handleLoadGame(loadBtn);
        saveLoadContainer.appendChild(loadBtn);

        buttonContainer.appendChild(saveLoadContainer);
        // ---------------------------

        // Settings Button
        const settingsBtn = this.createButton('Settings', '#aaaaaa');
        settingsBtn.onclick = () => this.openSettings();
        buttonContainer.appendChild(settingsBtn);

        document.body.appendChild(this.container);
    }

    private async handleSaveGame() {
        if (!this.authMenu.user) {
            NotificationManager.show("Please login to save your game!", 'error');
            return;
        }

        const game = (window as any).game;
        if (!game || !game.rocket) {
            NotificationManager.show("No active game to save!", 'error');
            return;
        }

        try {
            const state = game.serializeState();
            if (state) {
                await FirebaseService.saveGame(this.authMenu.user.uid, 'quicksave', state);
                NotificationManager.show("Game Saved Successfully!", 'success');
            }
        } catch (e: any) {
            console.error(e);
            NotificationManager.show("Failed to save: " + e.message, 'error');
        }
    }

    private async handleLoadGame(btn?: HTMLButtonElement) {
        if (!this.authMenu.user) {
            NotificationManager.show("Please login to load your game!", 'error');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.textContent = "📂 Loading...";
        }

        try {
            const state = await FirebaseService.loadGame(this.authMenu.user.uid, 'quicksave');
            if (state) {
                this.onStartGame(state);
                NotificationManager.show("Game Loaded!", 'success');
            } else {
                NotificationManager.show("No save file found.", 'info');
            }
        } catch (e: any) {
            console.error(e);
            NotificationManager.show("Failed to load: " + e.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = "📂 Load Game";
            }
        }
    }

    private openSettings() {
        const panel = new SettingsPanel(() => {
            panel.dispose();
        });
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
        // Don't dispose auth menu completely as we might want persistence across scenes?
        // Or re-create it. Let's start fresh.
        if (this.authMenu.container && this.authMenu.container.parentNode) {
            this.authMenu.container.parentNode.removeChild(this.authMenu.container);
        }
    }
}
