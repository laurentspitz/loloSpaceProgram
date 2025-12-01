import { Game } from './Game';
import { MainMenu } from './ui/MainMenu';
import { Hangar } from './Hangar';

const AppState = {
    MENU: 0,
    GAME: 1,
    HANGAR: 2
} as const;

type AppState = typeof AppState[keyof typeof AppState];

/**
 * App - Main entry point and state manager
 */
export class App {
    state: AppState = AppState.MENU;

    // Components
    mainMenu: MainMenu | null = null;
    game: Game | null = null;
    hangar: Hangar | null = null;

    constructor() {
        this.showMenu();

        // Listen for navigation events from Hangar
        window.addEventListener('navigate-menu', () => {
            this.showMenu();
        });

        window.addEventListener('launch-game', (e: any) => {
            console.log('Launching with assembly:', e.detail.assembly);
            this.startGame();
        });
    }

    showMenu() {
        this.cleanup();
        this.state = AppState.MENU;
        this.mainMenu = new MainMenu(
            () => this.startGame(),
            () => this.openHangar()
        );
    }

    startGame() {
        this.cleanup();
        this.state = AppState.GAME;
        this.game = new Game();
    }

    openHangar() {
        this.cleanup();
        this.state = AppState.HANGAR;
        this.hangar = new Hangar();
    }

    cleanup() {
        if (this.mainMenu) {
            this.mainMenu.dispose();
            this.mainMenu = null;
        }
        if (this.game) {
            // Game doesn't have a dispose method yet, but we can at least stop the loop if we add one
            // For now, we just let it be garbage collected if possible, 
            // but ideally Game should have a cleanup method.
            // Since Game attaches to canvas, we might need to clear canvas or reset it.
            // But Game constructor creates a new ThreeRenderer which creates a new WebGLRenderer.
            // We should probably reuse the canvas or clear it.

            // For this iteration, we'll just hide the UI elements if any
            if (this.game.ui) {
                // UI elements are appended to body/container, need cleanup
                // TODO: Add dispose to Game and UI
            }
            this.game = null;
        }
        if (this.hangar) {
            this.hangar.dispose();
            this.hangar = null;
        }
    }
}
