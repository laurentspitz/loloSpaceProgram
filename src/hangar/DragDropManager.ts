import * as THREE from 'three';
import { HangarScene } from './HangarScene';
import { RocketAssembly } from './RocketAssembly';
import { PartRegistry } from './PartRegistry';
import { Vector2 } from '../core/Vector2';

export class DragDropManager {
    scene: HangarScene;
    assembly: RocketAssembly;

    draggedPartId: string | null = null; // ID of part being dragged (from palette)
    draggedInstanceId: string | null = null; // Instance ID if dragging existing part

    dragGhost: THREE.Group | null = null;

    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Z=0 plane

    onPartPlaced: () => void;
    isOverTrash: (x: number, y: number) => boolean;

    constructor(scene: HangarScene, assembly: RocketAssembly, onPartPlaced: () => void, isOverTrash: (x: number, y: number) => boolean) {
        this.scene = scene;
        this.assembly = assembly;
        this.onPartPlaced = onPartPlaced;
        this.isOverTrash = isOverTrash;

        // Event Listeners
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
        window.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('keydown', this.onKeyDown);
    }

    startDraggingNewPart(partId: string) {
        this.draggedPartId = partId;
        this.createGhost(partId);

        // Immediately set position to mouse
        if (this.dragGhost) {
            this.dragGhost.position.set(this.mouse.x * 10, this.mouse.y * 10, 0);
            const target = new THREE.Vector3();
            this.raycaster.setFromCamera(this.mouse, this.scene.camera);
            this.raycaster.ray.intersectPlane(this.plane, target);
            this.dragGhost.position.copy(target);
        }
    }

    private createGhost(partId: string) {
        if (this.dragGhost) {
            this.scene.scene.remove(this.dragGhost);
        }

        const def = PartRegistry.get(partId);
        if (!def) return;

        const texture = new THREE.TextureLoader().load(def.texture);
        const geometry = new THREE.PlaneGeometry(def.width, def.height);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        this.dragGhost = new THREE.Group();
        this.dragGhost.add(new THREE.Mesh(geometry, material));

        // Add Connection Nodes to Ghost
        def.nodes.forEach(node => {
            const nodeGeometry = new THREE.CircleGeometry(0.15, 16);
            const nodeMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.8
            });
            const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
            nodeMesh.position.set(node.position.x, node.position.y, 0.1); // Slightly in front
            this.dragGhost!.add(nodeMesh);
        });

        this.scene.scene.add(this.dragGhost);
    }

    private onMouseMove = (event: MouseEvent) => {
        // Update mouse position regardless of dragging
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (!this.dragGhost) return;

        // Raycast to Z=0 plane
        this.raycaster.setFromCamera(this.mouse, this.scene.camera);
        const target = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.plane, target);

        // Update ghost position
        this.dragGhost.position.copy(target);

        // Check for snapping
        const snapPos = this.findSnapPosition(target);
        if (snapPos) {
            this.dragGhost.position.set(snapPos.x, snapPos.y, 0);
        }
    }

    private onMouseUp = (event: MouseEvent) => {
        if (this.dragGhost && this.draggedPartId) {
            // Check if dropped on trash OR on any other UI element
            // If we drop on the palette or a dialog, we cancel/delete
            const isOverUI = event.target !== this.scene.renderer.domElement;

            if (this.isOverTrash(event.clientX, event.clientY) || isOverUI) {
                // Delete (just remove ghost)
                this.scene.scene.remove(this.dragGhost);
                this.dragGhost = null;
                this.draggedPartId = null;
                this.onPartPlaced(); // Update stats
                return;
            }

            // Place the part
            const position = new Vector2(this.dragGhost.position.x, this.dragGhost.position.y);
            this.assembly.addPart(this.draggedPartId, position);

            // Cleanup
            this.scene.scene.remove(this.dragGhost);
            this.dragGhost = null;
            this.draggedPartId = null;

            this.onPartPlaced();
        }
    }

    private onMouseDown = (event: MouseEvent) => {
        // Only allow picking up if not already dragging
        if (this.draggedPartId) return;

        // Update mouse for raycasting
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.scene.camera);

        // CRITICAL FIX: Ignore clicks on UI elements (only interact with canvas)
        if (event.target !== this.scene.renderer.domElement) {
            return;
        }

        // Check if we clicked a part
        const clickedInstanceId = this.scene.getPartAt(this.raycaster);

        if (clickedInstanceId) {
            // Find the part definition
            const part = this.assembly.parts.find(p => p.instanceId === clickedInstanceId);
            if (part) {
                // Remove from assembly
                this.assembly.removePart(clickedInstanceId);

                // Start dragging it again
                this.startDraggingNewPart(part.partId);

                // Fix visual glitch: immediately move ghost to current mouse position
                if (this.dragGhost) {
                    this.dragGhost.position.set(this.mouse.x * 10, this.mouse.y * 10, 0); // Approximate world pos
                    // Better: reuse the raycast logic to set exact position
                    const target = new THREE.Vector3();
                    this.raycaster.ray.intersectPlane(this.plane, target);
                    this.dragGhost.position.copy(target);
                }

                // Notify UI to update stats (since we removed a part)
                this.onPartPlaced();
            }
        }
    }

    private onKeyDown = (event: KeyboardEvent) => {
        if ((event.key === 'Delete' || event.key === 'Backspace') && this.draggedPartId && this.dragGhost) {
            // Cancel drag and remove ghost
            this.scene.scene.remove(this.dragGhost);
            this.dragGhost = null;
            this.draggedPartId = null;

            // Stats are already updated because we removed the part from assembly when picking it up
        }
    }

    private findSnapPosition(currentPos: THREE.Vector3): Vector2 | null {
        // Simple snapping logic: check distance to nodes of existing parts
        const SNAP_DISTANCE = 0.5;
        let bestDist = SNAP_DISTANCE;
        let bestPos: Vector2 | null = null;

        const draggedDef = PartRegistry.get(this.draggedPartId!);
        if (!draggedDef) return null;

        this.assembly.parts.forEach(placedPart => {
            const placedDef = PartRegistry.get(placedPart.partId);
            if (!placedDef) return;

            // Check all connections between placed part and dragged part
            placedDef.nodes.forEach(placedNode => {
                // World position of the node on the placed part
                const placedNodePos = placedPart.position.add(placedNode.position);

                draggedDef.nodes.forEach(draggedNode => {
                    // Where the dragged part WOULD be if we snapped these nodes
                    // draggedPartPos = placedNodePos - draggedNodePos
                    const potentialPos = placedNodePos.sub(draggedNode.position);

                    // Check distance to cursor
                    const dist = new Vector2(currentPos.x, currentPos.y).distanceTo(potentialPos);

                    if (dist < bestDist) {
                        // Check compatibility (e.g. top connects to bottom)
                        if (this.areNodesCompatible(placedNode.type, draggedNode.type)) {
                            bestDist = dist;
                            bestPos = potentialPos;
                        }
                    }
                });
            });
        });

        return bestPos;
    }

    private areNodesCompatible(typeA: string, typeB: string): boolean {
        // Simple rule: Top connects to Bottom
        return (typeA === 'top' && typeB === 'bottom') ||
            (typeA === 'bottom' && typeB === 'top');
    }

    dispose() {
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('mousedown', this.onMouseDown);
    }
}
