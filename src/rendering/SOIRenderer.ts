import * as THREE from 'three';
import { Body } from '../core/Body';
import { Vector2 } from '../core/Vector2';
import { SphereOfInfluence } from '../physics/SphereOfInfluence';
import type { SOIInfo } from '../physics/SphereOfInfluence';
import { Physics } from '../physics/Physics';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/**
 * Color palette for SOI visualization by body name
 */
const SOI_COLORS: Record<string, number> = {
    'Earth': 0x4a9eff,    // Blue
    'Moon': 0xaaaaaa,     // Gray
    'Mars': 0xff6b35,     // Orange-Red
    'Venus': 0xffcc00,    // Yellow-Orange
    'Mercury': 0x9c7e5e,  // Brown
    'Jupiter': 0xff9966,  // Light Orange
    'Saturn': 0xf4d59e,   // Tan
    'Uranus': 0x7fdbff,   // Light Blue
    'Neptune': 0x3d5afe,  // Deep Blue
    'Sun': 0xffdd00,      // Yellow (shouldn't be used)
};

/**
 * SOIRenderer - Renders Sphere of Influence boundaries for celestial bodies
 * Shows dashed circles around bodies when trajectory approaches them
 */
export class SOIRenderer {
    private scene: THREE.Scene;
    private soiLines: Map<Body, Line2> = new Map();
    private resolution: THREE.Vector2;

    // Visibility settings
    private showAllSOI: boolean = false; // If true, show all SOIs; if false, only show relevant ones
    private relevanceThreshold: number = 2.0; // Show SOI if trajectory is within N * soiRadius

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);

        window.addEventListener('resize', () => {
            this.resolution.set(window.innerWidth, window.innerHeight);
        });
    }

    /**
     * Render SOI spheres for relevant bodies
     * @param bodies All celestial bodies
     * @param trajectoryPoints Points along the predicted trajectory
     * @param center Camera center position
     * @param scale Current zoom scale
     */
    renderSOIs(
        bodies: Body[],
        trajectoryPoints: Vector2[],
        center: Vector2,
        scale: number
    ): void {
        // Get all bodies with finite SOI
        const bodiesWithSOI = bodies.filter(b => b.parent !== null);

        for (const body of bodiesWithSOI) {
            const soiRadius = SphereOfInfluence.calculateSOI(body);

            // Check if this SOI is relevant (trajectory comes close enough)
            const isRelevant = this.isSOIRelevant(body, soiRadius, trajectoryPoints);

            let soiLine = this.soiLines.get(body);

            if (isRelevant || this.showAllSOI) {
                // Calculate opacity based on closest approach
                const opacity = this.calculateOpacity(body, soiRadius, trajectoryPoints);

                if (!soiLine) {
                    // Create new SOI line
                    soiLine = this.createSOILine(body, soiRadius);
                    this.scene.add(soiLine);
                    this.soiLines.set(body, soiLine);
                }

                // Update position and scale
                this.updateSOILine(soiLine, body, soiRadius, center, scale, opacity);
                soiLine.visible = true;
            } else if (soiLine) {
                // Hide if not relevant
                soiLine.visible = false;
            }
        }
    }

    /**
     * Check if a body's SOI is relevant to the current trajectory
     */
    private isSOIRelevant(body: Body, soiRadius: number, trajectoryPoints: Vector2[]): boolean {
        if (trajectoryPoints.length === 0) return false;

        // Check if any trajectory point is within threshold of SOI
        const threshold = soiRadius * this.relevanceThreshold;

        for (const point of trajectoryPoints) {
            const distance = point.distanceTo(body.position);
            if (distance < threshold) {
                return true;
            }
        }

        return false;
    }

    /**
     * Calculate opacity based on closest approach distance
     * Closer approach = higher opacity
     */
    private calculateOpacity(body: Body, soiRadius: number, trajectoryPoints: Vector2[]): number {
        if (trajectoryPoints.length === 0) return 0.2;

        let closestDistance = Infinity;

        for (const point of trajectoryPoints) {
            const distance = point.distanceTo(body.position);
            if (distance < closestDistance) {
                closestDistance = distance;
            }
        }

        // Inside SOI = max opacity
        if (closestDistance < soiRadius) {
            return 0.8;
        }

        // Distance from SOI boundary (positive = outside)
        const distanceFromSOI = closestDistance - soiRadius;
        const maxDistance = soiRadius; // Fade out over 1x SOI radius

        // Linear fade from 0.6 (at SOI boundary) to 0.2 (at maxDistance)
        const t = Math.min(1, distanceFromSOI / maxDistance);
        return 0.6 - t * 0.4;
    }

    /**
     * Create a new SOI visualization line
     */
    private createSOILine(body: Body, _soiRadius: number): Line2 {
        // Create dashed circle geometry
        const segments = 128;
        const positions: number[] = [];

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            // Unit circle - will be scaled
            positions.push(Math.cos(angle), Math.sin(angle), 0);
        }

        const geometry = new LineGeometry();
        geometry.setPositions(positions);

        // Get color for this body
        const color = SOI_COLORS[body.name] || 0xffffff;

        const material = new LineMaterial({
            color: color,
            opacity: 0.4,
            transparent: true,
            linewidth: 2,
            worldUnits: false,
            resolution: this.resolution,
            dashed: true,
            dashSize: 10,
            gapSize: 10,
            dashScale: 1
        });

        const line = new Line2(geometry, material);
        line.computeLineDistances();
        line.frustumCulled = false;
        line.renderOrder = -1; // Render behind trajectory

        return line;
    }

    /**
     * Update SOI line position, scale, and opacity
     */
    private updateSOILine(
        line: Line2,
        body: Body,
        soiRadius: number,
        center: Vector2,
        scale: number,
        opacity: number
    ): void {
        // Position at body center
        const worldX = (body.position.x - center.x) * scale;
        const worldY = (body.position.y - center.y) * scale;
        line.position.set(worldX, worldY, -0.1); // Behind planets

        // Scale to SOI radius
        const soiScale = soiRadius * scale;
        line.scale.set(soiScale, soiScale, 1);

        // Update opacity
        const material = line.material as LineMaterial;
        material.opacity = opacity;
        material.resolution = this.resolution;
    }

    /**
     * Get SOI info for bodies that the trajectory passes through
     */
    getEncounteredSOIs(
        trajectoryPoints: Vector2[],
        bodies: Body[]
    ): SOIInfo[] {
        if (trajectoryPoints.length === 0) return [];

        const encountered: SOIInfo[] = [];
        const checkedBodies = new Set<Body>();

        for (const point of trajectoryPoints) {
            const soiInfos = SphereOfInfluence.getRelevantSOIs(point, bodies);

            for (const info of soiInfos) {
                if (info.isInside && !checkedBodies.has(info.body)) {
                    encountered.push(info);
                    checkedBodies.add(info.body);
                }
            }
        }

        return encountered;
    }

    /**
     * Toggle showing all SOIs vs only relevant ones
     */
    setShowAllSOI(show: boolean): void {
        this.showAllSOI = show;
    }

    // Storage for future position visualization
    private futureSOILines: Map<string, Line2> = new Map();
    private futureOrbitPaths: Map<string, Line2> = new Map();

    /**
     * Render predicted future position of a body with its SOI
     * Shows dashed path from current position to future position and SOI at future location
     */
    renderFutureSOI(
        body: Body,
        futureTimeSeconds: number,
        center: Vector2,
        scale: number
    ): void {
        if (!body.parent || !body.orbit) return;

        const key = `${body.name}_future`;
        const soiRadius = SphereOfInfluence.calculateSOI(body);

        // Calculate future position using Kepler (same as OrbitUtils)
        const mu = Physics.G * (body.parent.mass + body.mass);
        const a = body.orbit.a;
        const e = body.orbit.e;
        const n = Math.sqrt(mu / Math.pow(a, 3)); // Mean motion

        // Future mean anomaly
        let M = body.meanAnomaly + n * futureTimeSeconds;
        M = M % (Math.PI * 2);
        if (M < 0) M += Math.PI * 2;

        // Solve Kepler's equation using Newton-Raphson (matches OrbitUtils)
        let E = M;
        if (e > 0.8) E = Math.PI;
        for (let iter = 0; iter < 10; iter++) {
            const f = E - e * Math.sin(E) - M;
            const df = 1 - e * Math.cos(E);
            E = E - f / df;
        }

        // Position in orbital plane
        const xOrbit = a * (Math.cos(E) - e);
        const yOrbit = body.orbit.b * Math.sin(E);

        // Rotate by omega
        const cosW = Math.cos(body.orbit.omega);
        const sinW = Math.sin(body.orbit.omega);
        const xRot = xOrbit * cosW - yOrbit * sinW;
        const yRot = xOrbit * sinW + yOrbit * cosW;

        // Absolute future position
        const futurePos = new Vector2(
            body.parent.position.x + xRot,
            body.parent.position.y + yRot
        );

        // Get or create future SOI circle
        let futureLine = this.futureSOILines.get(key);
        if (!futureLine) {
            // Create dashed circle for future SOI
            const segments = 64;
            const positions: number[] = [];
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                positions.push(Math.cos(angle), Math.sin(angle), 0);
            }

            const geometry = new LineGeometry();
            geometry.setPositions(positions);

            const color = SOI_COLORS[body.name] || 0xffffff;
            const material = new LineMaterial({
                color: color,
                opacity: 0.5,
                transparent: true,
                linewidth: 2,
                worldUnits: false,
                resolution: this.resolution,
                dashed: true,
                dashSize: 6,
                gapSize: 6,
                dashScale: 1
            });

            futureLine = new Line2(geometry, material);
            futureLine.computeLineDistances();
            futureLine.frustumCulled = false;
            futureLine.renderOrder = -2;
            this.scene.add(futureLine);
            this.futureSOILines.set(key, futureLine);
        }

        // Update future SOI position
        const worldX = (futurePos.x - center.x) * scale;
        const worldY = (futurePos.y - center.y) * scale;
        futureLine.position.set(worldX, worldY, -0.1);
        futureLine.scale.set(soiRadius * scale, soiRadius * scale, 1);
        futureLine.visible = true;

        // Get or create orbital path from current to future
        let pathLine = this.futureOrbitPaths.get(key);
        if (!pathLine) {
            const pathPositions: number[] = [];
            const pathSegments = 32;

            // This will be updated each frame
            for (let i = 0; i <= pathSegments; i++) {
                pathPositions.push(0, 0, 0);
            }

            const geometry = new LineGeometry();
            geometry.setPositions(pathPositions);

            const color = SOI_COLORS[body.name] || 0xffffff;
            const material = new LineMaterial({
                color: color,
                opacity: 0.3,
                transparent: true,
                linewidth: 1,
                worldUnits: false,
                resolution: this.resolution,
                dashed: true,
                dashSize: 4,
                gapSize: 4,
                dashScale: 1
            });

            pathLine = new Line2(geometry, material);
            pathLine.computeLineDistances();
            pathLine.frustumCulled = false;
            pathLine.renderOrder = -3;
            this.scene.add(pathLine);
            this.futureOrbitPaths.set(key, pathLine);
        }

        // Update path from current to future position
        const pathSegments = 32;
        const pathPositions: number[] = [];
        const currentM = body.meanAnomaly;
        const futureM = body.meanAnomaly + n * futureTimeSeconds;
        const deltaM = (futureM - currentM);

        for (let i = 0; i <= pathSegments; i++) {
            const t = i / pathSegments;
            let stepM = currentM + deltaM * t;
            stepM = stepM % (Math.PI * 2);
            if (stepM < 0) stepM += Math.PI * 2;

            let stepE = stepM;
            for (let iter = 0; iter < 5; iter++) {
                stepE = stepM + e * Math.sin(stepE);
            }

            const stepX = a * (Math.cos(stepE) - e);
            const stepY = body.orbit.b * Math.sin(stepE);
            const rotX = stepX * cosW - stepY * sinW;
            const rotY = stepX * sinW + stepY * cosW;

            const absX = (body.parent.position.x + rotX - center.x) * scale;
            const absY = (body.parent.position.y + rotY - center.y) * scale;
            pathPositions.push(absX, absY, 0);
        }

        pathLine.geometry.setPositions(pathPositions);
        pathLine.computeLineDistances();
        pathLine.visible = true;
    }

    /**
     * Hide all future SOI visualizations
     */
    hideFutureSOIs(): void {
        this.futureSOILines.forEach(line => line.visible = false);
        this.futureOrbitPaths.forEach(line => line.visible = false);
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.soiLines.forEach(line => {
            if (line.geometry) line.geometry.dispose();
            if (line.material) (line.material as LineMaterial).dispose();
            this.scene.remove(line);
        });
        this.soiLines.clear();

        this.futureSOILines.forEach(line => {
            if (line.geometry) line.geometry.dispose();
            if (line.material) (line.material as LineMaterial).dispose();
            this.scene.remove(line);
        });
        this.futureSOILines.clear();

        this.futureOrbitPaths.forEach(line => {
            if (line.geometry) line.geometry.dispose();
            if (line.material) (line.material as LineMaterial).dispose();
            this.scene.remove(line);
        });
        this.futureOrbitPaths.clear();
    }
}
