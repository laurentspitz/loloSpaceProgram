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
    private currentState: AppState = AppState.MENU;
    private menu: MainMenu | null = null;
    private game: Game | null = null;
    private hangar: Hangar | null = null;
    private assembly: any = null; // Store assembly from Hangar

    constructor() {
        this.showMenu();

        // Listen for navigation events from Hangar
        window.addEventListener('navigate-menu', () => {
            this.showMenu();
        });

        window.addEventListener('launch-game', (e: any) => {
            console.log('Launching with assembly:', e.detail.assembly);
            this.assembly = e.detail.assembly; // Store assembly
            this.startGame();
        });
    }

    showMenu() {
        // Clean up current state
        if (this.game) {
            this.game.dispose();
            this.game = null;
        }
        if (this.hangar) {
            this.hangar.dispose();
            this.hangar = null;
        }

        this.currentState = AppState.MENU;
        this.menu = new MainMenu(
            () => this.startGame(),
            () => this.startHangar()
        );
    }

    startGame() {
        // Clean up current state
        if (this.menu) {
            this.menu.dispose();
            this.menu = null;
        }
        if (this.hangar) {
            this.hangar.dispose();
            this.hangar = null;
        }

        this.currentState = AppState.GAME;
        console.log('Starting game...');
        this.game = new Game(this.assembly);

        // Expose game to window for debugging and orbit teleport feature
        (window as any).game = this.game;

        this.assembly = null; // Clear after use
    }

    startHangar() {
        // Clean up current state
        if (this.menu) {
            this.menu.dispose();
            this.menu = null;
        }
        if (this.game) {
            // Game cleanup if needed
            this.game = null;
        }

        this.currentState = AppState.HANGAR;
        this.hangar = new Hangar();
    }
}
