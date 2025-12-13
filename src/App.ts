import { Game } from './Game';
import { MainMenu } from './ui/MainMenu';
import { Hangar, createHangar } from './Hangar';
import { GameTimeManager } from './managers/GameTimeManager';
import { GAME_START_YEAR } from './config';

/**
 * App - Main entry point and state manager
 */
export class App {
    private menu: MainMenu | null = null;
    private game: Game | null = null;
    private hangar: Hangar | null = null;
    private assembly: any = null; // Store assembly from Hangar

    // Persistent Game Time (Seconds elapsed since 1957)
    public currentGameTime: number = 0;

    constructor() {
        (window as any).app = this; // Expose for UI access
        this.showMenu();

        // Listen for navigation events from Hangar
        window.addEventListener('navigate-menu', () => {
            this.showMenu('hub');
        });

        window.addEventListener('launch-game', (e: any) => {
            console.log('Launching with assembly:', e.detail.assembly);
            this.assembly = e.detail.assembly; // Store assembly
            this.startGame();
        });
    }

    showMenu(initialScreen: 'home' | 'hub' = 'home') {
        this.cleanup();
        this.menu = new MainMenu(
            (state) => this.startGame(state),  // FIX: Accept and pass state parameter
            () => this.showHangar(),
            initialScreen
        );
    }



    startGame(state?: any) {
        this.cleanup();

        // Reset time if New Game requested
        if (state && state.newGame) {
            // Use startYear from game mode selection, default to 1957 for mission mode
            const startYear = state.startYear || GAME_START_YEAR;
            this.currentGameTime = GameTimeManager.getSecondsFromYear(startYear);
            console.log(`[App] Starting new game in year ${startYear}, elapsed time: ${this.currentGameTime}s`);
        }

        console.log('Starting game...');
        this.game = new Game(this.assembly);

        // Initialize with persistent time
        this.game.elapsedGameTime = this.currentGameTime;

        // Set game mode if provided (for new games)
        if (state && state.gameMode) {
            this.game.gameMode = state.gameMode;
        }

        if (state && !state.newGame) {
            this.game.deserializeState(state);
            // If state had time, we trusting deserializeState to overwrite or we should sync?
            // Usually deserializeState sets elapsedGameTime.
            // Let's ensure we track it back.
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
            // BACKUP TIME from Game before destroying
            this.currentGameTime = this.game.elapsedGameTime;
            console.log('[App] Saved game time:', this.currentGameTime, 'Year:', new Date(GAME_START_YEAR, 0, 1).getFullYear() + Math.floor(this.currentGameTime / 31536000)); // Approx year check

            if (typeof this.game.dispose === 'function') {
                this.game.dispose();
            }
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

        this.hangar = await createHangar(() => this.currentGameTime);
    }
}
