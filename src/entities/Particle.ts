import { Vector2 } from '../core/Vector2';

export class Particle {
    position: Vector2;
    velocity: Vector2;
    color: string;
    size: number;
    lifetime: number;
    maxLifetime: number;

    constructor(position: Vector2, velocity: Vector2, color: string, size: number, lifetime: number) {
        this.position = position;
        this.velocity = velocity;
        this.color = color;
        this.size = size;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
    }

    update(dt: number) {
        this.position = this.position.add(this.velocity.scale(dt));
        this.lifetime -= dt;
    }

    isDead(): boolean {
        return this.lifetime <= 0;
    }

    getOpacity(): number {
        return Math.max(0, this.lifetime / this.maxLifetime);
    }
}
