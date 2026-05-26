/**
 * Player - 玩家
 */
import { Vec2 } from '../engine/Vec2.js';
import { EventBus, GameEvent } from '../core/EventBus.js';
import { Balance } from '../utils/Constants.js';
export class Player {
    constructor(config) {
        this.pos = new Vec2(0, 0);
        this.radius = 16;
        this.level = 1;
        this.exp = 0;
        this.expToNext = Balance.BASE_EXP_REQUIRED;
        this.facing = 1; // 1=右, -1=左
        this._moveDir = new Vec2(0, 0);
        this._isInvincible = false;
        this._invincibleTimer = 0;
        this._hurtFlashTimer = 0;
        this._color = '#ffd24a';
        this.stats = {
            maxHp: config.baseHp,
            currentHp: config.baseHp,
            atk: config.baseAtk,
            speed: config.baseSpeed,
            critRate: config.baseCritRate,
            critDamage: config.baseCritDamage,
            def: config.baseDef,
            pickupRange: config.basePickupRange,
            atkSpeedBonus: 0,
            moveSpeedBonus: 0,
        };
        // 不同角色有不同颜色（程序化区分）
        if (config.id === 'mage')
            this._color = '#5cd1ff';
        if (config.id === 'ranger')
            this._color = '#9cf07a';
    }
    get isAlive() { return this.stats.currentHp > 0; }
    setMoveDirection(dir) {
        this._moveDir.setFrom(dir);
        if (dir.x !== 0)
            this.facing = dir.x > 0 ? 1 : -1;
    }
    update(dt) {
        if (!this.isAlive)
            return;
        // 移动
        const dtSec = dt / 1000;
        const speed = this.stats.speed * (1 + this.stats.moveSpeedBonus);
        this.pos.x += this._moveDir.x * speed * dtSec;
        this.pos.y += this._moveDir.y * speed * dtSec;
        // 边界
        const half = Balance.MAP_WIDTH / 2;
        if (this.pos.x < -half)
            this.pos.x = -half;
        if (this.pos.x > half)
            this.pos.x = half;
        if (this.pos.y < -half)
            this.pos.y = -half;
        if (this.pos.y > half)
            this.pos.y = half;
        // 无敌帧
        if (this._isInvincible) {
            this._invincibleTimer -= dt;
            if (this._invincibleTimer <= 0)
                this._isInvincible = false;
        }
        if (this._hurtFlashTimer > 0)
            this._hurtFlashTimer -= dt;
    }
    takeDamage(rawDamage) {
        if (this._isInvincible || !this.isAlive)
            return 0;
        const reduction = this.stats.def / (this.stats.def + 100);
        const finalDamage = Math.max(1, Math.floor(rawDamage * (1 - reduction)));
        this.stats.currentHp = Math.max(0, this.stats.currentHp - finalDamage);
        this._isInvincible = true;
        this._invincibleTimer = Balance.INVINCIBLE_DURATION;
        this._hurtFlashTimer = 200;
        EventBus.instance.emit(GameEvent.PLAYER_DAMAGED, finalDamage, this.stats.currentHp);
        if (this.stats.currentHp <= 0) {
            EventBus.instance.emit(GameEvent.PLAYER_DEAD);
        }
        return finalDamage;
    }
    heal(amount) {
        if (!this.isAlive)
            return;
        const before = this.stats.currentHp;
        this.stats.currentHp = Math.min(this.stats.maxHp, this.stats.currentHp + amount);
        const healed = this.stats.currentHp - before;
        if (healed > 0)
            EventBus.instance.emit(GameEvent.PLAYER_HEAL, healed);
    }
    gainExp(amount) {
        this.exp += amount;
        EventBus.instance.emit(GameEvent.EXP_GAINED, this.exp, this.expToNext);
        while (this.exp >= this.expToNext) {
            this.exp -= this.expToNext;
            this.level++;
            this.expToNext = Balance.BASE_EXP_REQUIRED + (this.level - 1) * Balance.EXP_PER_LEVEL;
            EventBus.instance.emit(GameEvent.PLAYER_LEVEL_UP, this.level);
        }
    }
    addStat(key, value) {
        this.stats[key] += value;
        if (key === 'maxHp')
            this.stats.currentHp += value;
    }
    addStatPercent(key, percent) {
        this.stats[key] = this.stats[key] * (1 + percent);
    }
    render(renderer) {
        const flash = this._hurtFlashTimer > 0;
        // 阴影
        renderer.drawCircle(this.pos.x, this.pos.y + this.radius * 0.7, this.radius * 0.5, 'rgba(0,0,0,0.35)');
        // 主体
        renderer.drawCircle(this.pos.x, this.pos.y, this.radius, flash ? '#fff' : this._color, '#222', 2);
        // 朝向小箭头
        const fx = this.pos.x + this.facing * 8;
        const fy = this.pos.y - 4;
        renderer.drawCircle(fx, fy, 3, '#222');
        // 无敌闪烁
        if (this._isInvincible && Math.floor(this._invincibleTimer / 60) % 2 === 0) {
            renderer.drawCircle(this.pos.x, this.pos.y, this.radius + 4, undefined, 'rgba(255,255,255,0.6)', 2);
        }
    }
}
//# sourceMappingURL=Player.js.map