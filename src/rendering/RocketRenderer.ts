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
        const group = new THREE.Group();

        // If rocket has a part stack (from Hangar), render it
        if (rocket.partStack && rocket.partStack.length > 0) {
            // Find min/max Y to center the rocket
            // If rocket has calculated CoM, align mesh so CoM is at (0,0) (Visual Pivot)
            let centerOffsetY = 0;
            let centerOffsetX = 0;

            if (rocket.centerOfMass) {
                centerOffsetY = rocket.centerOfMass.y;
                centerOffsetX = rocket.centerOfMass.x;
            } else {
                const positions = rocket.partStack.map(p => p.position.y);
                const minY = Math.min(...positions.map((y, i) => y - rocket.partStack![i].definition.height / 2));
                const maxY = Math.max(...positions.map((y, i) => y + rocket.partStack![i].definition.height / 2));
                centerOffsetY = (maxY + minY) / 2;
            }

            // Render each part
            rocket.partStack.forEach(part => {
                const def = part.definition;

                // Special handling for fairings - render two halves
                if (def.type === 'fairing' && def.visual?.textureLeft && def.visual?.textureRight) {
                    // Create a sub-group for the fairing halves
                    const fairingGroup = new THREE.Group();

                    // Left half
                    const textureLeft = this.textureLoader.load(def.visual.textureLeft);
                    const geometryLeft = new THREE.PlaneGeometry(def.width / 2, def.height);
                    const materialLeft = new THREE.MeshBasicMaterial({
                        map: textureLeft,
                        transparent: true,
                        side: THREE.DoubleSide
                    });
                    const meshLeft = new THREE.Mesh(geometryLeft, materialLeft);
                    meshLeft.position.x = -def.width / 4;
                    fairingGroup.add(meshLeft);

                    // Right half
                    const textureRight = this.textureLoader.load(def.visual.textureRight);
                    const geometryRight = new THREE.PlaneGeometry(def.width / 2, def.height);
                    const materialRight = new THREE.MeshBasicMaterial({
                        map: textureRight,
                        transparent: true,
                        side: THREE.DoubleSide
                    });
                    const meshRight = new THREE.Mesh(geometryRight, materialRight);
                    meshRight.position.x = def.width / 4;
                    fairingGroup.add(meshRight);

                    // Position relative to Center of Mass
                    fairingGroup.position.x = (part.position.x || 0) - centerOffsetX;
                    fairingGroup.position.y = (part.position.y || 0) - centerOffsetY;
                    fairingGroup.rotation.z = part.rotation || 0;

                    if (part.flipped) {
                        fairingGroup.scale.x = -1;
                    }

                    group.add(fairingGroup);
                } else {
                    // Standard single texture rendering
                    const texture = this.textureLoader.load(def.texture);
                    const geometry = new THREE.PlaneGeometry(def.width, def.height);
                    const material = new THREE.MeshBasicMaterial({
                        map: texture,
                        transparent: true,
                        side: THREE.DoubleSide
                    });
                    const mesh = new THREE.Mesh(geometry, material);

                    // Position relative to Center of Mass
                    mesh.position.x = (part.position.x || 0) - centerOffsetX;
                    mesh.position.y = (part.position.y || 0) - centerOffsetY;

                    // Rotation
                    mesh.rotation.z = part.rotation || 0;

                    // Mirror/Scale
                    if (part.flipped) {
                        mesh.scale.x = -1;
                    }

                    group.add(mesh);

                    // Render deployed parachute
                    if (part.definition.type === 'parachute' && part.deployed) {
                        const chute = this.createParachuteVisuals(part);
                        chute.position.x = mesh.position.x;
                        // Position chute above the part (relative to rotation?)
                        // The createParachuteVisuals method will handle the offset relative to the part center
                        chute.position.y = mesh.position.y;
                        chute.rotation.z = mesh.rotation.z;
                        // Flip if needed
                        if (part.flipped) {
                            chute.scale.x = -1;
                        }
                        group.add(chute);
                    }
                }
            });

            return group;
        }

        // Otherwise, use default design

        // Ensure textures are loaded for default design
        if (!this.textures.capsule) {
            this.loadTextures();
        }

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

        // Calculate flame position
        let flameY = -rocket.engineHeight * 0.5; // Default for simple rocket

        if (rocket.partStack && rocket.partStack.length > 0) {
            // Find bottom of the rocket
            const positions = rocket.partStack.map(p => p.position.y);
            const minY = Math.min(...positions.map((y, i) => y - rocket.partStack![i].definition.height / 2));
            const maxY = Math.max(...positions.map((y, i) => y + rocket.partStack![i].definition.height / 2));
            const centerOffset = (maxY + minY) / 2;

            // Flame starts at the bottom
            flameY = minY - centerOffset;
        }

        flame.position.y = flameY;

        return flame;
    }

    /**
     * Get the position of the engine nozzle relative to the rocket center
     * Returns Y offset (negative value)
     */
    static getNozzlePosition(rocket: Rocket): number {
        let nozzleY = 0;

        if (rocket.partStack && rocket.partStack.length > 0) {
            // Find bottom of the rocket
            const positions = rocket.partStack.map(p => p.position.y);
            const minY = Math.min(...positions.map((y, i) => y - rocket.partStack![i].definition.height / 2));
            const maxY = Math.max(...positions.map((y, i) => y + rocket.partStack![i].definition.height / 2));
            const centerOffset = (maxY + minY) / 2;

            // Nozzle is at the bottom
            nozzleY = minY - centerOffset;
        } else {
            // Default rocket logic (must match createRocketMesh)
            const totalHeight = rocket.engineHeight + rocket.tankHeight + rocket.capsuleHeight;
            const centerOffset = totalHeight / 2;

            // Engine is at the bottom. Bottom Y is -centerOffset.
            // We want the nozzle to be slightly below the engine sprite or at its bottom edge.
            nozzleY = -centerOffset;
        }

        return nozzleY;
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
     * Create center of gravity marker (crosshair)
     */
    static createCoGMarker(): THREE.Group {
        const group = new THREE.Group();

        // Create crosshair lines
        const lineLength = 2; // meters in local space
        const lineWidth = 0.1;

        // Horizontal line
        const hLineGeometry = new THREE.PlaneGeometry(lineLength, lineWidth);
        const lineMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF00FF, // Magenta for CoG
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const hLine = new THREE.Mesh(hLineGeometry, lineMaterial);
        group.add(hLine);

        // Vertical line
        const vLineGeometry = new THREE.PlaneGeometry(lineWidth, lineLength);
        const vLine = new THREE.Mesh(vLineGeometry, lineMaterial.clone());
        group.add(vLine);

        // Center circle
        const circleGeometry = new THREE.CircleGeometry(0.3, 32);
        const circleMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF00FF,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const circle = new THREE.Mesh(circleGeometry, circleMaterial);
        group.add(circle);

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
                mesh.position.x = part.position.x || 0;
                mesh.position.y = part.position.y - centerOffset;
                mesh.rotation.z = part.rotation || 0;

                if (part.flipped) {
                    mesh.scale.x = -1;
                }

                group.add(mesh);
            });
        }

        return group;
    }

    /**
     * Create parachute visuals (canopy + lines)
     */
    static createParachuteVisuals(_part: any): THREE.Group {
        const group = new THREE.Group();

        // Dimensions
        const chuteDiameter = 10; // Large 10m chute
        const chuteHeight = 12;   // Distance from part

        // 1. Canopy (Semi-circle / Dome shape)
        // In 2D, just a Chord or Arc shape
        const canopyShape = new THREE.Shape();
        // FLIP: Draw arc upwards (0 to PI) but starting from chuteHeight?
        // Previously: absarc(0, chuteHeight, d/2, PI, 0, false) -> Top half circle
        // User says it looked inverted.
        // Let's try drawing it "upwards" relative to attach point.
        // If (0,0) is attach point, chute is at +chuteHeight.

        // Let's draw the arc from 0 to PI (top half)
        // THREE.absarc(aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise)
        // We want a dome (n shape). 
        // 0 is East (Right). PI is West (Left).
        // Counter-Clockwise (false) goes 0 -> PI via Top (Up).
        canopyShape.absarc(0, chuteHeight, chuteDiameter / 2, 0, Math.PI, false);

        // Close the shape? Or leave as arc? Shape needs to be closed for ShapeGeometry
        // Let's make it a mushroom shape
        // Flatten bottom
        canopyShape.lineTo(chuteDiameter / 2, chuteHeight);

        const canopyGeom = new THREE.ShapeGeometry(canopyShape);
        const canopyMat = new THREE.MeshBasicMaterial({
            color: 0xFFA500, // Orange
            side: THREE.DoubleSide
        });

        // Ensure parachute is visible above rocket
        group.scale.set(1, 1, 1); // Reset scale in case it inherits weirdly
        const canopy = new THREE.Mesh(canopyGeom, canopyMat);
        group.add(canopy);

        // 2. Lines
        const lineMat = new THREE.LineBasicMaterial({ color: 0xDDDDDD });
        const lineGeo = new THREE.BufferGeometry();
        const positions = [];

        // Connect part center (0,0) to canopy edges
        // Left line
        positions.push(0, 0, 0);
        positions.push(-chuteDiameter / 2, chuteHeight, 0);

        // Right line
        positions.push(0, 0, 0);
        positions.push(chuteDiameter / 2, chuteHeight, 0);

        // Inner lines
        positions.push(0, 0, 0);
        positions.push(-chuteDiameter / 4, chuteHeight + 1, 0); // Slightly higher attach point on curve

        positions.push(0, 0, 0);
        positions.push(chuteDiameter / 4, chuteHeight + 1, 0);

        lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const lines = new THREE.LineSegments(lineGeo, lineMat);
        group.add(lines);

        return group;
    }
}
