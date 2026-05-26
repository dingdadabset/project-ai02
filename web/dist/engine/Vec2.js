/**
 * Vec2 - 2D 向量
 */
export class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    setFrom(v) {
        this.x = v.x;
        this.y = v.y;
        return this;
    }
    clone() {
        return new Vec2(this.x, this.y);
    }
    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }
    scale(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    lengthSqr() {
        return this.x * this.x + this.y * this.y;
    }
    normalize() {
        const len = this.length();
        if (len > 0.0001) {
            this.x /= len;
            this.y /= len;
        }
        else {
            this.x = 0;
            this.y = 0;
        }
        return this;
    }
    distanceTo(v) {
        const dx = v.x - this.x;
        const dy = v.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    distanceToSqr(v) {
        const dx = v.x - this.x;
        const dy = v.y - this.y;
        return dx * dx + dy * dy;
    }
    static zero() { return new Vec2(0, 0); }
}
//# sourceMappingURL=Vec2.js.map