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
        // Base scale: 90px texture width = 2.5 meters (standard part width)
        const TEXTURE_WIDTH_PX = 90;
        const SCALE = 2.5 / TEXTURE_WIDTH_PX; // meters per pixel

        // 1. Command Pod Mk1 (90px × 81px)
        const mk1Height = 81 * SCALE;
        this.register({
            id: 'mk1_pod',
            name: 'Command Pod Mk1',
            type: 'capsule',
            description: 'A reliable capsule for a single Kerbal.',
            texture: '/textures/Command_Pod_Mk1.png',
            width: 2.5,
            height: mk1Height,
            stats: {
                mass: 800,
                cost: 25000000
            },
            nodes: [
                { id: 'bottom', position: new Vector2(0, -mk1Height / 2 + 9 * SCALE), direction: new Vector2(0, -1), type: 'bottom' }
            ]
        });

        // 2. Fuel Tank X200-32 (90px × 80px)
        const tankHeight = 80 * SCALE;
        this.register({
            id: 'fuel_tank_x200_32',
            name: 'Fuel Tank X200-32',
            type: 'tank',
            description: 'A large fuel tank for heavy lifting.',
            texture: '/textures/X200-32_White.png',
            width: 2.5,
            height: tankHeight,
            stats: {
                mass: 500, // Dry mass (500kg)
                cost: 300000,
                fuel: 32000 // Fuel mass
            },
            nodes: [
                { id: 'top', position: new Vector2(0, tankHeight / 2), direction: new Vector2(0, 1), type: 'top' },
                { id: 'bottom', position: new Vector2(0, -tankHeight / 2), direction: new Vector2(0, -1), type: 'bottom' }
            ]
        });

        // 3. LV-T30 "Reliant" Liquid Fuel Engine (90px × 129px)
        const engineHeight = 129 * SCALE;
        this.register({
            id: 'engine_lvt30',
            name: 'LV-T30 "Reliant"',
            type: 'engine',
            description: 'A powerful first-stage engine.',
            texture: '/textures/LV-T30_Liquid_Fuel_Engine_recent.png',
            width: 2.5,
            height: engineHeight,
            stats: {
                mass: 1250,
                cost: 2000000,
                thrust: 600000, // 600 kN (increased for better TWR)
                isp: 300
            },
            nodes: [
                { id: 'top', position: new Vector2(0, engineHeight / 2), direction: new Vector2(0, 1), type: 'top' }
            ],
            effect: 'standard'
        });

        // 3.5 KS-25 "Titan" Liquid Fuel Engine
        const titanHeight = 140 * SCALE;
        this.register({
            id: 'engine_titan',
            name: 'KS-25 "Titan"',
            type: 'engine',
            description: 'A high-performance engine with a distinctive blue exhaust.',
            texture: '/textures/engine_titan.png',
            width: 2.5,
            height: titanHeight,
            stats: {
                mass: 2000,
                cost: 4000000,
                thrust: 1500000, // 1.5 MN
                isp: 320
            },
            nodes: [
                { id: 'top', position: new Vector2(0, titanHeight / 2), direction: new Vector2(0, 1), type: 'top' }
            ],
            effect: 'blue_flame'
        });

        // 3.6 RCS Thruster
        const rcsHeight = 0.6;
        this.register({
            id: 'rcs_block',
            name: 'RV-105 RCS',
            type: 'rcs',
            description: 'Small thruster for attitude control.',
            texture: '/textures/rcs_thruster.png',
            width: 0.6,
            height: rcsHeight,
            stats: {
                mass: 50,
                cost: 600,
                thrust: 50000, // 50kN - boost for playability
                isp: 250
            },
            nodes: [
                { id: 'top', position: new Vector2(0, rcsHeight / 2), direction: new Vector2(0, 1), type: 'top' }
            ],
            effect: 'rcs'
        });

        // 4. Decoupler (90px × 9px)
        const decouplerHeight = 9 * SCALE;
        this.register({
            id: 'decoupler',
            name: 'Decoupler',
            type: 'decoupler',
            description: 'A stage separation device.',
            texture: '/textures/decoupleur.png',
            width: 2.5,
            height: decouplerHeight,
            stats: {
                mass: 50,
                cost: 50000
            },
            nodes: [
                { id: 'top', position: new Vector2(0, decouplerHeight / 2), direction: new Vector2(0, 1), type: 'top' },
                { id: 'bottom', position: new Vector2(0, -decouplerHeight / 2), direction: new Vector2(0, -1), type: 'bottom' }
            ]
        });

        // 5. Radial Node (Custom Attachment Point)
        // Texture: 20x20 orange circle with blue border
        const nodeSize = 0.5; // meters
        this.register({
            id: 'radial_node',
            name: 'Radial Node',
            type: 'structure',
            description: 'A custom attachment point that can be placed anywhere.',
            texture: this.createNodeTexture(),
            width: nodeSize,
            height: nodeSize,
            stats: {
                mass: 10,
                cost: 1000
            },
            nodes: [
                // One node facing "out" (relative to the surface it sits on)
                // When placed, rotation will align this.
                { id: 'out', position: new Vector2(0, 0), direction: new Vector2(0, 1), type: 'bottom' }
            ]
        });
    }

    private static createNodeTexture(): string {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;

        // Orange center
        ctx.fillStyle = '#ff9900';
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fill();

        // Blue border (distinct from green nodes)
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 6;
        ctx.stroke();

        // Inner detail (Orientation Arrow)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        // Triangle pointing UP
        ctx.moveTo(32, 15); // Tip
        ctx.lineTo(22, 40); // Bottom Left
        ctx.lineTo(42, 40); // Bottom Right
        ctx.closePath();
        ctx.fill();

        return canvas.toDataURL();
    }
}
