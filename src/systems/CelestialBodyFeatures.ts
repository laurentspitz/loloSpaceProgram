/**
 * CelestialBodyFeatures - Modular feature system for celestial bodies
 * 
 * Features can be attached to any celestial body to define its visual
 * and physical characteristics in a data-driven way.
 */

export type FeatureType = 'clouds' | 'atmosphere' | 'rings' | 'storms';

/**
 * Base interface for all celestial body features
 */
export interface CelestialBodyFeature {
    type: FeatureType;
}

/**
 * Cloud feature - defines surface and atmospheric clouds
 */
export interface CloudFeature extends CelestialBodyFeature {
    type: 'clouds';
    surfaceClouds: boolean;       // Clouds on the planet surface
    atmosphericClouds: boolean;   // Clouds in the atmosphere
    altitudeMin: number;          // Minimum altitude in meters (e.g., 1000 = 1km)
    altitudeMax: number;          // Maximum altitude in meters (e.g., 80000 = 80km)
    color?: string;               // Cloud color (default: white)
    opacity?: number;             // Cloud opacity (default: 0.5)
    rotationSpeed?: number;       // Rotation speed multiplier (default: 1.0)
}

/**
 * Ring feature - defines planetary rings (Saturn, Uranus, etc.)
 */
export interface RingFeature extends CelestialBodyFeature {
    type: 'rings';
    innerRadius: number;  // Ratio of body radius (e.g., 1.2)
    outerRadius: number;  // Ratio of body radius (e.g., 2.3)
    color: string;
    opacity?: number;
    tilt?: number;        // Visual tilt angle
}

/**
 * Storm feature - defines storm systems (Jupiter's Great Red Spot, etc.)
 */
export interface StormFeature extends CelestialBodyFeature {
    type: 'storms';
    hasGreatSpot?: boolean;
    spotColor?: string;
    spotSize?: number;    // Ratio of body radius
}

/**
 * Type guard to check if a feature is a CloudFeature
 */
export function isCloudFeature(feature: CelestialBodyFeature): feature is CloudFeature {
    return feature.type === 'clouds';
}

/**
 * Type guard to check if a feature is a RingFeature
 */
export function isRingFeature(feature: CelestialBodyFeature): feature is RingFeature {
    return feature.type === 'rings';
}

/**
 * Type guard to check if a feature is a StormFeature
 */
export function isStormFeature(feature: CelestialBodyFeature): feature is StormFeature {
    return feature.type === 'storms';
}

/**
 * Helper to find a specific feature type from a features array
 */
export function findFeature<T extends CelestialBodyFeature>(
    features: CelestialBodyFeature[],
    type: FeatureType
): T | undefined {
    return features.find(f => f.type === type) as T | undefined;
}
