import { SettingsPanel } from './SettingsPanel';
import { AuthMenu } from './AuthMenu';
import { MenuScene } from './MenuScene';
import { HomeScreen } from './screens/HomeScreen';
import { HubScreen } from './screens/HubScreen';

export class MainMenu {
    container: HTMLDivElement;
    onStartGame: (state?: any) => void;
    onOpenHangar: () => void;
    authMenu: AuthMenu;

    // Components
    private menuScene: MenuScene;
    private homeScreen: HomeScreen;
    private hubScreen: HubScreen;

    private currentScreen: 'home' | 'hub' = 'home';
    private buttonContainer: HTMLDivElement;

    constructor(onStartGame: (state?: any) => void, onOpenHangar: () => void) {
        this.onStartGame = onStartGame;
        this.onOpenHangar = onOpenHangar;

        // Initialize Auth Menu (Top Right)
        this.authMenu = new AuthMenu();

        this.container = document.createElement('div');
        this.container.id = 'main-menu';
        this.container.dataset.screen = this.currentScreen;
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.0)';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.justifyContent = 'center';
        this.container.style.alignItems = 'center';
        this.container.style.zIndex = '2000';
        this.container.style.fontFamily = "'Segoe UI', sans-serif";

        // Setup 3D Scene
        this.menuScene = new MenuScene();
        this.container.appendChild(this.menuScene.domElement);

        // Title
        const title = document.createElement('h1');
        title.innerHTML = '<span style="color: #00aaff">A</span>rtificial <span style="color: #00aaff">I</span>ntelligence <span style="color: #00aaff">E</span>xpedition';
        title.style.color = '#ffffff';
        title.style.fontSize = '48px';
        title.style.margin = '0';
        title.style.marginBottom = '5px';
        title.style.textShadow = '0 0 10px #00aaff';
        title.style.zIndex = '1';
        this.container.appendChild(title);

        // Alpha Badge
        const alphaBadge = document.createElement('div');
        alphaBadge.textContent = 'ALPHA VERSION 0.1';
        alphaBadge.style.color = '#ffaa00';
        alphaBadge.style.fontSize = '16px';
        alphaBadge.style.letterSpacing = '4px';
        alphaBadge.style.marginBottom = '40px';
        alphaBadge.style.opacity = '0.8';
        alphaBadge.style.zIndex = '1';
        this.container.appendChild(alphaBadge);

        // Buttons Container (managed by screens)
        this.buttonContainer = document.createElement('div');
        this.buttonContainer.style.zIndex = '1';
        this.container.appendChild(this.buttonContainer);

        // Initialize Screen Controllers
        this.homeScreen = new HomeScreen(
            () => this.handleNewGame(),
            () => this.handleLoadGame(),
            () => this.openSettings()
        );

        this.hubScreen = new HubScreen(
            (state) => this.onStartGame(state),
            () => this.onOpenHangar(),
            () => { /* Chronology handled inside HubScreen currently or we can delegate here if needed */ },
            () => this.setScreen('home')
        );

        // Initial render
        this.setScreen('home');

        // Copyright Footer
        const copyright = document.createElement('div');
        copyright.innerHTML = '© 2025 Artificial Intelligence Expedition. All Rights Reserved.';
        copyright.style.position = 'absolute';
        copyright.style.bottom = '20px';
        copyright.style.color = '#666';
        copyright.style.fontSize = '14px';
        copyright.style.fontFamily = 'monospace';
        copyright.style.zIndex = '1';
        this.container.appendChild(copyright);

        document.body.appendChild(this.container);
    }

    private setScreen(screen: 'home' | 'hub') {
        this.currentScreen = screen;
        this.container.dataset.screen = screen;

        // Unmount current (simple clear for now)
        this.buttonContainer.innerHTML = '';

        if (screen === 'home') {
            this.homeScreen.mount(this.buttonContainer);
        } else {
            this.hubScreen.mount(this.buttonContainer);
        }
    }

    private handleNewGame() {
        this.hubScreen.setPendingState({ newGame: true });
        this.setScreen('hub');
    }

    private async handleLoadGame() {
        const { SaveSlotSelector } = await import('./SaveSlotSelector');
        // Hack: loadBtn reference is lost in this abstraction layer if we don't pass it back
        // But HomeScreen handles the UI click. 
        // We can pass a callback that takes a 'setLoading' function?
        // For now simplifying:

        // We need to show "Loading..." on the button. 
        // Ideally HomeScreen exposes method `setLoading(true/false)`.
        // Let's implement basic loading flow without blocking button visual update for now, or assume quick load.
        // Actually the SaveSelector is async UI.

        const selector = new SaveSlotSelector('load', async (_slotId, slotData) => {
            try {
                const { NotificationManager } = await import('./NotificationManager');
                NotificationManager.show("Game Loaded! Ready to launch.", 'success');

                this.hubScreen.setPendingState(slotData);
                this.setScreen('hub');

            } catch (e: any) {
                console.error(e);
                const { NotificationManager } = await import('./NotificationManager');
                NotificationManager.show("Failed to load: " + e.message, 'error');
            }
        });
        await selector.show();
    }

    private openSettings() {
        const panel = new SettingsPanel(() => {
            panel.dispose();
        });
    }

    dispose() {
        this.menuScene.dispose();

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        if (this.authMenu.container && this.authMenu.container.parentNode) {
            this.authMenu.container.parentNode.removeChild(this.authMenu.container);
        }
    }
}
