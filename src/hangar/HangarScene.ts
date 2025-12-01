import * as THREE from 'three';
import { RocketAssembly, type PlacedPart } from './RocketAssembly';
import { PartRegistry } from './PartRegistry';

export class HangarScene {
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    assembly: RocketAssembly;

    private partMeshes: Map<string, THREE.Group> = new Map();
    private textureLoader = new THREE.TextureLoader();

    constructor(container: HTMLElement, assembly: RocketAssembly) {
        this.assembly = assembly;

        // Setup Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a); // Dark grey background

        // Setup Camera (Orthographic for 2D feel)
        const aspect = container.clientWidth / container.clientHeight;
        const frustumSize = 20;
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        this.camera.position.z = 10;

        // Setup Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        // Add Grid
        const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
        gridHelper.rotation.x = Math.PI / 2; // Rotate to face camera
        this.scene.add(gridHelper);

        // Add Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(5, 5, 10);
        this.scene.add(dirLight);

        // Handle Resize
        window.addEventListener('resize', () => {
            const newAspect = container.clientWidth / container.clientHeight;
            this.camera.left = -frustumSize * newAspect / 2;
            this.camera.right = frustumSize * newAspect / 2;
            this.camera.top = frustumSize / 2;
            this.camera.bottom = -frustumSize / 2;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        });

        this.animate();
    }

    update() {
        // Sync meshes with assembly
        const currentIds = new Set(this.assembly.parts.map(p => p.instanceId));

        // Remove deleted parts
        for (const [id, mesh] of this.partMeshes) {
            if (!currentIds.has(id)) {
                this.scene.remove(mesh);
                this.partMeshes.delete(id);
            }
        }

        // Add/Update parts
        this.assembly.parts.forEach(part => {
            let mesh = this.partMeshes.get(part.instanceId);
            if (!mesh) {
                mesh = this.createPartMesh(part);
                this.scene.add(mesh);
                this.partMeshes.set(part.instanceId, mesh);
            }

            // Update position
            mesh.position.set(part.position.x, part.position.y, 0);
            mesh.rotation.z = part.rotation;
        });
    }

    private createPartMesh(part: PlacedPart): THREE.Group {
        const def = PartRegistry.get(part.partId);
        if (!def) return new THREE.Group();

        const group = new THREE.Group();

        // Load texture
        const texture = this.textureLoader.load(def.texture);

        const geometry = new THREE.PlaneGeometry(def.width, def.height);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);

        // Add Connection Nodes
        def.nodes.forEach(node => {
            const nodeGeometry = new THREE.CircleGeometry(0.15, 16);
            const nodeMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.8
            });
            const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
            nodeMesh.position.set(node.position.x, node.position.y, 0.1); // Slightly in front
            group.add(nodeMesh);
        });

        return group;
    }

    getPartAt(raycaster: THREE.Raycaster): string | null {
        // Create an array of all meshes to test
        const meshes: THREE.Object3D[] = [];
        this.partMeshes.forEach(group => meshes.push(group));

        // Raycast (recursive to hit children of groups)
        const intersects = raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            // Find which group this mesh belongs to
            let hitObject = intersects[0].object;

            // Traverse up until we find the group in our map
            while (hitObject.parent) {
                for (const [id, group] of this.partMeshes) {
                    if (group === hitObject) {
                        return id;
                    }
                }
                hitObject = hitObject.parent;
            }
        }

        return null;
    }

    animate = () => {
        requestAnimationFrame(this.animate);
        this.update();
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.renderer.dispose();
        // Remove event listeners if any
    }
}
