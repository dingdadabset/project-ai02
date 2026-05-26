/**
 * Vec2 - 2D 向量
 */
export class Vec2 {
    constructor(public x: number = 0, public y: number = 0) {}

    set(x: number, y: number): this {
        this.x = x; this.y = y;
        return this;
    }

    setFrom(v: Vec2): this {
        this.x = v.x; this.y = v.y;
        return this;
    }

    clone(): Vec2 {
        return new Vec2(this.x, this.y);
    }

    add(v: Vec2): this {
        this.x += v.x; this.y += v.y;
        return this;
    }

    sub(v: Vec2): this {
        this.x -= v.x; this.y -= v.y;
        return this;
    }

    scale(s: number): this {
        this.x *= s; this.y *= s;
        return this;
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    lengthSqr(): number {
        return this.x * this.x + this.y * this.y;
    }

    normalize(): this {
        const len = this.length();
        if (len > 0.0001) {
            this.x /= len;
            this.y /= len;
        } else {
            this.x = 0; this.y = 0;
        }
        return this;
    }

    distanceTo(v: Vec2): number {
        const dx = v.x - this.x;
        const dy = v.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    distanceToSqr(v: Vec2): number {
        const dx = v.x - this.x;
        const dy = v.y - this.y;
        return dx * dx + dy * dy;
    }

    static zero(): Vec2 { return new Vec2(0, 0); }
}
