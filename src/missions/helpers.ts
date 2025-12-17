import { Rocket } from '../entities/Rocket';
import { Body } from '../core/Body';
import type { ConditionFn } from './types';

/**
 * Shared helper functions for mission condition checking
 */

/** Check if a specific date (year + month) has been reached */
export function reachedDate(targetYear: number, targetMonth: number): ConditionFn {
    // Prefix unused arguments with underscore to satisfy no-unused-vars
    return (_rocket: Rocket, _bodies: Body[], currentYear: number) => {
        // Calculate precise target time (year + fraction)
        // targetMonth is 0-11
        const targetTime = targetYear + (targetMonth / 12);
        return currentYear >= targetTime;
    };
}

/** Get altitude above nearest celestial body */
export function getAltitude(rocket: Rocket, bodies: Body[]): number {
    let minDist = Infinity;
    for (const body of bodies) {
        if (body === rocket.body || body.name === 'Rocket' || body.name.includes('Debris')) continue;
        const d = rocket.body.position.distanceTo(body.position);
        const visualRadius = body.radius; // No visual scaling
        const alt = d - visualRadius;
        if (alt < minDist && alt < 2000000) {
            minDist = alt;
        }
    }
    return minDist === Infinity ? 0 : minDist;
}

/** Check if in orbit around nearest body */
export function isInOrbit(rocket: Rocket, bodies: Body[], minAltitude: number, minVelocity: number): boolean {
    let minDist = Infinity;
    let nearestBody: Body | null = null;
    for (const body of bodies) {
        if (body === rocket.body || body.name === 'Rocket' || body.name.includes('Debris')) continue;
        const d = rocket.body.position.distanceTo(body.position);
        const visualRadius = body.radius; // No visual scaling
        const alt = d - visualRadius;
        if (alt < minDist && alt < 10000000) {
            minDist = alt;
            nearestBody = body;
        }
    }
    if (!nearestBody) return false;
    const velocity = rocket.body.velocity.mag();
    return minDist > minAltitude && velocity > minVelocity;
}

/** Check if in orbit around a specific body */
export function isInOrbitAroundBody(rocket: Rocket, bodies: Body[], bodyName: string, minAltitude: number, minVelocity: number): boolean {
    const targetBody = bodies.find(b => b.name === bodyName);
    if (!targetBody) return false;
    const d = rocket.body.position.distanceTo(targetBody.position);
    const visualRadius = targetBody.radius; // No visual scaling
    const alt = d - visualRadius;
    const velocity = rocket.body.velocity.mag();
    return alt > 0 && alt < minAltitude && velocity > minVelocity;
}

/** Check if near a specific body */
export function isNearBody(rocket: Rocket, bodies: Body[], bodyName: string, distance: number): boolean {
    const targetBody = bodies.find(b => b.name === bodyName);
    if (!targetBody) return false;
    const d = rocket.body.position.distanceTo(targetBody.position);
    const visualRadius = targetBody.radius; // No visual scaling
    const alt = d - visualRadius;
    return alt >= 0 && alt < distance;
}

/** Check if landed on a body (low altitude + low velocity) */
export function isLandedOnBody(rocket: Rocket, bodies: Body[], bodyName: string): boolean {
    const targetBody = bodies.find(b => b.name === bodyName);
    if (!targetBody) return false;
    const d = rocket.body.position.distanceTo(targetBody.position);
    const visualRadius = targetBody.radius; // No visual scaling
    const alt = d - visualRadius;
    const velocity = rocket.body.velocity.mag();
    // On surface (within 500m) and slow (< 50 m/s)
    return alt >= 0 && alt < 500 && velocity < 50;
}
