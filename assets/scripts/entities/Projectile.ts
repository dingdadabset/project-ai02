/**
 * Projectile - 投射物基类
 * 管理弹幕飞行、命中、生命周期
 */

import { _decorator, Component, Node, Vec2, Vec3, Collider2D, Contact2DType } from 'cc';
import { ObjectPool } from '../core/ObjectPool';

const { ccclass, property } = _decorator;

export interface ProjectileData {
    damage: number;
    speed: number;
    direction: Vec2;
    lifetime: number;
    pierceCount: number;   // 穿透次数（0=碰到就消失）
    aoeRadius: number;     // AOE 半径（0=单体）
    ownerTag: string;      // 'player' | 'enemy'
    poolName: string;
}

@ccclass('Projectile')
export class Projectile extends Component {
    private _data: ProjectileData = {
        damage: 0,
        speed: 0,
        direction: new Vec2(1, 0),
        lifetime: 5,
        pierceCount: 0,
        aoeRadius: 0,
        ownerTag: 'player',
        poolName: '',
    };

    private _lifeTimer: number = 0;
    private _hitCount: number = 0;
    private _hitTargets: Set<Node> = new Set();
    private _isActive: boolean = false;

    private _tempVec3: Vec3 = new Vec3();

    public get data(): ProjectileData {
        return this._data;
    }

    public get isActive(): boolean {
        return this._isActive;
    }

    /**
     * 初始化投射物（从对象池取出时调用）
     */
    public init(data: ProjectileData): void {
        this._data = { ...data };
        this._lifeTimer = data.lifetime;
        this._hitCount = 0;
        this._hitTargets.clear();
        this._isActive = true;
        this.node.active = true;

        // 设置旋转角度（面朝飞行方向）
        const angle = Math.atan2(data.direction.y, data.direction.x) * (180 / Math.PI);
        this.node.setRotationFromEuler(0, 0, angle);
    }

    update(dt: number): void {
        if (!this._isActive) return;

        // 生命周期
        this._lifeTimer -= dt;
        if (this._lifeTimer <= 0) {
            this._recycle();
            return;
        }

        // 移动
        const pos = this.node.worldPosition;
        this._tempVec3.set(
            pos.x + this._data.direction.x * this._data.speed * dt,
            pos.y + this._data.direction.y * this._data.speed * dt,
            0
        );
        this.node.setWorldPosition(this._tempVec3);
    }

    /**
     * 命中目标
     * @returns 实际伤害值
     */
    public hitTarget(target: Node): number {
        if (!this._isActive) return 0;
        if (this._hitTargets.has(target)) return 0; // 已命中过

        this._hitTargets.add(target);
        this._hitCount++;

        // 判断是否超过穿透次数
        if (this._hitCount > this._data.pierceCount) {
            this._recycle();
        }

        return this._data.damage;
    }

    /**
     * 检查是否已命中该目标
     */
    public hasHitTarget(target: Node): boolean {
        return this._hitTargets.has(target);
    }

    /**
     * 手动销毁（用于需要立即消失的场景）
     */
    public kill(): void {
        this._recycle();
    }

    private _recycle(): void {
        this._isActive = false;
        this._hitTargets.clear();
        if (this._data.poolName) {
            ObjectPool.instance.put(this._data.poolName, this.node);
        } else {
            this.node.destroy();
        }
    }
}
