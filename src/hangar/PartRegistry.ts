import type { PartDefinition } from './PartDefinition';
import { Vector2 } from '../core/Vector2';

export class PartRegistry {
    private static parts: Map<string, PartDefinition> = new Map();

    static register(part: PartDefinition) {
        this.parts.set(part.id, part);
    }

    static get(id: string): PartDefinition | undefined {
        return this.parts.get(id);
    }

    static getAll(): PartDefinition[] {
        return Array.from(this.parts.values());
    }

    static init() {
        // 1. Command Pod Mk1
        this.register({
            id: 'mk1_pod',
            name: 'Command Pod Mk1',
            type: 'capsule',
            description: 'A reliable capsule for a single Kerbal.',
            texture: '/textures/Command_Pod_Mk1.png',
            width: 1.25,
            height: 1.5,
            stats: {
                mass: 800,
                cost: 600
            },
            nodes: [
                { id: 'bottom', position: new Vector2(0, -0.75), direction: new Vector2(0, -1), type: 'bottom' }
            ]
        });

        // 2. Fuel Tank X200-32
        this.register({
            id: 'fuel_tank_x200_32',
            name: 'Fuel Tank X200-32',
            type: 'tank',
            description: 'A large fuel tank for heavy lifting.',
            texture: '/textures/X200-32_White.png',
            width: 2.5,
            height: 4.5,
            stats: {
                mass: 500, // Dry mass
                cost: 3000,
                fuel: 32000 // Fuel mass
            },
            nodes: [
                { id: 'top', position: new Vector2(0, 2.25), direction: new Vector2(0, 1), type: 'top' },
                { id: 'bottom', position: new Vector2(0, -2.25), direction: new Vector2(0, -1), type: 'bottom' }
            ]
        });

        // 3. LV-T30 "Reliant" Liquid Fuel Engine
        this.register({
            id: 'engine_lvt30',
            name: 'LV-T30 "Reliant"',
            type: 'engine',
            description: 'A powerful first-stage engine.',
            texture: '/textures/LV-T30_Liquid_Fuel_Engine_recent.png',
            width: 1.25,
            height: 1.8,
            stats: {
                mass: 1250,
                cost: 1100,
                thrust: 215000, // 215 kN
                isp: 300
            },
            nodes: [
                { id: 'top', position: new Vector2(0, 0.9), direction: new Vector2(0, 1), type: 'top' }
            ]
        });
    }
}
