import { Game } from './Game';
import { MainMenu } from './ui/MainMenu';
import { Hangar, createHangar } from './Hangar';

/**
 * App - Main entry point and state manager
 */
export class App {
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
        this.cleanup();
        this.menu = new MainMenu(
            (state) => this.startGame(state),  // FIX: Accept and pass state parameter
            () => this.showHangar()
        );
    }

    startGame(state?: any) {
        this.cleanup();

        console.log('Starting game...');
        this.game = new Game(this.assembly);

        if (state && !state.newGame) {
            this.game.deserializeState(state);
        }

        // Start the game loop after state is restored
        this.game.start();

        // Expose game to window for debugging and UI access
        (window as any).game = this.game;

        this.assembly = null; // Clear after use
    }

    cleanup() {
        if (this.menu) {
            this.menu.dispose();
            this.menu = null;
        }
        if (this.game) {
            // this.game.dispose(); // If Game has dispose, call it
            this.game = null;
        }
        (window as any).game = null; // Clear global reference

        if (this.hangar) {
            this.hangar.dispose();
            this.hangar = null;
        }
    }

    async showHangar() {
        console.log('App: Showing Hangar...');
        this.cleanup();

        // Ensure parts are loaded before showing Hangar
        const { PartRegistry } = await import('./hangar/PartRegistry');
        await PartRegistry.init();

        this.hangar = await createHangar();
    }
}
