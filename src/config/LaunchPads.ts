/**
 * Launch Pads Configuration
 * Real geographic coordinates for launch sites
 * 
 * In the game:
 * - longitude: rotates Earth texture so this meridian is visible at right side
 * - latitude: controls rocket tilt (0° = equator, positive = north)
 * - Rocket always launches from right side of planet (0° in game coordinates)
 */

export interface LaunchPad {
    id: string;
    name: string;
    country: string;
    body: string;          // Which celestial body (e.g., 'Earth', 'Moon')
    longitude: number;     // Geographic longitude (degrees, real world)
    latitude: number;      // Geographic latitude (degrees, real world, positive = north)
}

export const LaunchPads: Record<string, LaunchPad> = {
    // Soviet/Russian Launch Sites
    baikonur: {
        id: 'baikonur',
        name: 'Baikonur Cosmodrome',
        country: 'USSR',
        body: 'Earth',
        longitude: 63,     // 63°E (Kazakhstan)
        latitude: 46,      // 46°N
    },
    plesetsk: {
        id: 'plesetsk',
        name: 'Plesetsk Cosmodrome',
        country: 'USSR',
        body: 'Earth',
        longitude: 41,     // 41°E
        latitude: 63,      // 63°N (far north)
    },
    vostochny: {
        id: 'vostochny',
        name: 'Vostochny Cosmodrome',
        country: 'Russia',
        body: 'Earth',
        longitude: 128,    // 128°E
        latitude: 51,      // 51°N
    },

    // American Launch Sites
    cape_canaveral: {
        id: 'cape_canaveral',
        name: 'Cape Canaveral',
        country: 'USA',
        body: 'Earth',
        longitude: -80,    // 80°W
        latitude: 28,      // 28°N (Florida)
    },
    kennedy: {
        id: 'kennedy',
        name: 'Kennedy Space Center',
        country: 'USA',
        body: 'Earth',
        longitude: -80,    // 80°W
        latitude: 28,      // 28°N
    },
    vandenberg: {
        id: 'vandenberg',
        name: 'Vandenberg SFB',
        country: 'USA',
        body: 'Earth',
        longitude: -121,   // 121°W
        latitude: 35,      // 35°N (California)
    },

    // European Launch Sites
    kourou: {
        id: 'kourou',
        name: 'Guiana Space Centre',
        country: 'France',
        body: 'Earth',
        longitude: -53,    // 53°W
        latitude: 5,       // 5°N (near equator - ideal!)
    },

    // Asian Launch Sites
    tanegashima: {
        id: 'tanegashima',
        name: 'Tanegashima Space Center',
        country: 'Japan',
        body: 'Earth',
        longitude: 131,    // 131°E
        latitude: 30,      // 30°N
    },
    jiuquan: {
        id: 'jiuquan',
        name: 'Jiuquan Satellite Launch Center',
        country: 'China',
        body: 'Earth',
        longitude: 100,    // 100°E
        latitude: 41,      // 41°N
    },
    satish_dhawan: {
        id: 'satish_dhawan',
        name: 'Satish Dhawan Space Centre',
        country: 'India',
        body: 'Earth',
        longitude: 80,     // 80°E
        latitude: 14,      // 14°N
    },
};

/**
 * Get a launch pad by ID
 */
export function getLaunchPad(id: string): LaunchPad | undefined {
    return LaunchPads[id];
}

/**
 * Get all launch pads as array
 */
export function getAllLaunchPads(): LaunchPad[] {
    return Object.values(LaunchPads);
}
