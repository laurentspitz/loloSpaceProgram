import * as THREE from 'three';

export class GasGiantMaterial extends THREE.ShaderMaterial {
    constructor(parameters: {
        baseColor: THREE.Color;
        secondaryColor: THREE.Color;
        tertiaryColor?: THREE.Color;
        seed: number;
        time?: number;
        hasSpot?: boolean;
    }) {
        super({
            uniforms: {
                uTime: { value: parameters.time || 0 },
                uBaseColor: { value: parameters.baseColor },
                uSecondaryColor: { value: parameters.secondaryColor },
                uTertiaryColor: { value: parameters.tertiaryColor || new THREE.Color(0xffffff) },
                uSeed: { value: parameters.seed },
                uScale: { value: 1.0 },
                uHasSpot: { value: parameters.hasSpot ? 1.0 : 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vViewPosition;

                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uBaseColor;
                uniform vec3 uSecondaryColor;
                uniform vec3 uTertiaryColor;
                uniform float uSeed;
                uniform float uHasSpot;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vViewPosition;

                // Simplex 2D noise
                vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

                float snoise(vec2 v){
                    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                            -0.577350269189626, 0.024390243902439);
                    vec2 i  = floor(v + dot(v, C.yy) );
                    vec2 x0 = v -   i + dot(i, C.xx);
                    vec2 i1;
                    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                    vec4 x12 = x0.xyxy + C.xxzz;
                    x12.xy -= i1;
                    i = mod(i, 289.0);
                    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                        + i.x + vec3(0.0, i1.x, 1.0 ));
                    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                    m = m*m ;
                    m = m*m ;
                    vec3 x = 2.0 * fract(p * C.www) - 1.0;
                    vec3 h = abs(x) - 0.5;
                    vec3 ox = floor(x + 0.5);
                    vec3 a0 = x - ox;
                    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                    vec3 g;
                    g.x  = a0.x  * x0.x  + h.x  * x0.y;
                    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                    return 130.0 * dot(m, g);
                }

                // High-frequency noise (Hash) - Much cheaper than snoise
                float hash(vec2 p) {
                    p = fract(p * vec2(123.34, 456.21));
                    p += dot(p, p + 45.32);
                    return fract(p.x * p.y);
                }

                void main() {
                    // Differential rotation: speed varies with latitude (y)
                    float rotationSpeed = 0.00005 + 0.0001 * sin(vUv.y * 3.14159);
                    float xOffset = uTime * rotationSpeed;
                    
                    // Create bands using sine waves on y-axis
                    float bands = sin(vUv.y * 18.0 + uSeed * 10.0) * 0.5 + 0.5;
                    bands += sin(vUv.y * 45.0 + uSeed * 20.0) * 0.15;
                    bands += sin(vUv.y * 8.0 + uSeed * 5.0) * 0.3;
                    
                    // Add turbulence using noise
                    vec2 noiseUv = vec2(vUv.x * 6.0 + xOffset, vUv.y * 20.0);
                    float turbulence = snoise(noiseUv);
                    
                    // Distort bands with turbulence
                    float pattern = bands + turbulence * 0.2;
                    
                    // Mix colors based on pattern
                    vec3 finalColor;
                    if (pattern < 0.4) {
                        finalColor = mix(uSecondaryColor, uTertiaryColor, smoothstep(0.0, 0.4, pattern));
                    } else if (pattern < 0.7) {
                        finalColor = mix(uTertiaryColor, uSecondaryColor, smoothstep(0.4, 0.7, pattern));
                    } else {
                        finalColor = mix(uSecondaryColor, uBaseColor, smoothstep(0.7, 1.0, pattern));
                    }

                    // POLE COLORING
                    float distFromEquator = abs(vUv.y - 0.5);
                    float poleMix = smoothstep(0.35, 0.48, distFromEquator);
                    finalColor = mix(finalColor, uBaseColor, poleMix * 0.8);
                    
                    // GREAT RED SPOT (Vortex)
                    if (uHasSpot > 0.5) {
                        float spotLat = 0.35;
                        float spotRadius = 0.12;
                        float spotX = 0.5; // Centered
                        
                        float dx = abs(vUv.x - spotX);
                        if (dx > 0.5) dx = 1.0 - dx;
                        float dy = (vUv.y - spotLat) * 2.0;
                        float dist = sqrt(dx*dx + dy*dy);
                        
                        if (dist < spotRadius) {
                            float angle = atan(dy, dx);
                            float radius = dist / spotRadius;
                            float swirl = (1.0 - radius) * 10.0;
                            
                            // Slower animation: uTime * 0.2
                            float vortexNoise = snoise(vec2(vUv.x * 20.0 + cos(angle + swirl + uTime * 0.2) * 0.5, vUv.y * 20.0 + sin(angle + swirl + uTime * 0.2) * 0.5));
                            
                            float spotIntensity = smoothstep(spotRadius, spotRadius * 0.5, dist);
                            vec3 spotColor = mix(uSecondaryColor, uTertiaryColor, 0.9 + vortexNoise * 0.1);
                            finalColor = mix(finalColor, spotColor, spotIntensity);
                        }
                    }
                    
                    // Add high-frequency grain (Hash) - Fixes blurriness and is cheap
                    float grain = hash(vUv * 1000.0 + uTime * 0.01);
                    finalColor += (grain - 0.5) * 0.05;

                    // Fresnel effect
                    vec3 viewDir = normalize(vViewPosition);
                    float fresnel = dot(viewDir, vNormal);
                    fresnel = clamp(fresnel, 0.0, 1.0);
                    
                    // Darken the edge slightly to simulate density
                    finalColor *= smoothstep(0.0, 0.3, fresnel);

                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        });
    }

    update(time: number) {
        this.uniforms.uTime.value = time;
    }
}
