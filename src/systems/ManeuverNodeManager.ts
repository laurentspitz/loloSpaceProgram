import { ManeuverNode } from './ManeuverNode';
import { Vector2 } from '../core/Vector2';
import type { Rocket } from '../entities/Rocket';
import type { Body } from '../core/Body';
import { Physics } from '../physics/Physics';

/**
 * ManeuverNodeManager - Manages all maneuver nodes and trajectory predictions
 */
export class ManeuverNodeManager {
    nodes: ManeuverNode[] = [];
    predictedTrajectory: Vector2[] = [];

    /**
     * Add a new maneuver node and sort by orbit time
     */
    addNode(node: ManeuverNode): void {
        this.nodes.push(node);
        this.nodes.sort((a, b) => a.orbitTime - b.orbitTime);
    }

    /**
     * Remove a maneuver node by ID
     */
    removeNode(id: string): void {
        this.nodes = this.nodes.filter(n => n.id !== id);
    }

    /**
     * Update a maneuver node
     */
    updateNode(id: string, updates: Partial<ManeuverNode>): void {
        const node = this.nodes.find(n => n.id === id);
        if (node) {
            Object.assign(node, updates);
            // Re-sort if orbit time changed
            if (updates.orbitTime !== undefined) {
                this.nodes.sort((a, b) => a.orbitTime - b.orbitTime);
            }
        }
    }

    /**
     * Get the next chronological maneuver node (soonest)
     */
    getNextNode(): ManeuverNode | null {
        return this.nodes.length > 0 ? this.nodes[0] : null;
    }

    /**
     * Get node by ID
     */
    getNode(id: string): ManeuverNode | null {
        return this.nodes.find(n => n.id === id) || null;
    }

    /**
     * Clear all nodes
     */
    clearAll(): void {
        this.nodes = [];
        this.predictedTrajectory = [];
    }

    /**
     * Predict trajectory including all maneuver nodes
     */
    predictTrajectoryWithManeuvers(
        rocket: Rocket,
        bodies: Body[],
        timeStep: number,
        numSteps: number
    ): { segments: Vector2[][], colors: string[] } {
        if (this.nodes.length === 0) {
            // No maneuvers, return standard trajectory
            const points = this.predictSegment(
                rocket.body.position,
                rocket.body.velocity,
                bodies,
                timeStep,
                numSteps
            );
            return { segments: [points], colors: ['#00ffff'] };
        }

        const segments: Vector2[][] = [];
        const colors: string[] = [];

        let simPos = rocket.body.position.clone();
        let simVel = rocket.body.velocity.clone();
        let currentTime = 0;

        // Sort nodes by orbit time
        const sortedNodes = [...this.nodes].sort((a, b) => a.orbitTime - b.orbitTime);

        for (let i = 0; i < sortedNodes.length; i++) {
            const node = sortedNodes[i];

            // Use getTimeFromNow() to get correct relative time from current position
            const timeToNode = node.getTimeFromNow(rocket) - currentTime;

            if (i === 0 && rocket.body.orbit && rocket.body.parent) {
                // For the FIRST segment, use analytical orbit (same as green orbit)
                // This ensures the cyan line follows the green orbit perfectly
                const segmentPoints = this.predictOrbitSegment(
                    rocket,
                    node,
                    100 // Number of points for smooth curve
                );
                segments.push(segmentPoints);
                colors.push('#00ffff'); // Cyan

                // Update to node position
                simPos = node.getWorldPosition(rocket, bodies);
                simVel = node.getPostManeuverVelocity(rocket, bodies);
            } else {
                // For subsequent segments, use numerical prediction
                const stepsToNode = Math.max(1, Math.floor(timeToNode / timeStep));

                // Only simulate gravity from the parent body
                const parentBody = rocket.body.parent;
                const gravityBodies = parentBody ? [parentBody] : bodies;

                const segmentPoints = this.predictSegment(
                    simPos,
                    simVel,
                    gravityBodies,
                    timeStep,
                    stepsToNode
                );
                segments.push(segmentPoints);
                colors.push('#ff8800'); // Orange

                // Update position and velocity to node location
                if (segmentPoints.length > 0) {
                    simPos = segmentPoints[segmentPoints.length - 1].clone();
                }

                const postManeuverVel = node.getPostManeuverVelocity(rocket, bodies);
                simVel = postManeuverVel;
            }

            currentTime += timeToNode;
        }

        // Predict remaining trajectory after last node
        const remainingSteps = numSteps - segments.reduce((sum, seg) => sum + seg.length, 0);
        if (remainingSteps > 0) {
            // IMPORTANT: Only simulate gravity from the parent body
            // Using all bodies would make Earth/Sun dominate the simulation
            const parentBody = rocket.body.parent;
            const gravityBodies = parentBody ? [parentBody] : bodies;

            const finalSegment = this.predictSegment(
                simPos,
                simVel,
                gravityBodies,
                timeStep,
                remainingSteps
            );
            segments.push(finalSegment);
            colors.push('#ff8800'); // Orange after maneuver
        }

        this.predictedTrajectory = segments.flat();
        return { segments, colors };
    }

    /**
     * Predict orbit segment using analytical orbit (for stable elliptical orbits)
     * This traces the orbit from current rocket position to the maneuver node
     */
    private predictOrbitSegment(
        rocket: Rocket,
        targetNode: ManeuverNode,
        numPoints: number
    ): Vector2[] {
        const points: Vector2[] = [];
        const orbit = rocket.body.orbit!;
        const parent = rocket.body.parent!;

        // Get current and target eccentric anomalies
        const currentM = rocket.body.meanAnomaly || 0;
        const targetE = targetNode.eccentricAnomaly;

        // Convert current M to E
        let currentE = currentM;
        for (let i = 0; i < 5; i++) {
            currentE = currentE - (currentE - orbit.e * Math.sin(currentE) - currentM) / (1 - orbit.e * Math.cos(currentE));
        }

        // Calculate angular span
        let deltaE = targetE - currentE;
        if (deltaE < 0) deltaE += 2 * Math.PI;

        // Trace the orbit
        for (let i = 0; i <= numPoints; i++) {
            const E = currentE + (deltaE * i) / numPoints;

            // Calculate position at this E
            const x = orbit.a * (Math.cos(E) - orbit.e);
            const y = orbit.b * Math.sin(E);

            // Rotate by omega
            const cosO = Math.cos(orbit.omega);
            const sinO = Math.sin(orbit.omega);
            const rotX = x * cosO - y * sinO;
            const rotY = x * sinO + y * cosO;

            // Add parent position
            points.push(new Vector2(
                parent.position.x + rotX,
                parent.position.y + rotY
            ));
        }

        return points;
    }

    /**
     * Predict a single trajectory segment (no maneuvers)
     * Works in the parent body's reference frame for stability
     */
    private predictSegment(
        startPos: Vector2,
        startVel: Vector2,
        bodies: Body[],
        timeStep: number,
        numSteps: number
    ): Vector2[] {
        const points: Vector2[] = [];

        // If simulating around a single parent body, work in its reference frame
        const parentBody = bodies.length === 1 ? bodies[0] : null;

        if (parentBody) {
            // Work in parent's reference frame
            let simPos = startPos.sub(parentBody.position);
            let simVel = startVel.sub(parentBody.velocity);

            for (let i = 0; i < numSteps; i++) {
                // Store absolute position for rendering
                points.push(simPos.add(parentBody.position));

                // Calculate gravitational acceleration in parent's frame
                const dist = simPos.mag();
                if (dist < 0.1) continue;

                const forceMag = (Physics.G * parentBody.mass) / (dist * dist);
                const dir = simPos.scale(-1).normalize(); // Direction toward center
                const totalForce = dir.scale(forceMag);

                // Symplectic Euler integration
                simVel = simVel.add(totalForce.scale(timeStep));
                simPos = simPos.add(simVel.scale(timeStep));
            }
        } else {
            // Multi-body simulation (absolute frame)
            let simPos = startPos.clone();
            let simVel = startVel.clone();

            for (let i = 0; i < numSteps; i++) {
                points.push(simPos.clone());

                let totalForce = new Vector2(0, 0);
                for (const body of bodies) {
                    const dist = simPos.distanceTo(body.position);
                    if (dist < 0.1) continue;

                    const forceMag = (Physics.G * body.mass) / (dist * dist);
                    const dir = body.position.sub(simPos).normalize();
                    totalForce = totalForce.add(dir.scale(forceMag));
                }

                simVel = simVel.add(totalForce.scale(timeStep));
                simPos = simPos.add(simVel.scale(timeStep));
            }
        }

        return points;
    }

    /**
     * Find the closest point on the predicted trajectory to a given position
     * Returns the index and the point itself
     */
    findClosestPointOnTrajectory(position: Vector2): { index: number; point: Vector2; distance: number } | null {
        if (this.predictedTrajectory.length === 0) {
            return null;
        }

        let closestIndex = 0;
        let closestDistance = position.distanceTo(this.predictedTrajectory[0]);

        for (let i = 1; i < this.predictedTrajectory.length; i++) {
            const dist = position.distanceTo(this.predictedTrajectory[i]);
            if (dist < closestDistance) {
                closestDistance = dist;
                closestIndex = i;
            }
        }

        return {
            index: closestIndex,
            point: this.predictedTrajectory[closestIndex],
            distance: closestDistance
        };
    }
}
