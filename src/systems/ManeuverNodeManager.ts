import { ManeuverNode } from './ManeuverNode';
import { Vector2 } from '../core/Vector2';
import type { Rocket } from '../entities/Rocket';
import type { Body } from '../core/Body';
import { Physics } from '../physics/Physics';
import { SphereOfInfluence } from '../physics/SphereOfInfluence';

/**
 * SOI encounter information for visualization
 */
export interface SOIEncounterInfo {
    body: Body;           // The body whose SOI we'll enter
    timeToEncounter: number;  // Time in seconds until encounter
}

/**
 * ManeuverNodeManager - Manages all maneuver nodes and trajectory predictions
 */
export class ManeuverNodeManager {
    nodes: ManeuverNode[] = [];
    predictedTrajectory: Vector2[] = [];

    // Track SOI encounter for visualization
    private _pendingEncounter: SOIEncounterInfo | null = null;

    /**
     * Get the pending SOI encounter if any
     */
    get pendingEncounter(): SOIEncounterInfo | null {
        return this._pendingEncounter;
    }

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
        // Clear any previous encounter info
        this._pendingEncounter = null;

        if (this.nodes.length === 0) {
            // No maneuvers, return standard trajectory
            const points = this.predictSegment(
                rocket.body.position,
                rocket.body.velocity,
                bodies,
                timeStep,
                numSteps,
                bodies  // Pass all bodies for SOI entry detection
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

                // Use Patched Conics: start with parent body, switch if we exit SOI
                const parentBody = rocket.body.parent;
                const gravityBodies = parentBody ? [parentBody] : bodies;

                const segmentPoints = this.predictSegment(
                    simPos,
                    simVel,
                    gravityBodies,
                    timeStep,
                    stepsToNode,
                    bodies  // Pass all bodies for SOI entry detection
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
            // Use Patched Conics
            const parentBody = rocket.body.parent;
            const gravityBodies = parentBody ? [parentBody] : bodies;

            const finalSegment = this.predictSegment(
                simPos,
                simVel,
                gravityBodies,
                timeStep,
                remainingSteps,
                bodies  // Pass all bodies for SOI entry detection
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

        // Calculate current eccentric anomaly from ACTUAL position
        const relPos = rocket.body.position.sub(parent.position);

        // Rotate to orbital frame (inverse rotation by -omega)
        const cosO = Math.cos(-orbit.omega);
        const sinO = Math.sin(-orbit.omega);
        const x = relPos.x * cosO - relPos.y * sinO;
        const y = relPos.x * sinO + relPos.y * cosO;

        // Calculate E from position: x = a*(cos(E) - e), y = b*sin(E)
        // Use atan2 for robust angle calculation
        let currentE = Math.atan2(y / orbit.b, (x / orbit.a + orbit.e));

        // Normalize to [0, 2π]
        if (currentE < 0) currentE += 2 * Math.PI;

        // Get target eccentric anomaly (should already be in [0, 2π])
        let targetE = targetNode.eccentricAnomaly;
        if (targetE < 0) targetE += 2 * Math.PI;

        // Calculate angular span - always go forward in time
        let deltaE = targetE - currentE;
        if (deltaE < 0) deltaE += 2 * Math.PI;

        // Trace the orbit
        for (let i = 0; i <= numPoints; i++) {
            const E = currentE + (deltaE * i) / numPoints;

            // Calculate position at this E
            const xOrb = orbit.a * (Math.cos(E) - orbit.e);
            const yOrb = orbit.b * Math.sin(E);

            // Rotate by omega
            const cosOmega = Math.cos(orbit.omega);
            const sinOmega = Math.sin(orbit.omega);
            const rotX = xOrb * cosOmega - yOrb * sinOmega;
            const rotY = xOrb * sinOmega + yOrb * cosOmega;

            // Add parent position
            points.push(new Vector2(
                parent.position.x + rotX,
                parent.position.y + rotY
            ));
        }

        return points;
    }

    /**
     * Predict a single trajectory segment using Patched Conics approximation
     * 
     * Physics and rendering work in the reference body's frame (stable orbit).
     * SOI detection uses TIME-AWARE positions: where will the Moon be when
     * the rocket reaches that point in its orbit?
     */
    private predictSegment(
        startPos: Vector2,
        startVel: Vector2,
        bodies: Body[],
        timeStep: number,
        numSteps: number,
        allBodies?: Body[]  // Optional: all bodies for SOI entry detection
    ): Vector2[] {
        const points: Vector2[] = [];

        // Determine initial reference body
        let currentBody = bodies.length === 1 ? bodies[0] : null;

        // Get children with SOI for entry detection
        const getChildrenWithSOI = (body: Body): Body[] => {
            if (!allBodies) return [];
            return allBodies.filter(b => b.parent === body && b.type !== 'star');
        };

        /**
         * Predict where a child body will be relative to its parent at a future time
         * This is used for SOI detection - where will the Moon be when we get there?
         */
        const predictChildRelativePosition = (child: Body, parent: Body, deltaTime: number): Vector2 => {
            if (!child.orbit) {
                // No orbital data, use current relative position
                return child.position.sub(parent.position);
            }

            const mu = Physics.G * (parent.mass + child.mass);
            const a = child.orbit.a;
            const e = child.orbit.e;

            // Mean motion: n = sqrt(mu / a^3)
            const n = Math.sqrt(mu / Math.pow(a, 3));

            // Future mean anomaly
            let M = child.meanAnomaly + n * deltaTime;
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

            // Position in orbital plane relative to parent
            const xOrbit = a * (Math.cos(E) - e);
            const yOrbit = child.orbit.b * Math.sin(E);

            // Rotate by argument of periapsis
            const cosW = Math.cos(child.orbit.omega);
            const sinW = Math.sin(child.orbit.omega);
            const xRot = xOrbit * cosW - yOrbit * sinW;
            const yRot = xOrbit * sinW + yOrbit * cosW;

            return new Vector2(xRot, yRot);
        };

        if (currentBody) {
            // Patched Conics Simulation
            // Physics and rendering stay in the reference body's frame

            let simPos = startPos.sub(currentBody.position);
            let simVel = startVel.sub(currentBody.velocity);
            let elapsedTime = 0;

            for (let i = 0; i < numSteps; i++) {
                elapsedTime += timeStep;

                // Store absolute position for rendering (using CURRENT body position)
                // This shows the stable orbit relative to the current body
                const absPos = simPos.add(currentBody.position);
                points.push(absPos);

                // Calculate Gravity from current body
                const dist = simPos.mag();
                if (dist < 0.1) continue;

                const forceMag = (Physics.G * currentBody!.mass) / (dist * dist);
                const dir = simPos.scale(-1).normalize();
                const force = dir.scale(forceMag);

                // Integrate
                simVel = simVel.add(force.scale(timeStep));
                simPos = simPos.add(simVel.scale(timeStep));

                // ===== SOI DETECTION WITH TIME-AWARENESS =====

                // Check for SOI Entry into child bodies
                // Use PREDICTED child positions based on elapsed time
                const children = getChildrenWithSOI(currentBody!);
                let enteredChild = false;

                for (const child of children) {
                    const childSOI = SphereOfInfluence.calculateSOI(child);

                    // Where will the child be relative to parent at this future time?
                    const childFutureRelPos = predictChildRelativePosition(child, currentBody!, elapsedTime);

                    // Check if rocket's relative position is inside child's future SOI
                    const distToChild = simPos.distanceTo(childFutureRelPos);

                    if (distToChild < childSOI) {
                        // SOI Entry detected! 
                        // Store encounter info for visualization
                        this._pendingEncounter = {
                            body: child,
                            timeToEncounter: elapsedTime
                        };

                        // Add the entry point to the trajectory and STOP
                        const entryPoint = simPos.add(currentBody.position);
                        points.push(entryPoint);

                        // Stop prediction here - we've reached the target SOI
                        return points;
                    }
                }

                if (enteredChild) continue;

                // SOI Exit to parent (using current positions, less time-sensitive)
                if (currentBody && currentBody.parent) {
                    const soiRadius = SphereOfInfluence.calculateSOI(currentBody);

                    if (dist > soiRadius) {
                        const newBody: Body = currentBody.parent;

                        // Transform using current body offset
                        const bodyOffset = currentBody.position.sub(newBody.position);
                        simPos = simPos.add(bodyOffset);

                        const velOffset = currentBody.velocity.sub(newBody.velocity);
                        simVel = simVel.add(velOffset);

                        currentBody = newBody;
                    }
                }
            }
        } else {
            // Multi-body simulation (absolute frame)
            let simPos = startPos.clone();
            let simVel = startVel.clone();
            let elapsedTime = 0;

            for (let i = 0; i < numSteps; i++) {
                elapsedTime += timeStep;
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

