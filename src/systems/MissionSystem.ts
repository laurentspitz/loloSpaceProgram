import { Rocket } from '../entities/Rocket';
import { Body } from '../core/Body';

export interface Mission {
    id: string;
    title: string;
    description: string;
    yearRequired?: number; // Minimum year to unlock
    reward: string;
    completed: boolean;
    checkCondition: (rocket: Rocket, bodies: Body[]) => boolean;
}

export class MissionManager {
    missions: Mission[] = [];
    activeMission: Mission | null = null;
    completedMissionIds: Set<string> = new Set();

    constructor() {
        this.defineMissions();
    }

    private defineMissions() {
        this.missions = [
            {
                id: 'karman_line',
                title: 'Reach Space',
                description: 'Fly above the Karman Line (100km).',
                yearRequired: 1957,
                reward: 'Unlock: Basic Fin (Fake)',
                completed: false,
                checkCondition: (rocket: Rocket, bodies: Body[]) => {
                    // Calculate Altitude
                    // Find nearest body
                    let minDist = Infinity;
                    let nearestBody: Body | null = null;

                    for (const body of bodies) {
                        // Ignore the rocket itself and debris
                        if (body === rocket.body || body.name === 'Rocket' || body.name.includes('Debris')) continue;

                        const d = rocket.body.position.distanceTo(body.position);
                        // Check surface distance (Visual Scale 3.0)
                        const visualRadius = body.radius * 3.0;
                        const alt = d - visualRadius;
                        if (alt < minDist && alt < 2000000) { // Only consider if reasonably close
                            minDist = alt;
                            nearestBody = body;
                        }
                    }

                    if (!nearestBody) return false;

                    const altitude = minDist;

                    return altitude >= 100000;
                }
            },
            {
                id: 'sputnik1',
                title: 'Sputnik 1',
                description: 'Launch the first artificial satellite into orbit.',
                yearRequired: 1957,
                reward: 'Unlock: LV-T30 Engine',
                completed: false,
                checkCondition: (rocket: Rocket, bodies: Body[]) => {
                    // Orbit condition: Alt > 150km, Vel > 2000
                    let minDist = Infinity;
                    let nearestBody: Body | null = null;

                    for (const body of bodies) {
                        if (body === rocket.body || body.name === 'Rocket' || body.name.includes('Debris')) continue;
                        const d = rocket.body.position.distanceTo(body.position);
                        const visualRadius = body.radius * 3.0;
                        const alt = d - visualRadius;
                        if (alt < minDist && alt < 10000000) {
                            minDist = alt;
                            nearestBody = body;
                        }
                    }
                    if (!nearestBody) return false;
                    const velocity = rocket.body.velocity.mag();
                    return minDist > 150000 && velocity > 2000;
                }
            },
            {
                id: 'sputnik2',
                title: 'Sputnik 2',
                description: 'Launch a biological payload (Laika) into orbit.',
                yearRequired: 1957,
                reward: 'Unlock: Mk1 Command Pod',
                completed: false,
                checkCondition: (rocket: Rocket, bodies: Body[]) => {
                    // Same as orbit for now, could check for specific part if implemented
                    let minDist = Infinity;
                    let nearestBody: Body | null = null;
                    for (const body of bodies) {
                        if (body === rocket.body || body.name === 'Rocket' || body.name.includes('Debris')) continue;
                        const d = rocket.body.position.distanceTo(body.position);
                        const visualRadius = body.radius * 3.0;
                        const alt = d - visualRadius;
                        if (alt < minDist && alt < 10000000) {
                            minDist = alt;
                            nearestBody = body;
                        }
                    }
                    if (!nearestBody) return false;
                    const velocity = rocket.body.velocity.mag();
                    return minDist > 150000 && velocity > 2000;
                }
            },
            {
                id: 'orbit_earth',
                title: 'First Orbit',
                description: 'Achieve a stable orbit around Earth.',
                yearRequired: 1958,
                reward: 'Unlock: Decoupler',
                completed: false,
                checkCondition: (rocket: Rocket, bodies: Body[]) => {
                    // Calculate Orbit Status
                    // Need altitude > 150km AND Velocity > 2000 (roughly)
                    // Re-use alt logic
                    let minDist = Infinity;
                    let nearestBody: Body | null = null;

                    for (const body of bodies) {
                        if (body === rocket.body || body.name === 'Rocket' || body.name.includes('Debris')) continue;

                        const d = rocket.body.position.distanceTo(body.position);
                        const visualRadius = body.radius * 3.0;
                        const alt = d - visualRadius;
                        if (alt < minDist && alt < 10000000) {
                            minDist = alt;
                            nearestBody = body;
                        }
                    }

                    if (!nearestBody) return false;

                    const velocity = rocket.body.velocity.mag();

                    return minDist > 150000 && velocity > 2000;
                }
            }
        ];
    }

    update(rocket: Rocket, currentYear: number, bodies: Body[]) {
        // Unlock missions based on year
        // Check active mission completion

        this.missions.forEach(mission => {
            if (this.completedMissionIds.has(mission.id)) {
                mission.completed = true;
                return;
            }

            if (mission.yearRequired && currentYear < mission.yearRequired) {
                return; // Locked
            }

            if (mission.checkCondition(rocket, bodies)) {
                this.completeMission(mission);
            }
        });
    }

    private completeMission(mission: Mission) {
        if (mission.completed) return;

        console.log(`MISSION COMPLETED: ${mission.title}! Reward: ${mission.reward}`);
        mission.completed = true;
        this.completedMissionIds.add(mission.id);

        // Dispatch event for UI
        window.dispatchEvent(new CustomEvent('mission-completed', { detail: { mission } }));
    }

    getAvailableMissions(year: number): Mission[] {
        return this.missions.filter(m => !m.yearRequired || m.yearRequired <= year);
    }

    getNextAvailableMission(year: number): Mission | null {
        // Return first incomplete mission that is unlocked
        return this.missions.find(m =>
            !this.completedMissionIds.has(m.id) &&
            (!m.yearRequired || m.yearRequired <= year)
        ) || null;
    }

    serialize(): any {
        return {
            completedIds: Array.from(this.completedMissionIds)
        };
    }

    deserialize(data: any) {
        if (!data) return;
        if (data.completedIds && Array.isArray(data.completedIds)) {
            data.completedIds.forEach((id: string) => {
                this.completedMissionIds.add(id);
                // Mark in missions array too
                const m = this.missions.find(mission => mission.id === id);
                if (m) m.completed = true;
            });
        }
    }
}
