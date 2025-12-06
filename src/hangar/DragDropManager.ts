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
            opacity: 0.8, // Increased for visibility
            side: THREE.DoubleSide
        });

        this.dragGhost = new THREE.Group();
        this.dragGhost.add(new THREE.Mesh(geometry, material));

        // Add Connection Nodes to Ghost
        // Add Connection Nodes to Ghost (Skip for Radial Node)
        if (partId !== 'radial_node') {
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
        }

        this.scene.scene.add(this.dragGhost);
    }

    private getMousePosition(event: MouseEvent): THREE.Vector2 {
        const rect = this.scene.renderer.domElement.getBoundingClientRect();
        return new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
    }

    private onMouseMove = (event: MouseEvent) => {
        // Update mouse position regardless of dragging
        this.mouse.copy(this.getMousePosition(event));

        if (!this.dragGhost) return;

        // Raycast to Z=0 plane
        this.raycaster.setFromCamera(this.mouse, this.scene.camera);
        const target = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.plane, target);

        // Update ghost position
        this.dragGhost.position.copy(target);

        // Check for snapping
        const snap = this.findSnapPosition(target);
        if (snap) {
            this.dragGhost.position.set(snap.pos.x, snap.pos.y, 1); // Z=1 to float above
            this.dragGhost.rotation.z = snap.rot;
        } else {
            this.dragGhost.rotation.z = 0;
            this.dragGhost.position.z = 1; // Z=1 to float above
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
            this.assembly.addPart(this.draggedPartId, position, this.dragGhost.rotation.z);

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
        this.mouse.copy(this.getMousePosition(event));
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

    private findSnapPosition(currentPos: THREE.Vector3): { pos: Vector2, rot: number } | null {
        // Shared interface for snap results
        interface SnapResult {
            pos: Vector2;
            rot: number;
            dist: number;
        }

        // --- 1. Surface Snap (Magnetic Edges) ---
        // Available for ALL parts now

        // Define interface for clarity
        interface SurfaceCandidate {
            object: THREE.Object3D;
            dist: number;
            snapLocal: THREE.Vector3;
            normalLocal: THREE.Vector3;
        }

        let bestSurfaceSnap: SnapResult | null = null;
        let bestCandidate: SurfaceCandidate | null = null;

        const SURFACE_THRESHOLD = 0.5;

        // Use for...of loop to support TS Control Flow Analysis
        for (const [partInstanceId, group] of this.scene.partMeshes) {
            const placedPart = this.assembly.parts.find(p => p.instanceId === partInstanceId);
            if (!placedPart) continue;

            // PREVENT snapping to the SURFACE of a radial node.
            // Radial nodes are small connectors; you should only snap to their NODE (handled by bestNodeSnap).
            if (placedPart.partId === 'radial_node') continue;

            const def = PartRegistry.get(placedPart.partId);
            if (!def) continue;

            const hitObject = group;
            const localPos = hitObject.worldToLocal(currentPos.clone());

            const w = def.width;
            const h = def.height;

            // AABB Clamping
            const cx = Math.max(-w / 2, Math.min(w / 2, localPos.x));
            const cy = Math.max(-h / 2, Math.min(h / 2, localPos.y));

            // Distance from cursor to AABB
            const dist = localPos.distanceTo(new THREE.Vector3(cx, cy, 0));

            if (dist < SURFACE_THRESHOLD) {
                // Find closest EDGE
                const distLeft = Math.abs(-w / 2 - cx);
                const distRight = Math.abs(w / 2 - cx);
                const distBottom = Math.abs(-h / 2 - cy);
                const distTop = Math.abs(h / 2 - cy);

                const minEdgeDist = Math.min(distLeft, distRight, distBottom, distTop);

                let snapLocal = new THREE.Vector3(cx, cy, 0);
                let normalLocal = new THREE.Vector3(0, 1, 0);

                if (minEdgeDist === distLeft) {
                    snapLocal.x = -w / 2;
                    normalLocal.set(-1, 0, 0);
                } else if (minEdgeDist === distRight) {
                    snapLocal.x = w / 2;
                    normalLocal.set(1, 0, 0);
                } else if (minEdgeDist === distBottom) {
                    snapLocal.y = -h / 2;
                    normalLocal.set(0, -1, 0);
                } else {
                    snapLocal.y = h / 2;
                    normalLocal.set(0, 1, 0);
                }

                // Real distance to the specific edge point
                const realDist = localPos.distanceTo(snapLocal);

                if (!bestCandidate || realDist < bestCandidate.dist) {
                    bestCandidate = {
                        object: hitObject,
                        dist: realDist,
                        snapLocal,
                        normalLocal
                    };
                }
            }
        }

        if (bestCandidate) {
            const c = bestCandidate;
            const snapWorld = c.object.localToWorld(c.snapLocal.clone());
            const normalWorld = c.normalLocal.applyQuaternion(c.object.quaternion);
            let rotation = Math.atan2(normalWorld.y, normalWorld.x) - Math.PI / 2;

            // Calculate aligned position based on the drag part's connection node
            let partPos = new Vector2(snapWorld.x, snapWorld.y);

            const draggedDef = this.draggedPartId ? PartRegistry.get(this.draggedPartId) : null;
            if (draggedDef && draggedDef.nodes.length > 0) {
                // Prefer 'bottom' node for surface attachment, or 'in', else first one
                // Cast to string to avoid TS error if 'in' is not in the union type yet
                const attachNode = draggedDef.nodes.find(n => n.type === 'bottom' || (n.type as string) === 'in') || draggedDef.nodes[0];

                // If attaching via TOP node (e.g. Engine), we need to FLIP rotation to point OUT
                if (attachNode.type === 'top') {
                    rotation += Math.PI;
                }

                // Rotate the node's local position to match the new part rotation
                const offset = new THREE.Vector2(attachNode.position.x, attachNode.position.y);
                offset.rotateAround(new THREE.Vector2(0, 0), rotation);

                // Apply offset: PartPosition = SnapPoint - RotatedNodeOffset
                partPos = partPos.sub(new Vector2(offset.x, offset.y));
            }

            bestSurfaceSnap = {
                pos: partPos,
                rot: rotation,
                dist: c.dist
            };
        }

        // --- 2. Node Snap (Stacking) ---
        // Standard node-to-node logic
        const NODE_THRESHOLD = 0.5;
        let bestNodeSnap: SnapResult | null = null;
        let bestNodeDist = NODE_THRESHOLD;

        // Ensure draggedPartId is not null before proceeding
        if (!this.draggedPartId) {
            // If no part is being dragged, no node snap is possible
            // Proceed to decision with only surface snap (if any)
        }

        const draggedDef = this.draggedPartId ? PartRegistry.get(this.draggedPartId) : null;

        if (draggedDef) {
            // Use for...of loop here as well
            for (const placedPart of this.assembly.parts) {
                const placedDef = PartRegistry.get(placedPart.partId);
                if (!placedDef) continue;

                placedDef.nodes.forEach(placedNode => {
                    const nodeOffset = new THREE.Vector2(placedNode.position.x, placedNode.position.y);
                    // Rotate the node offset to match the placed part's rotation
                    nodeOffset.rotateAround(new THREE.Vector2(0, 0), placedPart.rotation);

                    const placedNodePos = placedPart.position.clone().add(new Vector2(nodeOffset.x, nodeOffset.y));

                    draggedDef.nodes.forEach(draggedNode => {
                        const potentialPos = placedNodePos.sub(draggedNode.position);
                        const dist = new Vector2(currentPos.x, currentPos.y).distanceTo(potentialPos);

                        if (dist < bestNodeDist) {
                            if (this.areNodesCompatible(placedNode.type, draggedNode.type)) {
                                bestNodeDist = dist;
                                bestNodeSnap = {
                                    pos: potentialPos,
                                    rot: 0,
                                    dist: dist
                                };
                            }
                        }
                    });
                });
            }
        }

        // --- 3. Decision ---

        // PRIORITY: Node Snap always wins if valid.
        if (bestNodeSnap) {
            const node = bestNodeSnap as SnapResult;
            return { pos: node.pos, rot: node.rot };
        }

        if (bestSurfaceSnap) {
            const surf = bestSurfaceSnap as SnapResult;
            return { pos: surf.pos, rot: surf.rot };
        }

        return null;
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
        window.removeEventListener('keydown', this.onKeyDown);
    }
}
