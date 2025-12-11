import { ThreeRenderer } from '../../rendering/ThreeRenderer';
import { Renderer } from '../../Renderer';
import { createCollapsiblePanel } from '../components/CollapsiblePanel';
import i18next from 'i18next';

export interface MissionControlsPanelOptions {
    renderer: Renderer | ThreeRenderer;
    onTimeWarpChange?: (factor: number) => void;
    getCurrentTimeWarp?: () => number;
    setTimeWarp?: (value: number) => void;
}

/**
 * Mission Controls Panel - game control buttons
 */
export class MissionControlsPanel {
    private container: HTMLDivElement | null = null;
    private contentContainer: HTMLElement | null = null;
    private renderer: Renderer | ThreeRenderer;
    private lastTimeWarp: number = 1;

    private getCurrentTimeWarp?: () => number;
    private setTimeWarp?: (value: number) => void;

    constructor(options: MissionControlsPanelOptions) {
        this.renderer = options.renderer;
        this.getCurrentTimeWarp = options.getCurrentTimeWarp;
        this.setTimeWarp = options.setTimeWarp;
        this.create();
    }

    private create(): void {
        const controlsContent = document.createElement('div');
        controlsContent.style.display = 'flex';
        controlsContent.style.flexDirection = 'column';
        controlsContent.style.gap = '5px';

        this.contentContainer = controlsContent;
        this.renderContent();

        const { container } = createCollapsiblePanel(i18next.t('ui.missionControls'), controlsContent, true, '200px');
        container.id = 'mission-controls-panel';
        container.style.position = 'absolute';
        container.style.top = '10px';
        container.style.left = '10px';

        document.body.appendChild(container);
        this.container = container;
    }

    private renderContent(): void {
        if (!this.contentContainer) return;
        this.contentContainer.innerHTML = '';

        const createBtn = (text: string, onClick: () => void, title?: string) => {
            const btn = document.createElement('button');
            btn.innerText = text;
            if (title) btn.title = title;
            btn.className = 'game-btn';
            btn.style.width = '100%';
            btn.onclick = onClick;
            return btn;
        };

        // Focus Rocket
        this.contentContainer.appendChild(createBtn(i18next.t('ui.focusRocket'), () => {
            if (this.renderer instanceof ThreeRenderer && this.renderer.currentRocket) {
                this.renderer.followedBody = this.renderer.currentRocket.body;
                this.renderer.autoZoomToBody(this.renderer.currentRocket.body);
            }
        }));

        // Trajectory Toggle
        const trajectoryBtn = createBtn(i18next.t('ui.trajectory'), () => {
            if (this.renderer instanceof ThreeRenderer) {
                this.renderer.showTrajectory = !this.renderer.showTrajectory;
                trajectoryBtn.style.backgroundColor = this.renderer.showTrajectory ? '#4a9eff' : '';
            }
        }, i18next.t('ui.toggleTrajectory'));
        this.contentContainer.appendChild(trajectoryBtn);

        // Reset Camera
        this.contentContainer.appendChild(createBtn(i18next.t('ui.resetCamera'), () => {
            if (this.renderer instanceof ThreeRenderer) {
                this.renderer.resetCamera();
            }
        }));

        // Settings
        this.contentContainer.appendChild(createBtn(i18next.t('ui.settings'), async () => {
            if (this.getCurrentTimeWarp && this.setTimeWarp) {
                this.lastTimeWarp = this.getCurrentTimeWarp();
                if (this.lastTimeWarp !== 0) {
                    this.setTimeWarp(0);
                }
            }
            const { SettingsPanel } = await import('../SettingsPanel');
            const panel = new SettingsPanel(() => {
                panel.dispose();
                if (this.setTimeWarp && this.lastTimeWarp > 0) {
                    this.setTimeWarp(this.lastTimeWarp);
                }
            });
        }));

        // Back to Menu
        this.contentContainer.appendChild(createBtn(i18next.t('menu.back'), async () => {
            window.dispatchEvent(new CustomEvent('navigate-menu'));
        }));

        // Hangar
        this.contentContainer.appendChild(createBtn(i18next.t('ui.hangar'), () => {
            if (confirm(i18next.t('ui.confirmHangar'))) {
                window.dispatchEvent(new CustomEvent('navigate-menu'));
            }
        }, i18next.t('ui.goToHangar')));

        // Chronology
        this.contentContainer.appendChild(createBtn(i18next.t('ui.chronology'), async () => {
            const { ChronologyMenu } = await import('../chronology');
            const { GameTimeManager } = await import('../../managers/GameTimeManager');
            const { GAME_START_YEAR } = await import('../../config');
            const game = (window as any).game;
            const currentYear = game?.elapsedGameTime ? GameTimeManager.getYear(game.elapsedGameTime) : GAME_START_YEAR;
            const missionManager = game?.missionManager;
            new ChronologyMenu(currentYear, missionManager, () => { });
        }, i18next.t('ui.viewHistory')));

        // Save Game
        const saveBtn = createBtn('💾 Save Game', async () => {
            const { FirebaseService } = await import('../../services/firebase');
            const { NotificationManager } = await import('../NotificationManager');
            const { SaveSlotSelector } = await import('../SaveSlotSelector');

            const user = FirebaseService.auth.currentUser;

            if (!user) {
                NotificationManager.show(i18next.t('ui.needLogin'), 'error');
                return;
            }

            const rocket = (this.renderer as any).currentRocket;
            if (!rocket || !(window as any).game) {
                NotificationManager.show(i18next.t('ui.noActiveGame'), 'error');
                return;
            }

            const selector = new SaveSlotSelector('save', async (slotId) => {
                saveBtn.disabled = true;
                const originalText = saveBtn.innerText;
                saveBtn.innerText = i18next.t('ui.saving');
                try {
                    const state = (window as any).game.serializeState();
                    const { SaveSlotManager } = await import('../../services/SaveSlotManager');
                    await SaveSlotManager.saveToSlot(slotId, state, user.uid);
                    NotificationManager.show(i18next.t('ui.saved'), 'success');
                } catch (e: any) {
                    NotificationManager.show(i18next.t('ui.saveFailed', { message: e.message }), 'error');
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.innerText = originalText;
                }
            });
            await selector.show();
        });
        this.contentContainer.appendChild(saveBtn);
    }

    updateTexts(): void {
        this.renderContent();
    }

    dispose(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
