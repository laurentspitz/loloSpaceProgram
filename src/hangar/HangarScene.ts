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

    // Zoom & Pan controls
    private minZoom = 0.5;
    private maxZoom = 4;
    private isPanning = false;
    private lastPanPos = new THREE.Vector2();

    // Touch controls
    private touchDistance: number | null = null;
    private touchPanStart = new THREE.Vector2();
    private touchMode: 'none' | 'pan' | 'zoom' = 'none';

    // Center of Gravity visualization
    public showCoG: boolean = false;
    private cogMarker: THREE.Group | null = null;

    // Hover highlight for staging panel
    private hoveredPartId: string | null = null;

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
        const frustumSize = 40; // Increased view area
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

        // Zoom & Input event listeners
        this.renderer.domElement.addEventListener('wheel', this.handleWheel, { passive: false });

        // Panning (Mouse)
        this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp);
        this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault()); // Disable context menu

        // Touch Events (Mobile)
        this.renderer.domElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.renderer.domElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.renderer.domElement.addEventListener('touchend', this.handleTouchEnd);

        // Add Grid (Larger)
        const gridHelper = new THREE.GridHelper(200, 200, 0x444444, 0x222222);
        gridHelper.rotation.x = Math.PI / 2; // Rotate to face camera
        this.scene.add(gridHelper);

        // Lights removed as MeshBasicMaterial doesn't need them and they might cause artifacts

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

    private handleWheel = (event: WheelEvent) => {
        event.preventDefault();

        const zoomSpeed = 0.001;
        const newZoom = this.camera.zoom - event.deltaY * zoomSpeed;
        this.setZoom(newZoom);
    }

    private setZoom(zoom: number) {
        this.camera.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        this.camera.updateProjectionMatrix();
    }

    // --- Mouse Panning ---

    private handleMouseDown = (event: MouseEvent) => {
        // Right Click (2) or Middle Click (1) for Panning
        if (event.button === 2 || event.button === 1) {
            this.isPanning = true;
            this.lastPanPos.set(event.clientX, event.clientY);
        }
    }

    private handleMouseMove = (event: MouseEvent) => {
        if (this.isPanning) {
            const currentX = event.clientX;
            const currentY = event.clientY;

            const deltaX = currentX - this.lastPanPos.x;
            const deltaY = currentY - this.lastPanPos.y;

            this.panCamera(deltaX, deltaY);

            this.lastPanPos.set(currentX, currentY);
        }
    }

    private handleMouseUp = (event: MouseEvent) => {
        if (event.button === 2 || event.button === 1) {
            this.isPanning = false;
        }
    }

    // --- Touch Logic (Pinch Zoom + Pan) ---

    private handleTouchStart = (event: TouchEvent) => {
        // If 2 fingers -> ZOOM
        if (event.touches.length === 2) {
            event.preventDefault(); // Prevent browser zoom
            this.touchMode = 'zoom';
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            this.touchDistance = Math.sqrt(dx * dx + dy * dy);
        }
        // If 1 finger -> PAN (Check if hitting part first?)
        else if (event.touches.length === 1) {
            // Check if we hit a part. If so, let DragDropManager handle it.
            // DragDropManager listens to events too, so we need to be careful not to conflict.
            // Simple approach: Raycast here. If part hit, do NOTHING (DragDrop will pick it up).
            // If NO part hit, assume Pan.

            const touch = event.touches[0];
            const rect = this.renderer.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((touch.clientX - rect.left) / rect.width) * 2 - 1,
                -((touch.clientY - rect.top) / rect.height) * 2 + 1
            );

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);
            const hit = this.getPartAt(raycaster);

            if (!hit) {
                // Background -> PAN
                event.preventDefault(); // Prevent scroll
                this.touchMode = 'pan';
                this.touchPanStart.set(touch.clientX, touch.clientY);
            } else {
                this.touchMode = 'none'; // Part -> DragDropManager
            }
        }
    }

    private handleTouchMove = (event: TouchEvent) => {
        if (this.touchMode === 'zoom' && event.touches.length === 2 && this.touchDistance !== null) {
            event.preventDefault();
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            const newDist = Math.sqrt(dx * dx + dy * dy);

            const delta = newDist - this.touchDistance;
            const zoomSensitivity = 0.005;

            // Zoom centered on previous LookAt? 
            // Simple zoom adjustment:
            const newZoom = this.camera.zoom + delta * zoomSensitivity;
            this.setZoom(newZoom);

            this.touchDistance = newDist;
        } else if (this.touchMode === 'pan' && event.touches.length === 1) {
            event.preventDefault();
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.touchPanStart.x;
            const deltaY = touch.clientY - this.touchPanStart.y;

            this.panCamera(deltaX, deltaY);

            this.touchPanStart.set(touch.clientX, touch.clientY);
        }
    }

    private handleTouchEnd = (event: TouchEvent) => {
        if (event.touches.length === 0) {
            this.touchMode = 'none';
            this.touchDistance = null;
        }
    }

    private panCamera(deltaX: number, deltaY: number) {
        // Convert screen delta to world delta
        // Frustum height at any zoom = (top - bottom) / zoom? 
        // OrthoCamera:
        // Visible Height = (camera.top - camera.bottom) / camera.zoom
        // Scale = Visible Height / Canvas Height

        const frustumHeight = (this.camera.top - this.camera.bottom) / this.camera.zoom;
        const scale = frustumHeight / this.renderer.domElement.clientHeight;

        const worldDeltaX = -deltaX * scale;
        const worldDeltaY = deltaY * scale; // Screen Y is down, World Y is up

        this.camera.position.x += worldDeltaX;
        this.camera.position.y += worldDeltaY;
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

        // Update hover highlight
        this.updateHoverHighlight();
    }

    /**
     * Set the hovered part ID (from staging panel)
     */
    highlightHoveredPart(instanceId: string | null): void {
        this.hoveredPartId = instanceId;
    }

    /**
     * Update hover highlight visualization
     */
    private updateHoverHighlight(): void {
        this.partMeshes.forEach((mesh, id) => {
            let hoverHighlight = mesh.getObjectByName('hover_highlight');

            if (id === this.hoveredPartId) {
                // Add glow effect if not present
                if (!hoverHighlight) {
                    const part = this.assembly.parts.find(p => p.instanceId === id);
                    if (part) {
                        const def = PartRegistry.get(part.partId);
                        if (def) {
                            // Create a glowing outline
                            const geo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(def.width + 0.2, def.height + 0.2));
                            const mat = new THREE.LineBasicMaterial({
                                color: 0x00ffff,  // Cyan glow
                                linewidth: 2
                            });
                            hoverHighlight = new THREE.LineSegments(geo, mat);
                            hoverHighlight.name = 'hover_highlight';
                            hoverHighlight.position.z = 0.3; // Above selection highlight
                            mesh.add(hoverHighlight);
                        }
                    }
                }
            } else {
                // Remove hover highlight if present
                if (hoverHighlight) {
                    mesh.remove(hoverHighlight);
                }
            }
        });
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
        this.renderer.domElement.removeEventListener('wheel', this.handleWheel);

        this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);

        this.renderer.domElement.removeEventListener('touchstart', this.handleTouchStart);
        this.renderer.domElement.removeEventListener('touchmove', this.handleTouchMove);
        this.renderer.domElement.removeEventListener('touchend', this.handleTouchEnd);

        this.renderer.dispose();
        // Remove event listeners if any
    }
}
