/**
 * WeaponBase - 武器基类
 * 所有武器的抽象基类，定义通用接口和升级逻辑
 */

import { _decorator, Component, Node } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

export interface WeaponStats {
    damage: number;
    attackSpeed: number;  // 每秒攻击次数
    range: number;
    count: number;        // 投射物/实例数量
    pierceCount: number;  // 穿透次数
}

@ccclass('WeaponBase')
export abstract class WeaponBase extends Component {
    @property
    public weaponId: string = '';

    @property
    public weaponName: string = '';

    protected _level: number = 1;
    protected _maxLevel: number = 5;
    protected _stats: WeaponStats = {
        damage: 10,
        attackSpeed: 1.0,
        range: 100,
        count: 1,
        pierceCount: 0,
    };

    protected _attackTimer: number = 0;
    protected _isActive: boolean = true;

    public get level(): number {
        return this._level;
    }

    public get maxLevel(): number {
        return this._maxLevel;
    }

    public get stats(): WeaponStats {
        return this._stats;
    }

    public get isMaxLevel(): boolean {
        return this._level >= this._maxLevel;
    }

    start(): void {
        EventBus.instance.on(GameEvent.WEAPON_UPGRADE, this._onWeaponUpgrade, this);
        this._initStats();
    }

    update(dt: number): void {
        if (!this._isActive) return;
        if (!GameManager.instance || GameManager.instance.isPaused) return;

        this._attackTimer += dt;
        const interval = 1.0 / this._stats.attackSpeed;

        if (this._attackTimer >= interval) {
            this._attackTimer -= interval;
            this.attack();
        }
    }

    /**
     * 初始化武器属性（子类重写）
     */
    protected abstract _initStats(): void;

    /**
     * 执行攻击（子类实现具体攻击方式）
     */
    public abstract attack(): void;

    /**
     * 升级武器
     */
    public upgrade(): boolean {
        if (this._level >= this._maxLevel) return false;
        this._level++;
        this._applyLevelStats(this._level);
        console.log(`[Weapon] ${this.weaponName} upgraded to Lv.${this._level}`);
        return true;
    }

    /**
     * 应用等级属性（子类重写以自定义升级曲线）
     */
    protected _applyLevelStats(level: number): void {
        // 默认升级：伤害+20%，每2级+1数量
        this._stats.damage = Math.floor(this._stats.damage * 1.2);
        if (level % 2 === 0) {
            this._stats.count++;
        }
    }

    /**
     * 事件回调：武器升级
     */
    private _onWeaponUpgrade(weaponId: string, newLevel: number): void {
        if (weaponId === this.weaponId) {
            this.upgrade();
        }
    }

    /**
     * 启用/禁用
     */
    public setActive(active: boolean): void {
        this._isActive = active;
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
    }
}
