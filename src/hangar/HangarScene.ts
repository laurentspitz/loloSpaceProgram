import * as THREE from 'three';
import { RocketAssembly, type PlacedPart } from './RocketAssembly';
import { PartRegistry } from './PartRegistry';
import { RocketRenderer } from '../rendering/RocketRenderer';

export class HangarScene {
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    assembly: RocketAssembly;

    public partMeshes: Map<string, THREE.Group> = new Map();
    public selectedInstanceIds: Set<string> = new Set();
    private textureLoader = new THREE.TextureLoader();

    // Center of Gravity visualization
    public showCoG: boolean = false;
    private cogMarker: THREE.Group | null = null;

    private selectionBox: HTMLDivElement;

    constructor(container: HTMLElement, assembly: RocketAssembly) {
        this.assembly = assembly;

        // Setup Selection Box (HTML Overlay)
        this.selectionBox = document.createElement('div');
        this.selectionBox.style.position = 'absolute';
        this.selectionBox.style.border = '2px solid rgba(255, 255, 0, 0.8)';
        this.selectionBox.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
        this.selectionBox.style.pointerEvents = 'none'; // Click-through
        this.selectionBox.style.display = 'none';
        this.selectionBox.style.zIndex = '1000'; // On top of canvas
        container.appendChild(this.selectionBox);

        // ... rest of constructor ...
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

    updateSelectionBox(rect: { x: number, y: number, w: number, h: number } | null) {
        if (rect) {
            this.selectionBox.style.display = 'block';
            this.selectionBox.style.left = `${rect.x}px`;
            this.selectionBox.style.top = `${rect.y}px`;
            this.selectionBox.style.width = `${rect.w}px`;
            this.selectionBox.style.height = `${rect.h}px`;
        } else {
            this.selectionBox.style.display = 'none';
        }
    }

    selectPartsInScreenRect(minX: number, minY: number, maxX: number, maxY: number, additive: boolean) {
        if (!additive) {
            this.selectedInstanceIds.clear();
        }

        const widthHalf = this.renderer.domElement.width / 2;
        const heightHalf = this.renderer.domElement.height / 2;

        this.assembly.parts.forEach(part => {
            const mesh = this.partMeshes.get(part.instanceId);
            if (!mesh) return;

            // Project World Pos to Screen Pos
            const pos = new THREE.Vector3(part.position.x, part.position.y, 0);
            pos.project(this.camera); // Now in [-1, 1] NDC

            const screenX = (pos.x * widthHalf) + widthHalf;
            const screenY = -(pos.y * heightHalf) + heightHalf;

            // Simple point inclusion (center of part)
            // Could improve by projecting AABB corners if needed.
            if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
                this.selectedInstanceIds.add(part.instanceId);
            }
        });
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
            // Update position
            mesh.position.set(part.position.x, part.position.y, 0);
            mesh.rotation.z = part.rotation;
            // Handle Mirroring
            mesh.scale.set(part.flipped ? -1 : 1, 1, 1);

            // Add Radial Node visual offset if needed?
            // Radial Node Z offset logic is inside DragDropManager ghost creation?
            // HangarScene usually doesn't handle radial node z offset except implicit order.
            // Let's stick to scale/pos/rot.

            // Update Selection Highlight
            const isSelected = this.selectedInstanceIds.has(part.instanceId);
            let highlight = mesh.getObjectByName('selection_highlight');

            if (isSelected) {
                if (!highlight) {
                    const def = PartRegistry.get(part.partId);
                    if (def) {
                        const w = def.width; // Add padding? maybe slightly larger
                        const h = def.height;
                        const geo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(w + 0.1, h + 0.1));
                        const mat = new THREE.LineBasicMaterial({ color: 0xffff00 });
                        highlight = new THREE.LineSegments(geo, mat);
                        highlight.name = 'selection_highlight';
                        highlight.position.z = 0.2; // Above everything
                        mesh.add(highlight);
                    }
                }
            } else {
                if (highlight) {
                    mesh.remove(highlight);
                }
            }
        });

        // Update Center of Gravity marker
        if (this.showCoG && this.assembly.parts.length > 0) {
            if (!this.cogMarker) {
                this.cogMarker = RocketRenderer.createCoGMarker();
                this.scene.add(this.cogMarker);
            }

            // Calculate CoG from assembly
            let totalMass = 0;
            let weightedX = 0;
            let weightedY = 0;

            this.assembly.parts.forEach(part => {
                const def = PartRegistry.get(part.partId);
                if (def) {
                    const m = def.stats.mass + (def.stats.fuel || 0);
                    totalMass += m;
                    weightedX += part.position.x * m;
                    weightedY += part.position.y * m;
                }
            });

            if (totalMass > 0) {
                const cogX = weightedX / totalMass;
                const cogY = weightedY / totalMass;
                this.cogMarker.position.set(cogX, cogY, 1); // z=1 on top
                this.cogMarker.rotation.z = 0; // No rotation needed
                this.cogMarker.visible = true;
            } else {
                this.cogMarker.visible = false;
            }
        } else if (this.cogMarker) {
            this.cogMarker.visible = false;
        }
    }

    private createPartMesh(part: PlacedPart): THREE.Group {
        const def = PartRegistry.get(part.partId);
        if (!def) return new THREE.Group();

        const group = new THREE.Group();

        // Special handling for fairings - render two halves
        if (def.type === 'fairing' && def.visual?.textureLeft && def.visual?.textureRight) {
            // Left half
            const textureLeft = this.textureLoader.load(def.visual.textureLeft);
            const geometryLeft = new THREE.PlaneGeometry(def.width / 2, def.height);
            const materialLeft = new THREE.MeshBasicMaterial({
                map: textureLeft,
                transparent: true,
                side: THREE.DoubleSide
            });
            const meshLeft = new THREE.Mesh(geometryLeft, materialLeft);
            meshLeft.position.x = -def.width / 4; // Offset to left
            group.add(meshLeft);

            // Right half
            const textureRight = this.textureLoader.load(def.visual.textureRight);
            const geometryRight = new THREE.PlaneGeometry(def.width / 2, def.height);
            const materialRight = new THREE.MeshBasicMaterial({
                map: textureRight,
                transparent: true,
                side: THREE.DoubleSide
            });
            const meshRight = new THREE.Mesh(geometryRight, materialRight);
            meshRight.position.x = def.width / 4; // Offset to right
            group.add(meshRight);
        } else {
            // Standard single texture
            const texture = this.textureLoader.load(def.texture);
            const geometry = new THREE.PlaneGeometry(def.width, def.height);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geometry, material);
            group.add(mesh);
        }

        // Add Connection Nodes (Skip visuals for Radial Node as it has a custom texture)
        if (def.id !== 'radial_node') {
            def.nodes.forEach(node => {
                const nodeGeometry = new THREE.CircleGeometry(0.15, 16);
                const nodeMaterial = new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.8
                });
                const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
                nodeMesh.position.set(node.position.x, node.position.y, 0.1); // Slightly in front

                // Add direction indicator (Yellow line)
                const dir = new THREE.Vector3(node.direction.x, node.direction.y, 0).normalize().multiplyScalar(0.4);
                const lineGeo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(0, 0, 0),
                    dir
                ]);
                const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00 });
                const line = new THREE.Line(lineGeo, lineMat);
                // Lift line slightly above circle to avoid z-fighting
                line.position.z = 0.01;
                nodeMesh.add(line);

                group.add(nodeMesh);
            });
        }

        return group;
    }

    getPartAt(raycaster: THREE.Raycaster): string | null {
        // Create an array of all meshes to test
        const meshes: THREE.Object3D[] = [];
        this.partMeshes.forEach(group => meshes.push(group));

        // Raycast (recursive to hit children of groups)
        const intersects = raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            // Heuristic: Sort by object size (smallest first)
            // This helps with "transparent click-through" issues where a large part's quad covers a small part.
            intersects.sort((a, b) => {
                const getArea = (obj: THREE.Object3D) => {
                    if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.PlaneGeometry) {
                        return obj.geometry.parameters.width * obj.geometry.parameters.height;
                    }
                    return parseFloat('Infinity');
                };
                return getArea(a.object) - getArea(b.object);
            });

            // Iterate through sorted hits
            for (const hit of intersects) {
                let hitObject = hit.object;
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
