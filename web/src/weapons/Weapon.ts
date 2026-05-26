/**
 * Weapon - 武器基类与实现
 */
import { Player } from '../entities/Player.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { Renderer } from '../engine/Renderer.js';
import { Vec2 } from '../engine/Vec2.js';

export abstract class WeaponBase {
    public id: string = '';
    public name: string = '';
    public level: number = 1;
    public maxLevel: number = 5;
    public damage: number = 10;
    public attackSpeed: number = 1;
    public count: number = 1;

    protected _attackTimer: number = 0;
    protected _player: Player;
    protected _combat: CombatSystem;
    protected _spawn: SpawnSystem;

    constructor(player: Player, combat: CombatSystem, spawn: SpawnSystem) {
        this._player = player;
        this._combat = combat;
        this._spawn = spawn;
    }

    public update(dt: number): void {
        this._attackTimer += dt;
        const interval = 1000 / this.attackSpeed;
        if (this._attackTimer >= interval) {
            this._attackTimer -= interval;
            this.attack();
        }
        this.onUpdate(dt);
    }

    public abstract attack(): void;
    public onUpdate(dt: number): void {}
    public render(renderer: Renderer): void {}

    public upgrade(): void {
        if (this.level >= this.maxLevel) return;
        this.level++;
        this.applyLevel();
    }

    protected abstract applyLevel(): void;
}

// =====================================
// 1) 旋转刀刃
// =====================================
export class RotatingBlade extends WeaponBase {
    public id = 'rotating_blade';
    public name = '旋转刀刃';
    private _angle: number = 0;
    private _rotateSpeed: number = Math.PI; // 弧度/秒
    private _orbitRadius: number = 80;
    private _hitCooldowns: Map<any, number> = new Map();
    private _hitCooldownMs: number = 500;

    constructor(player: Player, combat: CombatSystem, spawn: SpawnSystem) {
        super(player, combat, spawn);
        this.damage = 12;
        this.attackSpeed = 100; // 持续判定不依赖间隔
        this.count = 1;
    }

    public attack(): void {
        // 持续旋转命中由 onUpdate 处理
    }

    public onUpdate(dt: number): void {
        const dtSec = dt / 1000;
        this._angle += this._rotateSpeed * dtSec;

        // 检查命中冷却
        for (const [k, v] of this._hitCooldowns) {
            const nv = v - dt;
            if (nv <= 0) this._hitCooldowns.delete(k);
            else this._hitCooldowns.set(k, nv);
        }

        // 命中检测
        const positions = this._getBladePositions();
        for (const pos of positions) {
            const targets = this._combat.getEnemiesNear(pos.x, pos.y, 25);
            for (const e of targets) {
                if (!e.alive) continue;
                if (this._hitCooldowns.has(e)) continue;
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

    private _getBladePositions(): Vec2[] {
        const result: Vec2[] = [];
        const step = (Math.PI * 2) / this.count;
        for (let i = 0; i < this.count; i++) {
            const a = this._angle + step * i;
            result.push(new Vec2(
                this._player.pos.x + Math.cos(a) * this._orbitRadius,
                this._player.pos.y + Math.sin(a) * this._orbitRadius,
            ));
        }
        return result;
    }

    public render(renderer: Renderer): void {
        for (const pos of this._getBladePositions()) {
            // 刀刃用旋转的小条
            renderer.withRotation(pos.x, pos.y, this._angle * 2, () => {
                renderer.drawRect(-12, -3, 24, 6, '#cccccc', '#222', 1);
            });
        }
    }

    protected applyLevel(): void {
        switch (this.level) {
            case 2: this.damage = 18; this._rotateSpeed = Math.PI * 1.2; break;
            case 3: this.damage = 18; this.count = 2; break;
            case 4: this.damage = 28; this._orbitRadius = 100; break;
            case 5: this.damage = 32; this.count = 3; this._rotateSpeed = Math.PI * 1.5; break;
        }
    }
}

// =====================================
// 2) 火球术
// =====================================
export class Fireball extends WeaponBase {
    public id = 'fireball';
    public name = '火球术';
    private _projectileSpeed: number = 450;
    private _lifetime: number = 2500;
    private _pierce: number = 0;

    constructor(player: Player, combat: CombatSystem, spawn: SpawnSystem) {
        super(player, combat, spawn);
        this.damage = 30;
        this.attackSpeed = 0.6;
        this.count = 1;
    }

    public attack(): void {
        const target = this._combat.getNearestEnemy(this._player.pos.x, this._player.pos.y, 500);
        if (!target) return;

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

    protected applyLevel(): void {
        switch (this.level) {
            case 2: this.damage = 40; this._projectileSpeed = 500; break;
            case 3: this.damage = 45; this.count = 2; break;
            case 4: this.damage = 55; this.attackSpeed = 0.8; this._pierce = 1; break;
            case 5: this.damage = 70; this.count = 3; this._pierce = 2; break;
        }
    }
}

// =====================================
// 3) 闪电链
// =====================================
export class LightningChain extends WeaponBase {
    public id = 'lightning_chain';
    public name = '闪电链';
    private _chainCount: number = 3;
    private _chainRange: number = 200;
    private _decay: number = 0.8;
    private _visualLines: { x1: number; y1: number; x2: number; y2: number; alpha: number }[] = [];

    constructor(player: Player, combat: CombatSystem, spawn: SpawnSystem) {
        super(player, combat, spawn);
        this.damage = 18;
        this.attackSpeed = 0.8;
        this.count = 1;
    }

    public attack(): void {
        for (let c = 0; c < this.count; c++) {
            const first = this._combat.getNearestEnemy(this._player.pos.x, this._player.pos.y, 350);
            if (!first) return;

            const hit: Set<any> = new Set();
            let cur = first;
            let dmg = this.damage;
            let lastX = this._player.pos.x;
            let lastY = this._player.pos.y;

            for (let i = 0; i < this._chainCount; i++) {
                if (!cur || !cur.alive) break;
                this._combat.dealDamageToEnemy(cur, dmg);
                hit.add(cur);
                this._visualLines.push({
                    x1: lastX, y1: lastY, x2: cur.pos.x, y2: cur.pos.y, alpha: 1,
                });
                lastX = cur.pos.x;
                lastY = cur.pos.y;
                dmg = Math.floor(dmg * this._decay);
                if (dmg < 1) break;

                // 找下一个目标
                const candidates = this._combat.getEnemiesNear(cur.pos.x, cur.pos.y, this._chainRange);
                let next: any = null;
                let minD = this._chainRange * this._chainRange;
                for (const e of candidates) {
                    if (hit.has(e) || !e.alive) continue;
                    const dx = e.pos.x - cur.pos.x;
                    const dy = e.pos.y - cur.pos.y;
                    const d = dx * dx + dy * dy;
                    if (d < minD) { minD = d; next = e; }
                }
                cur = next;
            }
        }
    }

    public onUpdate(dt: number): void {
        for (let i = this._visualLines.length - 1; i >= 0; i--) {
            this._visualLines[i].alpha -= dt / 200;
            if (this._visualLines[i].alpha <= 0) this._visualLines.splice(i, 1);
        }
    }

    public render(renderer: Renderer): void {
        for (const l of this._visualLines) {
            renderer.withAlpha(l.alpha, () => {
                renderer.drawLine(l.x1, l.y1, l.x2, l.y2, '#7afaff', 4);
                renderer.drawLine(l.x1, l.y1, l.x2, l.y2, '#fff', 2);
            });
        }
    }

    protected applyLevel(): void {
        switch (this.level) {
            case 2: this.damage = 22; this._chainCount = 4; break;
            case 3: this.damage = 28; this.attackSpeed = 1.0; break;
            case 4: this.damage = 32; this._chainCount = 5; this._decay = 0.85; break;
            case 5: this.damage = 40; this._chainCount = 6; this.count = 2; break;
        }
    }
}

// =====================================
// 4) 冰霜新星
// =====================================
export class FrostNova extends WeaponBase {
    public id = 'frost_nova';
    public name = '冰霜新星';
    private _aoeRadius: number = 130;
    private _slowPercent: number = 0.3;
    private _slowDuration: number = 2000;
    private _visualPulses: { x: number; y: number; r: number; alpha: number }[] = [];

    constructor(player: Player, combat: CombatSystem, spawn: SpawnSystem) {
        super(player, combat, spawn);
        this.damage = 14;
        this.attackSpeed = 0.4;
    }

    public attack(): void {
        this._combat.dealAoeDamage(this._player.pos.x, this._player.pos.y, this._aoeRadius, this.damage);
        this._visualPulses.push({ x: this._player.pos.x, y: this._player.pos.y, r: 10, alpha: 1 });
    }

    public onUpdate(dt: number): void {
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

    public render(renderer: Renderer): void {
        for (const p of this._visualPulses) {
            renderer.withAlpha(p.alpha, () => {
                renderer.drawCircle(p.x, p.y, p.r, undefined, '#88ddff', 4);
                renderer.drawCircle(p.x, p.y, p.r * 0.85, undefined, '#fff', 2);
            });
        }
    }

    protected applyLevel(): void {
        switch (this.level) {
            case 2: this.damage = 18; this._aoeRadius = 160; break;
            case 3: this.damage = 24; this._slowPercent = 0.4; this.attackSpeed = 0.5; break;
            case 4: this.damage = 30; this._aoeRadius = 200; this._slowDuration = 3000; break;
            case 5: this.damage = 42; this._aoeRadius = 240; this._slowPercent = 0.5; break;
        }
    }
}

// =====================================
// 武器工厂
// =====================================
export function createWeapon(id: string, player: Player, combat: CombatSystem, spawn: SpawnSystem): WeaponBase | null {
    switch (id) {
        case 'rotating_blade': return new RotatingBlade(player, combat, spawn);
        case 'fireball': return new Fireball(player, combat, spawn);
        case 'lightning_chain': return new LightningChain(player, combat, spawn);
        case 'frost_nova': return new FrostNova(player, combat, spawn);
    }
    return null;
}
