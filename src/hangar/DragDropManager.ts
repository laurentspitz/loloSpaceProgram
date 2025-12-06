import * as THREE from 'three';
import { HangarScene } from './HangarScene';
import { RocketAssembly } from './RocketAssembly';
import { PartRegistry } from './PartRegistry';
import { Vector2 } from '../core/Vector2';

interface DraggedItem {
    partId: string;
    offsetX: number;
    offsetY: number;
    rotation: number; // Relative rotation
}

export class DragDropManager {
    scene: HangarScene;
    assembly: RocketAssembly;

    private mouseDownPos: Vector2 | null = null;
    private pendingClickInstanceId: string | null = null;
    private isDragging: boolean = false;

    draggedPartId: string | null = null; // Anchor part ID
    draggedGroup: DraggedItem[] = []; // Items being dragged (including anchor)

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
        this.draggedGroup = [{ partId, offsetX: 0, offsetY: 0, rotation: 0 }];
        this.createGhost();

        // Immediately set position to mouse
        if (this.dragGhost) {
            this.dragGhost.position.set(this.mouse.x * 10, this.mouse.y * 10, 0);
            const target = new THREE.Vector3();
            this.raycaster.setFromCamera(this.mouse, this.scene.camera);
            this.raycaster.ray.intersectPlane(this.plane, target);
            this.dragGhost.position.copy(target);
        }

        this.isDragging = true;
    }

    private startDraggingSelection(anchorInstanceId: string) {
        const anchorPart = this.assembly.parts.find(p => p.instanceId === anchorInstanceId);
        if (!anchorPart) return;

        this.draggedPartId = anchorPart.partId;

        // Correctly handle selection: If the dragged part wasn't selected, select ONLY it
        if (!this.scene.selectedInstanceIds.has(anchorInstanceId)) {
            this.scene.selectedInstanceIds.clear();
            this.scene.selectedInstanceIds.add(anchorInstanceId);
        }

        this.draggedGroup = [];
        const anchorPos = anchorPart.position;
        const anchorRot = anchorPart.rotation;

        this.scene.selectedInstanceIds.forEach(id => {
            const p = this.assembly.parts.find(part => part.instanceId === id);
            if (p) {
                const v = p.position.clone().sub(anchorPos);
                v.rotateAround(new Vector2(0, 0), -anchorRot);

                this.draggedGroup.push({
                    partId: p.partId,
                    offsetX: v.x,
                    offsetY: v.y,
                    rotation: p.rotation - anchorRot
                });
            }
        });

        this.scene.selectedInstanceIds.forEach(id => {
            this.assembly.removePart(id);
        });

        this.createGhost();

        // CRITICAL FIX: Initialize Ghost at EXACLTY the anchor's position to prevent jumping
        if (this.dragGhost) {
            this.dragGhost.position.set(anchorPos.x, anchorPos.y, 0);
            this.dragGhost.rotation.z = anchorRot;
        }

        this.isDragging = true;
    }

    private createGhost() {
        if (this.dragGhost) {
            this.scene.scene.remove(this.dragGhost);
        }

        this.dragGhost = new THREE.Group();

        this.draggedGroup.forEach(item => {
            const def = PartRegistry.get(item.partId);
            if (!def) return;

            const texture = new THREE.TextureLoader().load(def.texture);
            const geometry = new THREE.PlaneGeometry(def.width, def.height);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 0.8, // Increased for visibility
                side: THREE.DoubleSide
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(item.offsetX, item.offsetY, 0);
            mesh.rotation.z = item.rotation;

            // Add Z offset for radial node inside group
            if (item.partId === 'radial_node') mesh.position.z += 0.1;

            this.dragGhost!.add(mesh);

            // Add Connection Nodes (Skip visuals for Radial Node)
            if (item.partId !== 'radial_node') {
                def.nodes.forEach(node => {
                    const nodeGeometry = new THREE.CircleGeometry(0.15, 16);
                    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 });
                    const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
                    nodeMesh.position.set(node.position.x, node.position.y, 0.1);
                    // Add Direction Line
                    const dir = new THREE.Vector3(node.direction.x, node.direction.y, 0).normalize().multiplyScalar(0.4);
                    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), dir]);
                    const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00 });
                    const line = new THREE.Line(lineGeo, lineMat);
                    line.position.z = 0.01;
                    nodeMesh.add(line);
                    mesh.add(nodeMesh);
                });
            }
        });

        this.scene.scene.add(this.dragGhost);
    }

    private getMousePosition(event: MouseEvent): THREE.Vector2 {
        const rect = this.scene.renderer.domElement.getBoundingClientRect();
        return new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
    }

    private isBoxSelecting: boolean = false;
    // ...

    private onMouseMove = (event: MouseEvent) => {
        this.mouse.copy(this.getMousePosition(event));

        // Drag Threshold Logic
        const currentPixelPos = new THREE.Vector2(event.clientX, event.clientY);

        // 1. Box Selection Logic
        if (this.mouseDownPos && !this.pendingClickInstanceId && !this.draggedPartId) {
            const dist = currentPixelPos.distanceTo(new THREE.Vector2(this.mouseDownPos.x, this.mouseDownPos.y));
            if (dist > 5) {
                this.isBoxSelecting = true;

                // Update Box Visuals
                const startX = this.mouseDownPos.x;
                const startY = this.mouseDownPos.y;
                const currentX = event.clientX;
                const currentY = event.clientY;

                const minX = Math.min(startX, currentX);
                const minY = Math.min(startY, currentY);
                const w = Math.abs(currentX - startX);
                const h = Math.abs(currentY - startY);

                // Adjust for canvas offset if needed? MouseEvent clientX includes page. 
                // But HangarScene container is relative? The Box is inside container.
                const rect = this.scene.renderer.domElement.getBoundingClientRect();
                // Pass coordinates relative to the canvas/container
                this.scene.updateSelectionBox({
                    x: minX - rect.left,
                    y: minY - rect.top,
                    w: w,
                    h: h
                });
            }
        }

        // 2. Part Drag Logic
        if (this.pendingClickInstanceId && this.mouseDownPos && !this.isDragging) {
            const dist = currentPixelPos.distanceTo(new THREE.Vector2(this.mouseDownPos.x, this.mouseDownPos.y));

            if (dist > 5) { // 5 pixel threshold
                this.startDraggingSelection(this.pendingClickInstanceId);
                this.pendingClickInstanceId = null;
            }
        }

        if (!this.dragGhost) return;

        this.raycaster.setFromCamera(this.mouse, this.scene.camera);
        const target = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.plane, target);

        this.dragGhost.position.copy(target);

        const snap = this.findSnapPosition(target);
        if (snap) {
            this.dragGhost.position.set(snap.pos.x, snap.pos.y, 1);
            this.dragGhost.rotation.z = snap.rot;
        } else {
            this.dragGhost.rotation.z = 0; // Or keep original rotation?
            // If dragging existing parts, we usually want to keep their rotation unless snapped?
            // For now, reset to 0 implies "align to grid".
            this.dragGhost.position.z = 1;
        }
    }

    private onMouseUp = (event: MouseEvent) => {
        // 0. Handle Box Selection Finish
        if (this.isBoxSelecting && this.mouseDownPos) {
            const rect = this.scene.renderer.domElement.getBoundingClientRect();

            const startX = this.mouseDownPos.x - rect.left;
            const startY = this.mouseDownPos.y - rect.top;
            const currentX = event.clientX - rect.left;
            const currentY = event.clientY - rect.top;

            const minX = Math.min(startX, currentX);
            const minY = Math.min(startY, currentY);
            const maxX = Math.max(startX, currentX);
            const maxY = Math.max(startY, currentY);

            this.scene.selectPartsInScreenRect(minX, minY, maxX, maxY, event.shiftKey);
            this.scene.updateSelectionBox(null);

            this.isBoxSelecting = false;
            this.mouseDownPos = null;
            return;
        }

        // 1. Handle Click Selection (No Drag occurred)
        if (this.pendingClickInstanceId && !this.isDragging) {
            const clickedId = this.pendingClickInstanceId;

            if (event.shiftKey) {
                // Toggle Selection
                if (this.scene.selectedInstanceIds.has(clickedId)) {
                    this.scene.selectedInstanceIds.delete(clickedId);
                } else {
                    this.scene.selectedInstanceIds.add(clickedId);
                }
            } else {
                // Exclusive Selection
                this.scene.selectedInstanceIds.clear();
                this.scene.selectedInstanceIds.add(clickedId);
            }
        }
        // Clicked Empty Space (Single Click, no drag)
        else if (!this.pendingClickInstanceId && !this.isDragging && !this.draggedPartId) {
            // Only clear if not box selecting (chk above covers it) and not dragging part
            this.scene.selectedInstanceIds.clear();
        }


        // 2. Handle Drop
        if (this.dragGhost && this.draggedPartId) {
            const isOverUI = event.target !== this.scene.renderer.domElement;
            if (this.isOverTrash(event.clientX, event.clientY) || isOverUI) {
                this.scene.scene.remove(this.dragGhost);
            } else {
                const anchorPos = new Vector2(this.dragGhost.position.x, this.dragGhost.position.y);
                const anchorRot = this.dragGhost.rotation.z;

                this.scene.selectedInstanceIds.clear();

                this.draggedGroup.forEach(item => {
                    const v = new Vector2(item.offsetX, item.offsetY);
                    v.rotateAround(new Vector2(0, 0), anchorRot);

                    const finalPos = anchorPos.clone().add(v);
                    const finalRot = anchorRot + item.rotation;

                    const newPart = this.assembly.addPart(item.partId, finalPos, finalRot);
                    this.scene.selectedInstanceIds.add(newPart.instanceId);
                });
            }

            // Cleanup
            if (this.dragGhost) this.scene.scene.remove(this.dragGhost);
            this.dragGhost = null;
            this.draggedPartId = null;
            this.draggedGroup = [];
            this.onPartPlaced();
        }

        // Reset States
        this.pendingClickInstanceId = null;
        this.mouseDownPos = null;
        this.isDragging = false;
    }

    private onMouseDown = (event: MouseEvent) => {
        if (this.draggedPartId) return; // Already dragging something?

        if (event.target !== this.scene.renderer.domElement) return;

        this.mouse.copy(this.getMousePosition(event));
        this.raycaster.setFromCamera(this.mouse, this.scene.camera);

        const clickedInstanceId = this.scene.getPartAt(this.raycaster);

        // Always record start pos for drag (part or box)
        this.mouseDownPos = new Vector2(event.clientX, event.clientY);

        if (clickedInstanceId) {
            // Initiate Potential Drug / Click on Part
            this.pendingClickInstanceId = clickedInstanceId;
        } else {
            // Clicked Empty Space -> Potentially Start Box Select (Wait for move)
            // Do NOT Deselect Immediately (wait for MouseUp)
        }
    }

    private onKeyDown = (event: KeyboardEvent) => {
        if ((event.key === 'Delete' || event.key === 'Backspace') && this.draggedPartId && this.dragGhost) {
            // Cancel drag and remove ghost
            this.scene.scene.remove(this.dragGhost);
            this.dragGhost = null;
            this.draggedPartId = null;
            this.draggedGroup = [];

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
