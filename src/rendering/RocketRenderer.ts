import * as THREE from 'three';
import { Rocket } from '../entities/Rocket';

/**
 * RocketRenderer - Handles visual representation of the rocket
 * Draws a 3-part rocket: triangle capsule + rectangle tank + trapezoid engine
 */
export class RocketRenderer {
    /**
     * Create rocket geometry and material
     */
    static createRocketMesh(rocket: Rocket): THREE.Group {
        const group = new THREE.Group();

        const width = rocket.width;
        const capsuleH = rocket.capsuleHeight;
        const tankH = rocket.tankHeight;
        const engineH = rocket.engineHeight;

        // Colors
        const capsuleColor = 0xE74C3C;  // Red capsule
        const tankColor = 0xECF0F1;     // Light gray tank
        const engineColor = 0x34495E;   // Dark gray engine

        // Calculate positions to center the rocket vertically
        // Total height = engineH + tankH + capsuleH
        // We want the center of mass (roughly middle of tank) to be at y=0
        const totalHeight = engineH + tankH + capsuleH;
        const centerOffset = totalHeight / 2;

        const engineY = -centerOffset;
        const tankY = engineY + engineH;
        const capsuleY = tankY + tankH;

        // 1. Engine (Bell Nozzle shape)
        const engineShape = new THREE.Shape();
        const ew = width;
        const eh = rocket.engineHeight;

        // Bell shape points
        engineShape.moveTo(-ew * 0.4, 0);           // Top left (narrower than tank)
        engineShape.lineTo(ew * 0.4, 0);            // Top right

        // Curve down to bottom
        engineShape.bezierCurveTo(
            ew * 0.6, -eh * 0.5,   // Control point 1
            ew * 0.8, -eh,         // Control point 2
            ew * 0.7, -eh          // Bottom right
        );

        engineShape.lineTo(-ew * 0.7, -eh);         // Bottom left

        // Curve back up
        engineShape.bezierCurveTo(
            -ew * 0.8, -eh,        // Control point 1
            -ew * 0.6, -eh * 0.5,  // Control point 2
            -ew * 0.4, 0           // Back to top left
        );

        const engineGeometry = new THREE.ShapeGeometry(engineShape);
        const engineMaterial = new THREE.MeshBasicMaterial({ color: engineColor });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.y = engineY;
        group.add(engine);

        // Engine outline
        const engineOutlineGeometry = new THREE.EdgesGeometry(engineGeometry);
        const engineOutline = new THREE.LineSegments(
            engineOutlineGeometry,
            new THREE.LineBasicMaterial({ color: 0x1A252F })
        );
        engineOutline.position.copy(engine.position);
        group.add(engineOutline);

        // 2. Fuel Tank (rectangle in middle)
        const tankGeometry = new THREE.PlaneGeometry(width, tankH);
        const tankMaterial = new THREE.MeshBasicMaterial({ color: tankColor });
        const tank = new THREE.Mesh(tankGeometry, tankMaterial);
        tank.position.y = tankY + tankH / 2;
        group.add(tank);

        // Tank outline
        const tankOutlineGeometry = new THREE.EdgesGeometry(tankGeometry);
        const tankOutline = new THREE.LineSegments(
            tankOutlineGeometry,
            new THREE.LineBasicMaterial({ color: 0x2C3E50 })
        );
        tankOutline.position.copy(tank.position);
        group.add(tankOutline);

        // 3. Capsule (triangle at top)
        const capsuleShape = new THREE.Shape();
        capsuleShape.moveTo(-width / 2, 0);           // Bottom left
        capsuleShape.lineTo(width / 2, 0);            // Bottom right
        capsuleShape.lineTo(0, capsuleH);             // Top point
        capsuleShape.closePath();

        const capsuleGeometry = new THREE.ShapeGeometry(capsuleShape);
        const capsuleMaterial = new THREE.MeshBasicMaterial({ color: capsuleColor });
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
}
