/**
 * Projectile - 投射物
 */
import { Vec2 } from '../engine/Vec2.js';
export class Projectile {
    constructor() {
        this.pos = new Vec2();
        this.alive = false;
        this.hitTargets = new Set();
        this._lifeTimer = 0;
        this._trail = [];
    }
    init(x, y, data) {
        this.pos.set(x, y);
        this.data = { ...data };
        this._lifeTimer = data.lifetime;
        this.alive = true;
        this.hitTargets.clear();
        this._trail = [];
    }
    update(dt) {
        if (!this.alive)
            return;
        const dtSec = dt / 1000;
        this.pos.x += this.data.direction.x * this.data.speed * dtSec;
        this.pos.y += this.data.direction.y * this.data.speed * dtSec;
        if (this.data.trail) {
            this._trail.unshift({ x: this.pos.x, y: this.pos.y, alpha: 1 });
            if (this._trail.length > 6)
                this._trail.pop();
            for (const t of this._trail)
                t.alpha *= 0.85;
        }
        this._lifeTimer -= dt;
        if (this._lifeTimer <= 0)
            this.alive = false;
    }
    hit(target) {
        if (this.hitTargets.has(target))
            return false;
        this.hitTargets.add(target);
        if (this.hitTargets.size > this.data.pierceCount) {
            this.alive = false;
        }
        return true;
    }
    render(renderer) {
        if (!this.alive)
            return;
        // 拖尾
        if (this.data.trail) {
            for (const t of this._trail) {
                renderer.withAlpha(t.alpha * 0.5, () => {
                    renderer.drawCircle(t.x, t.y, this.data.radius * 0.7, this.data.color);
                });
            }
        }
        // 主体
        renderer.drawCircle(this.pos.x, this.pos.y, this.data.radius, this.data.color, '#fff', 1);
    }
}
//# sourceMappingURL=Projectile.js.map