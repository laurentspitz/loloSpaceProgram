import * as THREE from 'three';
import { Background } from '../rendering/Background';

export class MenuScene {
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer;
    private animationId: number | null = null;

    public domElement: HTMLCanvasElement;

    constructor() {
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

        this.domElement = this.renderer.domElement;
        this.domElement.style.position = 'absolute';
        this.domElement.style.top = '0';
        this.domElement.style.left = '0';
        this.domElement.style.zIndex = '-1';

        this.initBackground();

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
        this.renderer.render(this.scene, this.camera);
    };

    dispose() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        window.removeEventListener('resize', this.onResize);

        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}
