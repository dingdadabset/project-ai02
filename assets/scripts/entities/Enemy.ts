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
     * 基础 AI：追踪玩家
     */
    private _updateAI(dt: number): void {
        if (this._state !== EnemyState.CHASING) return;

        const player = Player.instance;
        if (!player || !player.isAlive) return;

        const playerPos = player.node.worldPosition;
        const myPos = this.node.worldPosition;

        // 方向计算
        const dx = playerPos.x - myPos.x;
        const dy = playerPos.y - myPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) return; // 已到达

        // 归一化方向 × 速度
        const nx = dx / dist;
        const ny = dy / dist;

        this._tempVec3.set(
            myPos.x + nx * this._data.speed * dt,
            myPos.y + ny * this._data.speed * dt,
            0
        );
        this.node.setWorldPosition(this._tempVec3);

        // 面朝方向
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
