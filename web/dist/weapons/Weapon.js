import { Vec2 } from '../engine/Vec2.js';
export class WeaponBase {
    constructor(player, combat, spawn) {
        this.id = '';
        this.name = '';
        this.level = 1;
        this.maxLevel = 5;
        this.damage = 10;
        this.attackSpeed = 1;
        this.count = 1;
        this._attackTimer = 0;
        this._player = player;
        this._combat = combat;
        this._spawn = spawn;
    }
    update(dt) {
        this._attackTimer += dt;
        const interval = 1000 / this.attackSpeed;
        if (this._attackTimer >= interval) {
            this._attackTimer -= interval;
            this.attack();
        }
        this.onUpdate(dt);
    }
    onUpdate(dt) { }
    render(renderer) { }
    upgrade() {
        if (this.level >= this.maxLevel)
            return;
        this.level++;
        this.applyLevel();
    }
}
// =====================================
// 1) 旋转刀刃
// =====================================
export class RotatingBlade extends WeaponBase {
    constructor(player, combat, spawn) {
        super(player, combat, spawn);
        this.id = 'rotating_blade';
        this.name = '旋转刀刃';
        this._angle = 0;
        this._rotateSpeed = Math.PI; // 弧度/秒
        this._orbitRadius = 80;
        this._hitCooldowns = new Map();
        this._hitCooldownMs = 500;
        this.damage = 12;
        this.attackSpeed = 100; // 持续判定不依赖间隔
        this.count = 1;
    }
    attack() {
        // 持续旋转命中由 onUpdate 处理
    }
    onUpdate(dt) {
        const dtSec = dt / 1000;
        this._angle += this._rotateSpeed * dtSec;
        // 检查命中冷却
        for (const [k, v] of this._hitCooldowns) {
            const nv = v - dt;
            if (nv <= 0)
                this._hitCooldowns.delete(k);
            else
                this._hitCooldowns.set(k, nv);
        }
        // 命中检测
        const positions = this._getBladePositions();
        for (const pos of positions) {
            const targets = this._combat.getEnemiesNear(pos.x, pos.y, 25);
            for (const e of targets) {
                if (!e.alive)
                    continue;
                if (this._hitCooldowns.has(e))
                    continue;
                const dx = e.pos.x - pos.x;
                const dy = e.pos.y - pos.y;
                const r = e.radius + 18;
                if (dx * dx + dy * dy < r * r) {
                    this._combat.dealDamageToEnemy(e, this.damage);
                    this._hitCooldowns.set(e, this._hitCooldownMs);
                }
            }
        }
    }
    _getBladePositions() {
        const result = [];
        const step = (Math.PI * 2) / this.count;
        for (let i = 0; i < this.count; i++) {
            const a = this._angle + step * i;
            result.push(new Vec2(this._player.pos.x + Math.cos(a) * this._orbitRadius, this._player.pos.y + Math.sin(a) * this._orbitRadius));
        }
        return result;
    }
    render(renderer) {
        for (const pos of this._getBladePositions()) {
            // 刀刃用旋转的小条
            renderer.withRotation(pos.x, pos.y, this._angle * 2, () => {
                renderer.drawRect(-12, -3, 24, 6, '#cccccc', '#222', 1);
            });
        }
    }
    applyLevel() {
        switch (this.level) {
            case 2:
                this.damage = 18;
                this._rotateSpeed = Math.PI * 1.2;
                break;
            case 3:
                this.damage = 18;
                this.count = 2;
                break;
            case 4:
                this.damage = 28;
                this._orbitRadius = 100;
                break;
            case 5:
                this.damage = 32;
                this.count = 3;
                this._rotateSpeed = Math.PI * 1.5;
                break;
        }
    }
}
// =====================================
// 2) 火球术
// =====================================
export class Fireball extends WeaponBase {
    constructor(player, combat, spawn) {
        super(player, combat, spawn);
        this.id = 'fireball';
        this.name = '火球术';
        this._projectileSpeed = 450;
        this._lifetime = 2500;
        this._pierce = 0;
        this.damage = 30;
        this.attackSpeed = 0.6;
        this.count = 1;
    }
    attack() {
        const target = this._combat.getNearestEnemy(this._player.pos.x, this._player.pos.y, 500);
        if (!target)
            return;
        for (let i = 0; i < this.count; i++) {
            const dx = target.pos.x - this._player.pos.x;
            const dy = target.pos.y - this._player.pos.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            let nx = dx / len;
            let ny = dy / len;
            // 多发散射
            if (this.count > 1) {
                const offset = (i - (this.count - 1) / 2) * 0.25; // 弧度
                const cos = Math.cos(offset);
                const sin = Math.sin(offset);
                const nnx = nx * cos - ny * sin;
                const nny = nx * sin + ny * cos;
                nx = nnx;
                ny = nny;
            }
            const p = this._spawn.getProjectileFromPool();
            p.init(this._player.pos.x, this._player.pos.y, {
                damage: this.damage,
                speed: this._projectileSpeed,
                direction: new Vec2(nx, ny),
                lifetime: this._lifetime,
                pierceCount: this._pierce,
                radius: 7,
                color: '#ff8533',
                ownerTag: 'player',
                trail: true,
            });
            this._combat.addProjectile(p);
        }
    }
    applyLevel() {
        switch (this.level) {
            case 2:
                this.damage = 40;
                this._projectileSpeed = 500;
                break;
            case 3:
                this.damage = 45;
                this.count = 2;
                break;
            case 4:
                this.damage = 55;
                this.attackSpeed = 0.8;
                this._pierce = 1;
                break;
            case 5:
                this.damage = 70;
                this.count = 3;
                this._pierce = 2;
                break;
        }
    }
}
// =====================================
// 3) 闪电链
// =====================================
export class LightningChain extends WeaponBase {
    constructor(player, combat, spawn) {
        super(player, combat, spawn);
        this.id = 'lightning_chain';
        this.name = '闪电链';
        this._chainCount = 3;
        this._chainRange = 200;
        this._decay = 0.8;
        this._visualLines = [];
        this.damage = 18;
        this.attackSpeed = 0.8;
        this.count = 1;
    }
    attack() {
        for (let c = 0; c < this.count; c++) {
            const first = this._combat.getNearestEnemy(this._player.pos.x, this._player.pos.y, 350);
            if (!first)
                return;
            const hit = new Set();
            let cur = first;
            let dmg = this.damage;
            let lastX = this._player.pos.x;
            let lastY = this._player.pos.y;
            for (let i = 0; i < this._chainCount; i++) {
                if (!cur || !cur.alive)
                    break;
                this._combat.dealDamageToEnemy(cur, dmg);
                hit.add(cur);
                this._visualLines.push({
                    x1: lastX, y1: lastY, x2: cur.pos.x, y2: cur.pos.y, alpha: 1,
                });
                lastX = cur.pos.x;
                lastY = cur.pos.y;
                dmg = Math.floor(dmg * this._decay);
                if (dmg < 1)
                    break;
                // 找下一个目标
                const candidates = this._combat.getEnemiesNear(cur.pos.x, cur.pos.y, this._chainRange);
                let next = null;
                let minD = this._chainRange * this._chainRange;
                for (const e of candidates) {
                    if (hit.has(e) || !e.alive)
                        continue;
                    const dx = e.pos.x - cur.pos.x;
                    const dy = e.pos.y - cur.pos.y;
                    const d = dx * dx + dy * dy;
                    if (d < minD) {
                        minD = d;
                        next = e;
                    }
                }
                cur = next;
            }
        }
    }
    onUpdate(dt) {
        for (let i = this._visualLines.length - 1; i >= 0; i--) {
            this._visualLines[i].alpha -= dt / 200;
            if (this._visualLines[i].alpha <= 0)
                this._visualLines.splice(i, 1);
        }
    }
    render(renderer) {
        for (const l of this._visualLines) {
            renderer.withAlpha(l.alpha, () => {
                renderer.drawLine(l.x1, l.y1, l.x2, l.y2, '#7afaff', 4);
                renderer.drawLine(l.x1, l.y1, l.x2, l.y2, '#fff', 2);
            });
        }
    }
    applyLevel() {
        switch (this.level) {
            case 2:
                this.damage = 22;
                this._chainCount = 4;
                break;
            case 3:
                this.damage = 28;
                this.attackSpeed = 1.0;
                break;
            case 4:
                this.damage = 32;
                this._chainCount = 5;
                this._decay = 0.85;
                break;
            case 5:
                this.damage = 40;
                this._chainCount = 6;
                this.count = 2;
                break;
        }
    }
}
// =====================================
// 4) 冰霜新星
// =====================================
export class FrostNova extends WeaponBase {
    constructor(player, combat, spawn) {
        super(player, combat, spawn);
        this.id = 'frost_nova';
        this.name = '冰霜新星';
        this._aoeRadius = 130;
        this._slowPercent = 0.3;
        this._slowDuration = 2000;
        this._visualPulses = [];
        this.damage = 14;
        this.attackSpeed = 0.4;
    }
    attack() {
        this._combat.dealAoeDamage(this._player.pos.x, this._player.pos.y, this._aoeRadius, this.damage);
        this._visualPulses.push({ x: this._player.pos.x, y: this._player.pos.y, r: 10, alpha: 1 });
    }
    onUpdate(dt) {
        const dtSec = dt / 1000;
        for (let i = this._visualPulses.length - 1; i >= 0; i--) {
            const p = this._visualPulses[i];
            p.r += this._aoeRadius * 4 * dtSec;
            p.alpha -= dtSec * 2;
            if (p.alpha <= 0 || p.r >= this._aoeRadius * 1.5) {
                this._visualPulses.splice(i, 1);
            }
        }
    }
    render(renderer) {
        for (const p of this._visualPulses) {
            renderer.withAlpha(p.alpha, () => {
                renderer.drawCircle(p.x, p.y, p.r, undefined, '#88ddff', 4);
                renderer.drawCircle(p.x, p.y, p.r * 0.85, undefined, '#fff', 2);
            });
        }
    }
    applyLevel() {
        switch (this.level) {
            case 2:
                this.damage = 18;
                this._aoeRadius = 160;
                break;
            case 3:
                this.damage = 24;
                this._slowPercent = 0.4;
                this.attackSpeed = 0.5;
                break;
            case 4:
                this.damage = 30;
                this._aoeRadius = 200;
                this._slowDuration = 3000;
                break;
            case 5:
                this.damage = 42;
                this._aoeRadius = 240;
                this._slowPercent = 0.5;
                break;
        }
    }
}
// =====================================
// 武器工厂
// =====================================
export function createWeapon(id, player, combat, spawn) {
    switch (id) {
        case 'rotating_blade': return new RotatingBlade(player, combat, spawn);
        case 'fireball': return new Fireball(player, combat, spawn);
        case 'lightning_chain': return new LightningChain(player, combat, spawn);
        case 'frost_nova': return new FrostNova(player, combat, spawn);
    }
    return null;
}
//# sourceMappingURL=Weapon.js.map