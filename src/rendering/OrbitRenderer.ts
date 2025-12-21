import * as THREE from 'three';
import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/**
 * OrbitRenderer - Handles high-precision orbit rendering
 * Uses CPU-side double precision calculations to avoid GPU Float32 limitations
 */
export class OrbitRenderer {
    private orbitLines: Map<Body, Line2> = new Map();
    private orbitData: Map<Body, { points: Float64Array, sourceOrbit: any, renderBuffer?: Float32Array }> = new Map();
    private scene: THREE.Scene;
    private scale: number;
    private moonScale: number;
    private resolution: THREE.Vector2;

    constructor(scene: THREE.Scene, scale: number, moonScale: number) {
        this.scene = scene;
        this.scale = scale;
        this.moonScale = moonScale;
        this.resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);

        window.addEventListener('resize', () => {
            this.resolution.set(window.innerWidth, window.innerHeight);
        });
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

            // Calculate number of points based on period (more points for longer orbits)
            // Note: semiMajorAxis and parentBody.mu are not directly available here.
            // This part of the instruction seems to be based on a different context or intended for a different section.
            // For now, we'll use the existing 'segments' calculation.

            // Calculate adaptive opacity based on zoom
            const baseOpacity = 0.3;
            const zoomFactor = Math.min(4, Math.max(1, this.scale / 1e-9));
            const adaptiveOpacity = Math.min(0.8, baseOpacity * zoomFactor);

            const isMoon = body.type === 'moon';
            const orbitScale = isMoon ? this.moonScale : 1.0;

            // High segment count to reduce chord error (gap between line segment and actual curve)
            // Target segment length: ~1000 km (gives very low error)
            const circumference = 2 * Math.PI * body.orbit.a;
            const targetSegmentLength = 1000000; // 1,000 km

            // Reduced max segments for Line2 performance (was 200k)
            // Line2 generates geometry (quads), so we need to be conservative
            const segments = Math.min(4096, Math.max(1024, Math.ceil(circumference / targetSegmentLength)));

            // Safety check: ensure segments is valid
            if (!isFinite(segments) || segments <= 0) {
                return;
            }

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
                const geometry = new LineGeometry();
                // Initialize with empty data (will be set below)

                const color = body.name === 'Rocket' ? 0x00ff00 : (isMoon ? 0xaaaaaa : 0xffffff);
                const material = new LineMaterial({
                    color: color,
                    opacity: adaptiveOpacity,
                    transparent: true,
                    linewidth: 3, // 3px width
                    worldUnits: false, // Use screen pixels
                    resolution: this.resolution,
                    dashed: false
                });

                orbitLine = new Line2(geometry, material);
                orbitLine.frustumCulled = false;
                this.scene.add(orbitLine);
                this.orbitLines.set(body, orbitLine);
            } else if (orbitChanged) {
                // If orbit changed, we might need to recreate geometry if size changed significantly
                // But LineGeometry handles setPositions well
            }

            // 3. Project points to screen space on CPU to ensure Float32 precision
            // We do this every frame (or when camera moves)

            const data = this.orbitData.get(body)!;

            const parentX = body.parent.position.x;
            const parentY = body.parent.position.y;
            const centerX = center.x;
            const centerY = center.y;
            const scale = this.scale;

            // Reuse or resize buffer (stored in orbitData to persist across frames)
            // data.renderBuffer is a Float32Array
            const requiredSize = (segments + 1) * 3;
            if (!data.renderBuffer || data.renderBuffer.length < requiredSize) {
                data.renderBuffer = new Float32Array(requiredSize);
            }
            const positions = data.renderBuffer;

            for (let i = 0; i <= segments; i++) {
                const relX = data.points[i * 2] * orbitScale;
                const relY = data.points[i * 2 + 1] * orbitScale;

                // The magic happens here: Double precision subtraction before scaling
                let worldX = (parentX + relX - centerX) * scale;
                let worldY = (parentY + relY - centerY) * scale;

                // Safeguard against NaN
                if (isNaN(worldX) || isNaN(worldY)) {
                    worldX = 0;
                    worldY = 0;
                }

                // Direct write to reused buffer
                positions[i * 3] = worldX;
                positions[i * 3 + 1] = worldY;
                positions[i * 3 + 2] = -0.01;
            }

            // Update LineGeometry
            // setPositions accepts Float32Array directly
            // We strip the array to exact length using subarray if needed, 
            // but Line2 usually handles it if we pass the whole thing? 
            // Actually setPositions expects number[] or Float32Array.
            orbitLine.geometry.setPositions(positions.subarray(0, requiredSize));

            // Reset mesh transform since we projected points manually
            orbitLine.position.set(0, 0, 0);
            orbitLine.scale.set(1, 1, 1);

            // Update material opacity
            (orbitLine.material as LineMaterial).opacity = adaptiveOpacity;
            (orbitLine.material as LineMaterial).resolution = this.resolution;
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
