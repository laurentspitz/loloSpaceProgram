

export interface Crater {
    x: number; // Normalized -1 to 1 (projected on sphere)
    y: number; // Normalized -1 to 1
    r: number; // Normalized radius 0 to 1
}

export interface Cloud {
    x: number;
    y: number;
    r: number;
    speed: number;
}

export class ProceduralUtils {
    // Simple pseudo-random based on seed
    static random(seed: number) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    static generateCraters(seed: number, count: number): Crater[] {
        const craters: Crater[] = [];
        let currentSeed = seed;

        for (let i = 0; i < count; i++) {
            // Random position on sphere (approximate with 2D disk for now)
            // To do it properly on a 3D rotating sphere is harder in 2D canvas,
            // but for a top-down/side view 2D sim, a disk distribution is okay.
            // We want more craters near the center to avoid edge distortion? 
            // Actually random disk is fine.

            const angle = ProceduralUtils.random(currentSeed++) * Math.PI * 2;
            const dist = Math.sqrt(ProceduralUtils.random(currentSeed++)); // Sqrt for uniform disk

            craters.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                r: 0.05 + ProceduralUtils.random(currentSeed++) * 0.15 // Radius 5% to 20% of body radius
            });
        }
        return craters;
    }

    static generateClouds(seed: number, count: number): Cloud[] {
        const clouds: Cloud[] = [];
        let currentSeed = seed;

        for (let i = 0; i < count; i++) {
            const angle = ProceduralUtils.random(currentSeed++) * Math.PI * 2;
            const dist = Math.sqrt(ProceduralUtils.random(currentSeed++)) * 0.9; // Keep slightly away from edge

            clouds.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                r: 0.1 + ProceduralUtils.random(currentSeed++) * 0.2,
                speed: 0.05 + ProceduralUtils.random(currentSeed++) * 0.1 // Rotation speed
            });
        }
        return clouds;
    }
}
