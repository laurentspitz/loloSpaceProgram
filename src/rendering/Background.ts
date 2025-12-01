import * as THREE from 'three';

/**
 * Background - Manages the scene background (starfield)
 */
export class Background {
    static createStarfield(): THREE.Points {
        const starsGeometry = new THREE.BufferGeometry();
        const starCount = 2000;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            // Spread stars across a large area
            positions[i * 3] = (Math.random() - 0.5) * 4000;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 4000;
            positions[i * 3 + 2] = -500; // Behind everything

            // Varied star sizes (0.5 to 3.0 pixels)
            sizes[i] = 0.5 + Math.random() * 2.5;

            // Slight color variation (white to blue-white) with varied brightness
            const brightness = 0.6 + Math.random() * 0.4;
            const blueShift = Math.random() * 0.2; // Some stars more blue
            colors[i * 3] = brightness - blueShift * 0.1;
            colors[i * 3 + 1] = brightness - blueShift * 0.05;
            colors[i * 3 + 2] = Math.min(1.0, brightness + blueShift);
        }

        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const starsMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: false // Stars don't get smaller with distance/zoom
        });

        return new THREE.Points(starsGeometry, starsMaterial);
    }
}
