/**
 * Enemy - 敌人基类
 * 管理敌人 AI、血量、死亡回收
 */

import { _decorator, Component, Node, Vec3, Collider2D, Contact2DType } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { ObjectPool } from '../core/ObjectPool';
import { Player } from './Player';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

export enum EnemyState {
    IDLE = 0,
    CHASING = 1,
    ATTACKING = 2,
    HURT = 3,
    DEAD = 4,
}

export interface EnemyData {
    id: string;
    type: 'melee' | 'ranged' | 'elite' | 'boss';
    maxHp: number;
    atk: number;
    speed: number;
    exp: number;
    dropTable: string[];
}

@ccclass('Enemy')
export class Enemy extends Component {
    private _data: EnemyData = {
        id: '',
        type: 'melee',
        maxHp: 30,
        atk: 5,
        speed: 80,
        exp: 5,
        dropTable: [],
    };

    private _currentHp: number = 30;
    private _state: EnemyState = EnemyState.IDLE;
    private _hurtTimer: number = 0;
    private _hurtDuration: number = 0.1; // 受击硬直
    private _poolName: string = ''; // 对象池标识

    private _tempVec3: Vec3 = new Vec3();

    public get data(): EnemyData {
        return this._data;
    }

    public get currentHp(): number {
        return this._currentHp;
    }

    public get hpPercent(): number {
        return this._currentHp / this._data.maxHp;
    }

    public get isAlive(): boolean {
        return this._state !== EnemyState.DEAD;
    }

    public get state(): EnemyState {
        return this._state;
    }

    /**
     * 初始化敌人数据（从对象池取出时调用）
     */
    public init(data: EnemyData, poolName: string): void {
        this._data = { ...data };
        this._currentHp = data.maxHp;
        this._state = EnemyState.CHASING;
        this._hurtTimer = 0;
        this._poolName = poolName;
        this.node.active = true;
    }

    update(dt: number): void {
        if (!GameManager.instance || GameManager.instance.isPaused) return;
        if (this._state === EnemyState.DEAD) return;

        // 受击硬直
        if (this._state === EnemyState.HURT) {
            this._hurtTimer -= dt;
            if (this._hurtTimer <= 0) {
                this._state = EnemyState.CHASING;
            }
            return;
        }

        this._updateAI(dt);
    }

    /**
     * AI 调度：根据敌人类型选择不同行为
     */
    protected _updateAI(dt: number): void {
        if (this._state !== EnemyState.CHASING && this._state !== EnemyState.ATTACKING) return;

        switch (this._data.type) {
            case 'melee':
                this._aiMeleeChase(dt);
                break;
            case 'ranged':
                this._aiRangedKite(dt);
                break;
            case 'elite':
                this._aiEliteAggressive(dt);
                break;
            case 'boss':
                this._aiBossMultiPhase(dt);
                break;
            default:
                this._aiMeleeChase(dt);
        }
    }

    // ============================================
    // 近战 AI：直线追踪玩家
    // ============================================
    private _aiMeleeChase(dt: number): void {
        this._moveTowardPlayer(dt, this._data.speed);
    }

    // ============================================
    // 远程 AI：保持距离 + 射击
    // ============================================
    private _rangedKeepDistance: number = 180;  // 期望保持距离
    private _rangedShootInterval: number = 1.5; // 射击间隔
    private _rangedShootTimer: number = 0;
    private _rangedFleeDistance: number = 120;  // 太近时后撤距离

    private _aiRangedKite(dt: number): void {
        const player = Player.instance;
        if (!player || !player.isAlive) return;

        const dist = this.getDistanceToPlayer();
        const playerPos = player.node.worldPosition;
        const myPos = this.node.worldPosition;

        const dx = playerPos.x - myPos.x;
        const dy = playerPos.y - myPos.y;

        // 面朝玩家
        this._faceDirection(dx);

        if (dist < this._rangedFleeDistance) {
            // 太近了，后撤
            const nx = -dx / dist;
            const ny = -dy / dist;
            this._tempVec3.set(
                myPos.x + nx * this._data.speed * 1.2 * dt,
                myPos.y + ny * this._data.speed * 1.2 * dt,
                0
            );
            this.node.setWorldPosition(this._tempVec3);
        } else if (dist > this._rangedKeepDistance * 1.3) {
            // 太远了，靠近
            this._moveTowardPlayer(dt, this._data.speed);
        } else {
            // 在射程内，停下来射击
            this._rangedShootTimer += dt;
            if (this._rangedShootTimer >= this._rangedShootInterval) {
                this._rangedShootTimer = 0;
                this._rangedShoot();
            }
        }
    }

    /**
     * 远程敌人射击（发射弹幕）
     */
    private _rangedShoot(): void {
        const player = Player.instance;
        if (!player) return;

        // 通过事件通知 SpawnSystem/CombatSystem 生成敌人弹幕
        EventBus.instance.emit('enemy_shoot', {
            enemy: this,
            position: this.node.worldPosition.clone(),
            targetPosition: player.node.worldPosition.clone(),
            damage: this._data.atk,
        });
    }

    // ============================================
    // 精英 AI：冲锋型（快速追踪 + 短暂加速冲锋）
    // ============================================
    private _eliteChargeTimer: number = 0;
    private _eliteChargeCooldown: number = 3.0;  // 冲锋冷却
    private _eliteChargeSpeed: number = 2.5;     // 冲锋速度倍率
    private _eliteChargeDuration: number = 0.5;  // 冲锋持续时间
    private _eliteIsCharging: boolean = false;
    private _eliteChargeDir: Vec3 = new Vec3();
    private _eliteChargeElapsed: number = 0;

    private _aiEliteAggressive(dt: number): void {
        const player = Player.instance;
        if (!player || !player.isAlive) return;

        // 冲锋状态
        if (this._eliteIsCharging) {
            this._eliteChargeElapsed += dt;
            if (this._eliteChargeElapsed >= this._eliteChargeDuration) {
                this._eliteIsCharging = false;
                this._state = EnemyState.CHASING;
            } else {
                // 沿冲锋方向高速移动
                const speed = this._data.speed * this._eliteChargeSpeed;
                const myPos = this.node.worldPosition;
                this._tempVec3.set(
                    myPos.x + this._eliteChargeDir.x * speed * dt,
                    myPos.y + this._eliteChargeDir.y * speed * dt,
                    0
                );
                this.node.setWorldPosition(this._tempVec3);
            }
            return;
        }

        // 普通追踪
        this._moveTowardPlayer(dt, this._data.speed);

        // 冲锋冷却
        this._eliteChargeTimer += dt;
        const dist = this.getDistanceToPlayer();

        // 在一定距离内且冷却完成 → 触发冲锋
        if (this._eliteChargeTimer >= this._eliteChargeCooldown && dist < 250 && dist > 80) {
            this._eliteChargeTimer = 0;
            this._eliteIsCharging = true;
            this._eliteChargeElapsed = 0;
            this._state = EnemyState.ATTACKING;

            // 记录冲锋方向（锁定方向，不追踪）
            const playerPos = player.node.worldPosition;
            const myPos = this.node.worldPosition;
            const dx = playerPos.x - myPos.x;
            const dy = playerPos.y - myPos.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            this._eliteChargeDir.set(dx / d, dy / d, 0);
        }
    }

    // ============================================
    // Boss AI：多阶段
    // 阶段1 (HP>50%): 缓慢追踪 + 周期性 AOE 地面砸击
    // 阶段2 (HP<=50%): 速度加倍 + 召唤小怪 + 连续冲锋
    // ============================================
    private _bossPhase: number = 1;
    private _bossAttackTimer: number = 0;
    private _bossAttackInterval: number = 3.0;
    private _bossSummonTimer: number = 0;
    private _bossSummonInterval: number = 8.0;
    private _bossChargeCount: number = 0;
    private _bossMaxCharges: number = 3;
    private _bossIsCharging: boolean = false;
    private _bossChargeDir: Vec3 = new Vec3();
    private _bossChargeElapsed: number = 0;
    private _bossChargeDuration: number = 0.8;

    private _aiBossMultiPhase(dt: number): void {
        const player = Player.instance;
        if (!player || !player.isAlive) return;

        // 阶段切换检测
        if (this._bossPhase === 1 && this.hpPercent <= 0.5) {
            this._bossPhase = 2;
            this._bossAttackInterval = 2.0; // 阶段2攻击更频繁
            // 发射阶段切换事件（可用于 UI 提示）
            EventBus.instance.emit('boss_phase_change', { boss: this, phase: 2 });
        }

        if (this._bossPhase === 1) {
            this._bossPhase1AI(dt);
        } else {
            this._bossPhase2AI(dt);
        }
    }

    /**
     * Boss 阶段1: 缓慢追踪 + AOE 砸击
     */
    private _bossPhase1AI(dt: number): void {
        // 追踪（较慢）
        this._moveTowardPlayer(dt, this._data.speed);

        // 定时 AOE 攻击
        this._bossAttackTimer += dt;
        if (this._bossAttackTimer >= this._bossAttackInterval) {
            this._bossAttackTimer = 0;
            this._bossGroundSlam();
        }
    }

    /**
     * Boss 阶段2: 加速 + 召唤 + 冲锋
     */
    private _bossPhase2AI(dt: number): void {
        // 冲锋状态
        if (this._bossIsCharging) {
            this._bossChargeElapsed += dt;
            if (this._bossChargeElapsed >= this._bossChargeDuration) {
                this._bossIsCharging = false;
                this._bossChargeCount++;
                if (this._bossChargeCount >= this._bossMaxCharges) {
                    this._bossChargeCount = 0;
                    this._state = EnemyState.CHASING;
                } else {
                    // 连续冲锋：重新瞄准
                    this._startBossCharge();
                }
            } else {
                const speed = this._data.speed * 3;
                const myPos = this.node.worldPosition;
                this._tempVec3.set(
                    myPos.x + this._bossChargeDir.x * speed * dt,
                    myPos.y + this._bossChargeDir.y * speed * dt,
                    0
                );
                this.node.setWorldPosition(this._tempVec3);
            }
            return;
        }

        // 加速追踪
        this._moveTowardPlayer(dt, this._data.speed * 1.8);

        // 定时攻击
        this._bossAttackTimer += dt;
        if (this._bossAttackTimer >= this._bossAttackInterval) {
            this._bossAttackTimer = 0;
            // 交替：冲锋 或 AOE
            if (Math.random() > 0.4) {
                this._bossChargeCount = 0;
                this._startBossCharge();
            } else {
                this._bossGroundSlam();
            }
        }

        // 召唤小怪
        this._bossSummonTimer += dt;
        if (this._bossSummonTimer >= this._bossSummonInterval) {
            this._bossSummonTimer = 0;
            this._bossSummonMinions();
        }
    }

    private _startBossCharge(): void {
        const player = Player.instance;
        if (!player) return;

        this._bossIsCharging = true;
        this._bossChargeElapsed = 0;
        this._state = EnemyState.ATTACKING;

        const playerPos = player.node.worldPosition;
        const myPos = this.node.worldPosition;
        const dx = playerPos.x - myPos.x;
        const dy = playerPos.y - myPos.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        this._bossChargeDir.set(dx / d, dy / d, 0);
    }

    /**
     * Boss AOE 地面砸击
     */
    private _bossGroundSlam(): void {
        EventBus.instance.emit('boss_ground_slam', {
            boss: this,
            position: this.node.worldPosition.clone(),
            radius: 120,
            damage: this._data.atk * 1.5,
        });
    }

    /**
     * Boss 召唤小怪
     */
    private _bossSummonMinions(): void {
        EventBus.instance.emit('boss_summon', {
            boss: this,
            position: this.node.worldPosition.clone(),
            minionType: 'slime_green',
            count: 5,
        });
    }

    // ============================================
    // 通用移动/朝向工具方法
    // ============================================

    /**
     * 向玩家移动
     */
    protected _moveTowardPlayer(dt: number, speed: number): void {
        const player = Player.instance;
        if (!player || !player.isAlive) return;

        const playerPos = player.node.worldPosition;
        const myPos = this.node.worldPosition;
        const dx = playerPos.x - myPos.x;
        const dy = playerPos.y - myPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) return;

        const nx = dx / dist;
        const ny = dy / dist;

        this._tempVec3.set(
            myPos.x + nx * speed * dt,
            myPos.y + ny * speed * dt,
            0
        );
        this.node.setWorldPosition(this._tempVec3);

        this._faceDirection(dx);
    }

    /**
     * 面朝方向
     */
    private _faceDirection(dx: number): void {
        if (dx !== 0) {
            const scaleX = dx > 0 ? 1 : -1;
            const scale = this.node.scale;
            this.node.setScale(Math.abs(scale.x) * scaleX, scale.y, scale.z);
        }
    }

    /**
     * 受到伤害
     */
    public takeDamage(damage: number, isCrit: boolean = false): void {
        if (this._state === EnemyState.DEAD) return;

        this._currentHp -= damage;

        // 受击硬直
        this._state = EnemyState.HURT;
        this._hurtTimer = this._hurtDuration;

        EventBus.instance.emit(GameEvent.ENEMY_DAMAGED, {
            enemy: this,
            damage,
            isCrit,
            position: this.node.worldPosition.clone(),
        });

        if (this._currentHp <= 0) {
            this._onDeath();
        }
    }

    /**
     * 死亡处理
     */
    private _onDeath(): void {
        this._state = EnemyState.DEAD;

        EventBus.instance.emit(GameEvent.ENEMY_KILLED, {
            enemy: this,
            position: this.node.worldPosition.clone(),
            exp: this._data.exp,
            dropTable: this._data.dropTable,
        });

        // 延迟回收到对象池（可播放死亡动画）
        this.scheduleOnce(() => {
            this._recycle();
        }, 0.1);
    }

    /**
     * 回收到对象池
     */
    private _recycle(): void {
        if (this._poolName) {
            ObjectPool.instance.put(this._poolName, this.node);
        } else {
            this.node.destroy();
        }
    }

    /**
     * 强制回收（关卡结束时）
     */
    public forceRecycle(): void {
        this._state = EnemyState.DEAD;
        this._recycle();
    }

    /**
     * 获取与玩家的距离
     */
    public getDistanceToPlayer(): number {
        const player = Player.instance;
        if (!player) return Infinity;

        const dx = player.node.worldPosition.x - this.node.worldPosition.x;
        const dy = player.node.worldPosition.y - this.node.worldPosition.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
