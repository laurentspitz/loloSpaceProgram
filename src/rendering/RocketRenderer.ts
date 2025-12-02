import * as THREE from 'three';
import { Rocket } from '../entities/Rocket';
import { Debris } from '../entities/Debris';

/**
 * RocketRenderer - Handles visual representation of the rocket
 * Draws a 3-part rocket with textures: capsule + tank + engine
 */
export class RocketRenderer {
    private static textureLoader = new THREE.TextureLoader();
    private static textures: {
        capsule?: THREE.Texture;
        tank?: THREE.Texture;
        engine?: THREE.Texture;
    } = {};

    /**
     * Preload textures
     */
    static loadTextures() {
        this.textures.capsule = this.textureLoader.load('/textures/Command_Pod_Mk1.png');
        this.textures.tank = this.textureLoader.load('/textures/X200-32_White.png');
        this.textures.engine = this.textureLoader.load('/textures/LV-T30_Liquid_Fuel_Engine_recent.png');
    }

    /**
     * Create rocket geometry with textures
     */
    static createRocketMesh(rocket: Rocket): THREE.Group {
        // Ensure textures are loaded
        if (!this.textures.capsule) {
            this.loadTextures();
        }

        const group = new THREE.Group();

        // If rocket has a part stack (from Hangar), render it
        if (rocket.partStack && rocket.partStack.length > 0) {
            // Find min/max Y to center the rocket
            const positions = rocket.partStack.map(p => p.position.y);
            const minY = Math.min(...positions.map((y, i) => y - rocket.partStack![i].definition.height / 2));
            const maxY = Math.max(...positions.map((y, i) => y + rocket.partStack![i].definition.height / 2));
            const centerOffset = (maxY + minY) / 2;

            // Render each part
            rocket.partStack.forEach(part => {
                const def = part.definition;
                const texture = this.textureLoader.load(def.texture);
                const geometry = new THREE.PlaneGeometry(def.width, def.height);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    side: THREE.DoubleSide
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.y = part.position.y - centerOffset;
                group.add(mesh);
            });

            return group;
        }

        // Otherwise, use default design
        const width = rocket.width;
        const capsuleH = rocket.capsuleHeight;
        const tankH = rocket.tankHeight;
        const engineH = rocket.engineHeight;

        // Calculate positions to center the rocket vertically
        const totalHeight = engineH + tankH + capsuleH;
        const centerOffset = totalHeight / 2;

        // Position components flush against each other
        const engineY = -centerOffset + engineH / 2;
        const tankY = -centerOffset + engineH + tankH / 2;
        const capsuleY = -centerOffset + engineH + tankH + capsuleH / 2;

        // Component Widths (Mk1 and LV-T30 are narrower than X200-32)
        const tankWidth = width;
        const capsuleWidth = width * 0.5; // 1.25m vs 2.5m
        const engineWidth = width * 0.5;  // 1.25m vs 2.5m

        // 1. Engine (with texture)
        const engineGeometry = new THREE.PlaneGeometry(engineWidth, engineH);
        const engineMaterial = new THREE.MeshBasicMaterial({
            map: this.textures.engine,
            transparent: true,
            side: THREE.DoubleSide
        });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.y = engineY;
        group.add(engine);

        // 2. Fuel Tank (with texture)
        const tankGeometry = new THREE.PlaneGeometry(tankWidth, tankH);
        const tankMaterial = new THREE.MeshBasicMaterial({
            map: this.textures.tank,
            transparent: true,
            side: THREE.DoubleSide
        });
        const tank = new THREE.Mesh(tankGeometry, tankMaterial);
        tank.position.y = tankY;
        group.add(tank);

        // 3. Capsule (with texture)
        const capsuleGeometry = new THREE.PlaneGeometry(capsuleWidth, capsuleH);
        const capsuleMaterial = new THREE.MeshBasicMaterial({
            map: this.textures.capsule,
            transparent: true,
            side: THREE.DoubleSide
        });
        const capsule = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
        capsule.position.y = capsuleY;
        group.add(capsule);

        return group;
    }

    /**
     * Create thrust flame effect
     */
    static createThrustFlame(rocket: Rocket, throttle: number): THREE.Mesh | null {
        if (throttle <= 0 || !rocket.engine.hasFuel()) return null;

        const flameLength = rocket.engineHeight * 2 * throttle;
        const flameWidth = rocket.width * 0.8;

        // Create flame shape (triangle)
        const flameShape = new THREE.Shape();
        flameShape.moveTo(-flameWidth / 2, 0);
        flameShape.lineTo(flameWidth / 2, 0);
        flameShape.lineTo(0, -flameLength);
        flameShape.closePath();

        const flameGeometry = new THREE.ShapeGeometry(flameShape);

        // Flame color based on throttle (orange to white)
        const intensity = 0.5 + throttle * 0.5;
        const color = new THREE.Color(1, intensity * 0.6, 0);

        const flameMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7 + throttle * 0.3
        });

        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.y = -rocket.engineHeight * 0.5;

        return flame;
    }
    /**
     * Create velocity vector indicator
     */
    static createVelocityIndicator(): THREE.Group {
        const group = new THREE.Group();

        // Line
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 20, 0) // 20 units long
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFFF00 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        group.add(line);

        // Arrow head
        const headShape = new THREE.Shape();
        headShape.moveTo(-2, 20);
        headShape.lineTo(2, 20);
        headShape.lineTo(0, 25);
        headShape.closePath();

        const headGeometry = new THREE.ShapeGeometry(headShape);
        const headMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00, side: THREE.DoubleSide });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        group.add(head);

        return group;
    }
    /**
     * Create debris mesh from parts
     */
    static createDebrisMesh(debris: Debris): THREE.Group {
        const group = new THREE.Group();

        // Ensure textures are loaded
        if (!this.textures.capsule) {
            this.loadTextures();
        }

        if (debris.parts && debris.parts.length > 0) {
            // Find min/max Y to center the debris
            const positions = debris.parts.map((p: any) => p.position.y);
            const minY = Math.min(...positions.map((y: number, i: number) => y - debris.parts[i].definition.height / 2));
            const maxY = Math.max(...positions.map((y: number, i: number) => y + debris.parts[i].definition.height / 2));
            const centerOffset = (maxY + minY) / 2;

            debris.parts.forEach((part: any) => {
                const def = part.definition;
                const texture = this.textureLoader.load(def.texture);
                const geometry = new THREE.PlaneGeometry(def.width, def.height);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    side: THREE.DoubleSide
                });
                const mesh = new THREE.Mesh(geometry, material);
                // Position relative to center of debris
                mesh.position.y = part.position.y - centerOffset;
                group.add(mesh);
            });
        }

        return group;
    }
}
