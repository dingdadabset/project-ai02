/**
 * Enemy - 敌人
 */
import { Vec2 } from '../engine/Vec2.js';
import { Renderer } from '../engine/Renderer.js';
import { EventBus, GameEvent } from '../core/EventBus.js';
import { EnemyConfig } from '../core/ConfigManager.js';
import { ENEMY_COLORS } from '../utils/Constants.js';
import { Player } from './Player.js';

export enum EnemyState {
    IDLE = 0,
    CHASING = 1,
    ATTACKING = 2,
    HURT = 3,
    DEAD = 4,
}

export class Enemy {
    public pos: Vec2 = new Vec2();
    public config!: EnemyConfig;
    public hp: number = 0;
    public maxHp: number = 0;
    public state: EnemyState = EnemyState.IDLE;
    public radius: number = 12;
    public color: number = 0xffffff;
    public alive: boolean = false;

    private _hurtTimer: number = 0;
    private _hurtDuration: number = 100;
    private _flashTimer: number = 0;

    // 远程 AI
    private _shootTimer: number = 0;
    private _shootInterval: number = 1500;

    // 精英 AI
    private _chargeCooldown: number = 0;
    private _isCharging: boolean = false;
    private _chargeDuration: number = 500;
    private _chargeElapsed: number = 0;
    private _chargeDir: Vec2 = new Vec2();

    // Boss AI
    private _bossPhase: number = 1;
    private _bossAttackTimer: number = 0;
    private _bossAttackInterval: number = 3000;

    public init(config: EnemyConfig, x: number, y: number, hpMul: number = 1, atkMul: number = 1, speedMul: number = 1): void {
        this.config = {
            ...config,
            hp: Math.floor(config.hp * hpMul),
            atk: Math.floor(config.atk * atkMul),
            speed: config.speed * speedMul,
        };
        this.pos.set(x, y);
        this.hp = this.config.hp;
        this.maxHp = this.config.hp;
        this.state = EnemyState.CHASING;
        this.alive = true;
        this.radius = 10 + config.size * 6;
        this.color = ENEMY_COLORS[config.id] || 0xff6666;
        this._hurtTimer = 0;
        this._flashTimer = 0;
        this._shootTimer = 0;
        this._chargeCooldown = 0;
        this._isCharging = false;
        this._bossPhase = 1;
        this._bossAttackTimer = 0;
    }

    public update(dt: number, player: Player): void {
        if (!this.alive) return;

        if (this._flashTimer > 0) this._flashTimer -= dt;

        if (this.state === EnemyState.HURT) {
            this._hurtTimer -= dt;
            if (this._hurtTimer <= 0) this.state = EnemyState.CHASING;
            return;
        }

        switch (this.config.type) {
            case 'melee': this._aiMelee(dt, player); break;
            case 'ranged': this._aiRanged(dt, player); break;
            case 'elite': this._aiElite(dt, player); break;
            case 'boss': this._aiBoss(dt, player); break;
        }
    }

    private _aiMelee(dt: number, player: Player): void {
        this._moveToward(dt, player.pos.x, player.pos.y, this.config.speed);
    }

    private _aiRanged(dt: number, player: Player): void {
        const dist = this.pos.distanceTo(player.pos);
        const keep = 200;
        if (dist < 130) {
            // 后撤
            this._moveToward(dt, player.pos.x, player.pos.y, -this.config.speed * 1.2);
        } else if (dist > keep * 1.3) {
            this._moveToward(dt, player.pos.x, player.pos.y, this.config.speed);
        } else {
            this._shootTimer += dt;
            if (this._shootTimer >= this._shootInterval) {
                this._shootTimer = 0;
                EventBus.instance.emit('enemy_shoot', {
                    x: this.pos.x, y: this.pos.y,
                    targetX: player.pos.x, targetY: player.pos.y,
                    damage: this.config.atk,
                });
            }
        }
    }

    private _aiElite(dt: number, player: Player): void {
        if (this._isCharging) {
            this._chargeElapsed += dt;
            if (this._chargeElapsed >= this._chargeDuration) {
                this._isCharging = false;
                this.state = EnemyState.CHASING;
            } else {
                const speed = this.config.speed * 2.5;
                const dtSec = dt / 1000;
                this.pos.x += this._chargeDir.x * speed * dtSec;
                this.pos.y += this._chargeDir.y * speed * dtSec;
            }
            return;
        }

        this._moveToward(dt, player.pos.x, player.pos.y, this.config.speed);

        this._chargeCooldown += dt;
        const dist = this.pos.distanceTo(player.pos);
        if (this._chargeCooldown >= 3000 && dist < 280 && dist > 80) {
            this._chargeCooldown = 0;
            this._isCharging = true;
            this._chargeElapsed = 0;
            this.state = EnemyState.ATTACKING;
            const dx = player.pos.x - this.pos.x;
            const dy = player.pos.y - this.pos.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            this._chargeDir.set(dx / d, dy / d);
        }
    }

    private _aiBoss(dt: number, player: Player): void {
        // 阶段切换
        if (this._bossPhase === 1 && this.hp / this.maxHp <= 0.5) {
            this._bossPhase = 2;
            this._bossAttackInterval = 2000;
            EventBus.instance.emit('boss_phase_change', { boss: this, phase: 2 });
        }
        const speedMul = this._bossPhase === 1 ? 1 : 1.6;
        this._moveToward(dt, player.pos.x, player.pos.y, this.config.speed * speedMul);

        this._bossAttackTimer += dt;
        if (this._bossAttackTimer >= this._bossAttackInterval) {
            this._bossAttackTimer = 0;
            EventBus.instance.emit('boss_ground_slam', {
                x: this.pos.x, y: this.pos.y,
                radius: 100, damage: this.config.atk * 1.5,
            });
        }
    }

    private _moveToward(dt: number, tx: number, ty: number, speed: number): void {
        const dx = tx - this.pos.x;
        const dy = ty - this.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return;
        const dtSec = dt / 1000;
        this.pos.x += (dx / dist) * speed * dtSec;
        this.pos.y += (dy / dist) * speed * dtSec;
    }

    public takeDamage(damage: number, isCrit: boolean = false): void {
        if (!this.alive) return;
        this.hp -= damage;
        this.state = EnemyState.HURT;
        this._hurtTimer = this._hurtDuration;
        this._flashTimer = 80;
        EventBus.instance.emit(GameEvent.ENEMY_DAMAGED, {
            enemy: this, damage, isCrit, x: this.pos.x, y: this.pos.y,
        });
        if (this.hp <= 0) {
            this._onDeath();
        }
    }

    private _onDeath(): void {
        this.state = EnemyState.DEAD;
        this.alive = false;
        EventBus.instance.emit(GameEvent.ENEMY_KILLED, {
            enemy: this, x: this.pos.x, y: this.pos.y,
            exp: this.config.exp, dropTable: this.config.dropTable,
        });
    }

    public render(renderer: Renderer): void {
        if (!this.alive) return;

        const flash = this._flashTimer > 0;
        const hex = '#' + this.color.toString(16).padStart(6, '0');
        // 阴影
        renderer.drawCircle(this.pos.x, this.pos.y + this.radius * 0.7, this.radius * 0.5, 'rgba(0,0,0,0.3)');
        // 主体
        renderer.drawCircle(this.pos.x, this.pos.y, this.radius, flash ? '#fff' : hex, '#111', 2);

        // 血条（只在受过伤时显示）
        if (this.hp < this.maxHp) {
            const barW = this.radius * 2;
            const barH = 3;
            const barY = this.pos.y - this.radius - 8;
            renderer.drawRect(this.pos.x - barW / 2, barY, barW, barH, '#000');
            renderer.drawRect(this.pos.x - barW / 2, barY,
                barW * Math.max(0, this.hp / this.maxHp), barH,
                this.config.type === 'boss' ? '#ff4444' : '#66ff66');
        }

        // Boss 显示名字
        if (this.config.type === 'boss') {
            renderer.drawText(this.config.name, this.pos.x, this.pos.y - this.radius - 22, {
                size: 12, color: '#ffaaaa', align: 'center', stroke: '#000', strokeWidth: 3,
            });
        }
    }

    public distTo(p: { x: number; y: number }): number {
        const dx = p.x - this.pos.x;
        const dy = p.y - this.pos.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
