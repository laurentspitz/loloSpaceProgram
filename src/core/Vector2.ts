export class Vector2 {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    add(v: Vector2): Vector2 {
        return new Vector2(this.x + v.x, this.y + v.y);
    }

    sub(v: Vector2): Vector2 {
        return new Vector2(this.x - v.x, this.y - v.y);
    }

    scale(s: number): Vector2 {
        return new Vector2(this.x * s, this.y * s);
    }

    mag(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize(): Vector2 {
        const m = this.mag();
        if (m === 0) return new Vector2(0, 0);
        return new Vector2(this.x / m, this.y / m);
    }

    distanceTo(v: Vector2): number {
        return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2));
    }

    distanceToSquared(v: Vector2): number {
        return Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2);
    }

    clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    // --- Mutable Methods (Optimization) ---

    set(x: number, y: number): this {
        this.x = x;
        this.y = y;
        return this;
    }

    copy(v: Vector2): this {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    addVectors(a: Vector2, b: Vector2): this {
        this.x = a.x + b.x;
        this.y = a.y + b.y;
        return this;
    }

    subVectors(a: Vector2, b: Vector2): this {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        return this;
    }

    scaleVector(v: Vector2, s: number): this {
        this.x = v.x * s;
        this.y = v.y * s;
        return this;
    }

    addInPlace(v: Vector2): this {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    subInPlace(v: Vector2): this {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    scaleInPlace(s: number): this {
        this.x *= s;
        this.y *= s;
        return this;
    }

    normalizeInPlace(): this {
        const m = this.mag();
        if (m === 0) {
            this.x = 0;
            this.y = 0;
        } else {
            this.x /= m;
            this.y /= m;
        }
        return this;
    }

    rotateAround(center: Vector2, angle: number): this {
        const c = Math.cos(angle);
        const s = Math.sin(angle);

        const x = this.x - center.x;
        const y = this.y - center.y;

        this.x = x * c - y * s + center.x;
        this.y = x * s + y * c + center.y;

        return this;
    }
}
