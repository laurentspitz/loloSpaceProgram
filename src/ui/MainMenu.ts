import { SettingsPanel } from './SettingsPanel';
import { AuthMenu } from './AuthMenu';
import * as THREE from 'three';
import { Background } from '../rendering/Background';

export class MainMenu {
    container: HTMLDivElement;
    onStartGame: (state?: any) => void;
    onOpenHangar: () => void;
    authMenu: AuthMenu;

    // Background Three.js
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer;
    private animationId: number | null = null;

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
        // Transparent background to show stars
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.0)';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.justifyContent = 'center';
        this.container.style.alignItems = 'center';
        this.container.style.zIndex = '2000';
        this.container.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

        // Setup 3D Background
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000508);

        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;
        const frustumSize = 1000;

        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            2000
        );
        this.camera.position.z = 1000;

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

        // Add canvas to container at the bottom
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '-1';
        this.container.appendChild(this.renderer.domElement);

        this.initBackground();

        // Title
        const title = document.createElement('h1');
        // A.I.E highlighted
        title.innerHTML = '<span style="color: #00aaff">A</span>rtificial <span style="color: #00aaff">I</span>ntelligence <span style="color: #00aaff">E</span>xpedition';
        title.style.color = '#ffffff';
        title.style.fontSize = '48px';
        title.style.margin = '0'; // Adjusted for layout
        title.style.marginBottom = '5px';
        title.style.textShadow = '0 0 10px #00aaff';
        title.style.zIndex = '1'; // Ensure on top of canvas
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

        // Buttons Container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '20px';
        buttonContainer.style.zIndex = '1';
        this.container.appendChild(buttonContainer);

        // Solar System Button
        const solarSystemBtn = this.createButton('🚀 Solar System (Play)', '#00aaff');
        solarSystemBtn.onclick = () => this.onStartGame();
        buttonContainer.appendChild(solarSystemBtn);

        // Build Rocket Button
        const hangarBtn = this.createButton('🛠️ Build Rocket (Hangar)', '#ffaa00');
        hangarBtn.onclick = () => this.onOpenHangar();
        buttonContainer.appendChild(hangarBtn);

        // Load Game Button
        const loadBtn = this.createButton('📂 Load Game', '#FF9800');
        loadBtn.onclick = () => this.handleLoadGame(loadBtn);
        buttonContainer.appendChild(loadBtn);

        // Settings Button
        const settingsBtn = this.createButton('⚙️ Settings', '#aaaaaa');
        settingsBtn.onclick = () => this.openSettings();
        buttonContainer.appendChild(settingsBtn);

        // Copyright Footer
        const copyright = document.createElement('div');
        copyright.innerHTML = '© 2025 Artificial Intelligence Expedition. All Rights Reserved.';
        copyright.style.position = 'absolute';
        copyright.style.bottom = '20px';
        copyright.style.color = '#666'; // Subtle gray
        copyright.style.fontSize = '14px';
        copyright.style.fontFamily = 'monospace';
        copyright.style.zIndex = '1';
        this.container.appendChild(copyright);

        document.body.appendChild(this.container);

        // Resize handler
        window.addEventListener('resize', this.onResize);

        // Start Loop
        this.animate();
    }

    private initBackground() {
        const bg = Background.createBackground();
        this.scene.add(bg);
    }

    private onResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer.setSize(width, height);

        const aspect = width / height;
        const frustumSize = 1000;
        this.camera.left = frustumSize * aspect / -2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / -2;
        this.camera.updateProjectionMatrix();
    };

    private animate = () => {
        this.animationId = requestAnimationFrame(this.animate);
        // Slowly rotate or move camera if desired, for now static
        // this.scene.rotation.z += 0.0001; 
        this.renderer.render(this.scene, this.camera);
    };

    private async handleLoadGame(btn?: HTMLButtonElement) {
        // Show save slot selector in load mode
        const { SaveSlotSelector } = await import('./SaveSlotSelector');
        const selector = new SaveSlotSelector('load', async (_slotId, slotData) => {
            if (btn) {
                btn.disabled = true;
                btn.textContent = "📂 Loading...";
            }

            try {
                this.onStartGame(slotData);
                const { NotificationManager } = await import('./NotificationManager');
                NotificationManager.show("Game Loaded!", 'success');
            } catch (e: any) {
                console.error(e);
                const { NotificationManager } = await import('./NotificationManager');
                NotificationManager.show("Failed to load: " + e.message, 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = "📂 Load Game";
                }
            }
        });

        await selector.show();
    }

    private openSettings() {
        const panel = new SettingsPanel(() => {
            panel.dispose();
        });
    }

    private createButton(text: string, color: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.innerHTML = text; // Use innerHTML to support emoji if needed, though textContent works
        btn.style.padding = '15px 30px';
        btn.style.fontSize = '24px';
        btn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent for legibility over stars
        btn.style.color = color;
        btn.style.border = `2px solid ${color}`;
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.3s ease';
        btn.style.minWidth = '300px';
        btn.style.backdropFilter = 'blur(5px)'; // Blur effect behind button

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

    dispose() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        window.removeEventListener('resize', this.onResize);

        if (this.renderer) {
            this.renderer.dispose();
        }

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        if (this.authMenu.container && this.authMenu.container.parentNode) {
            this.authMenu.container.parentNode.removeChild(this.authMenu.container);
        }
    }
}
