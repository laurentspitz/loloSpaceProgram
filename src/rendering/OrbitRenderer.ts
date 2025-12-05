import * as THREE from 'three';
import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';

/**
 * OrbitRenderer - Handles high-precision orbit rendering
 * Uses CPU-side double precision calculations to avoid GPU Float32 limitations
 */
export class OrbitRenderer {
    private orbitLines: Map<Body, THREE.Line> = new Map();
    private orbitData: Map<Body, { points: Float64Array, sourceOrbit: any }> = new Map();
    private scene: THREE.Scene;
    private scale: number;
    private moonScale: number;

    constructor(scene: THREE.Scene, scale: number, moonScale: number) {
        this.scene = scene;
        this.scale = scale;
        this.moonScale = moonScale;
    }

    /**
     * Update scale values (called when zoom changes)
     */
    updateScale(scale: number, moonScale: number) {
        this.scale = scale;
        this.moonScale = moonScale;
    }

    /**
     * Render all orbits for the given bodies
     */
    renderOrbits(bodies: Body[], center: Vector2, showOrbits: boolean, showTrajectory: boolean = true) {
        if (!showOrbits && !showTrajectory) {
            this.orbitLines.forEach(line => line.visible = false);
            return;
        }

        // Ensure lines are visible (if they were hidden by toggle)
        // But respect the specific flags for rocket vs planets
        this.orbitLines.forEach((line, body) => {
            if (body.name === 'Rocket') {
                line.visible = showTrajectory;
            } else {
                line.visible = showOrbits;
            }
        });

        bodies.forEach(body => {
            let orbitLine = this.orbitLines.get(body);

            if (!body.parent || !body.orbit) {
                // If line exists but no orbit, remove it
                if (orbitLine) {
                    this.scene.remove(orbitLine);
                    if (orbitLine.geometry) orbitLine.geometry.dispose();
                    if (orbitLine.material) (orbitLine.material as THREE.Material).dispose();
                    this.orbitLines.delete(body);
                }
                return;
            }



            // Calculate adaptive opacity based on zoom
            const baseOpacity = 0.3;
            const zoomFactor = Math.min(4, Math.max(1, this.scale / 1e-9));
            const adaptiveOpacity = Math.min(0.8, baseOpacity * zoomFactor);

            const isMoon = body.type === 'moon';
            const orbitScale = isMoon ? this.moonScale : 1.0;

            // High segment count to reduce chord error (gap between line segment and actual curve)
            // Target segment length: ~1000 km (gives very low error)
            const circumference = 2 * Math.PI * body.orbit.a;
            const targetSegmentLength = 1000000; // 1,000 km (was 50,000 km)
            // Clamp between 16k and 200k segments to ensure smooth updates
            const segments = Math.min(200000, Math.max(16384, Math.ceil(circumference / targetSegmentLength)));

            // 1. Pre-calculate orbit points in high precision (Float64)
            // Check if orbit has changed (recalculated by physics) or if not cached yet
            const cachedData = this.orbitData.get(body);
            const orbitChanged = !cachedData || cachedData.sourceOrbit !== body.orbit;

            if (orbitChanged) {
                const points = new Float64Array((segments + 1) * 2); // x, y pairs

                for (let i = 0; i <= segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;

                    // Calculate position relative to focus (parent)
                    const x = body.orbit.a * Math.cos(angle);
                    const y = body.orbit.b * Math.sin(angle);

                    // Rotate by omega
                    const rotX = x * Math.cos(body.orbit.omega) - y * Math.sin(body.orbit.omega);
                    const rotY = x * Math.sin(body.orbit.omega) + y * Math.cos(body.orbit.omega);

                    // Add focus offset
                    const finalX = rotX + body.orbit.focusOffset.x;
                    const finalY = rotY + body.orbit.focusOffset.y;

                    points[i * 2] = finalX;
                    points[i * 2 + 1] = finalY;
                }
                this.orbitData.set(body, { points, sourceOrbit: body.orbit });
            }

            // 2. Create or update Line geometry
            if (!orbitLine) {
                const geometry = new THREE.BufferGeometry();
                // Initialize with empty data, will be updated below
                const positions = new Float32Array((segments + 1) * 3);
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

                const material = new THREE.LineBasicMaterial({
                    color: body.name === 'Rocket' ? 0x00ff00 : (isMoon ? 0xaaaaaa : 0xffffff),
                    opacity: adaptiveOpacity,
                    transparent: true,
                    linewidth: 3
                });

                orbitLine = new THREE.Line(geometry, material);
                orbitLine.frustumCulled = false;
                this.scene.add(orbitLine);
                this.orbitLines.set(body, orbitLine);
            } else if (orbitChanged) {
                // If orbit changed, we might need to resize the buffer if segment count changed
                // For simplicity, we assume segment count is stable for a body, or we recreate the buffer if needed.
                // Here we just check size.
                const currentSize = orbitLine.geometry.attributes.position.count;
                if (currentSize !== segments + 1) {
                    orbitLine.geometry.dispose();
                    const positions = new Float32Array((segments + 1) * 3);
                    orbitLine.geometry = new THREE.BufferGeometry();
                    orbitLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                }
            }

            // 3. Project points to screen space on CPU to ensure Float32 precision
            // We do this every frame (or when camera moves)
            // The calculation: ScreenPos = (ParentPos + OrbitRelPos - CameraCenter) * Scale
            // Since ParentPos, OrbitRelPos and CameraCenter are Doubles, we preserve precision before scaling.

            const data = this.orbitData.get(body)!;
            const positions = orbitLine.geometry.attributes.position.array as Float32Array;

            const parentX = body.parent.position.x;
            const parentY = body.parent.position.y;
            const centerX = center.x;
            const centerY = center.y;
            const scale = this.scale;

            // Optimization: Only update if visible? 
            // For now update all to ensure correctness. 16k points is fast in JS.

            for (let i = 0; i <= segments; i++) {
                const relX = data.points[i * 2] * orbitScale; // Apply moon scale if needed
                const relY = data.points[i * 2 + 1] * orbitScale;

                // The magic happens here: Double precision subtraction before scaling
                let worldX = (parentX + relX - centerX) * scale;
                let worldY = (parentY + relY - centerY) * scale;

                // Safeguard against NaN
                if (isNaN(worldX) || isNaN(worldY)) {
                    worldX = 0;
                    worldY = 0;
                }

                positions[i * 3] = worldX;
                positions[i * 3 + 1] = worldY;
                positions[i * 3 + 2] = -0.01;
            }

            orbitLine.geometry.attributes.position.needsUpdate = true;

            // Reset mesh transform since we projected points manually
            orbitLine.position.set(0, 0, 0);
            orbitLine.scale.set(1, 1, 1);

            // Update material opacity
            (orbitLine.material as THREE.LineBasicMaterial).opacity = adaptiveOpacity;
        });
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.orbitLines.forEach(line => {
            line.geometry.dispose();
            (line.material as THREE.Material).dispose();
            this.scene.remove(line);
        });
        this.orbitLines.clear();
        this.orbitData.clear();
    }
}
