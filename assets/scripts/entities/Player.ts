/**
 * Player - 玩家控制器
 * 管理玩家移动、属性、受击、武器挂载
 */

import { _decorator, Component, Node, Vec2, Vec3, Collider2D, Contact2DType } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { GameManager, GameState } from '../core/GameManager';

const { ccclass, property } = _decorator;

export interface PlayerStats {
    maxHp: number;
    currentHp: number;
    atk: number;
    speed: number;
    critRate: number;
    critDamage: number;
    def: number;
    pickupRange: number;
    atkSpeedBonus: number;
    moveSpeedBonus: number;
}

@ccclass('Player')
export class Player extends Component {
    private static _instance: Player | null = null;

    @property
    public baseHp: number = 100;
    @property
    public baseAtk: number = 10;
    @property
    public baseSpeed: number = 200;
    @property
    public baseCritRate: number = 0.05;
    @property
    public baseCritDamage: number = 1.5;
    @property
    public baseDef: number = 0;
    @property
    public basePickupRange: number = 50;

    private _stats: PlayerStats = {
        maxHp: 100,
        currentHp: 100,
        atk: 10,
        speed: 200,
        critRate: 0.05,
        critDamage: 1.5,
        def: 0,
        pickupRange: 50,
        atkSpeedBonus: 0,
        moveSpeedBonus: 0,
    };

    private _moveDirection: Vec2 = new Vec2(0, 0);
    private _isInvincible: boolean = false;
    private _invincibleTimer: number = 0;
    private _invincibleDuration: number = 0.5; // 受击无敌时间

    // 经验系统
    private _level: number = 1;
    private _exp: number = 0;
    private _expToNext: number = 10;

    // 武器槽
    private _weapons: Node[] = [];
    private _maxWeapons: number = 6;

    public static get instance(): Player {
        return Player._instance!;
    }

    public get stats(): PlayerStats {
        return this._stats;
    }

    public get level(): number {
        return this._level;
    }

    public get exp(): number {
        return this._exp;
    }

    public get expToNext(): number {
        return this._expToNext;
    }

    public get isAlive(): boolean {
        return this._stats.currentHp > 0;
    }

    onLoad(): void {
        Player._instance = this;
        this._initStats();
    }

    start(): void {
        // 注册碰撞检测
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this._onBeginContact, this);
        }
    }

    private _initStats(): void {
        this._stats = {
            maxHp: this.baseHp,
            currentHp: this.baseHp,
            atk: this.baseAtk,
            speed: this.baseSpeed,
            critRate: this.baseCritRate,
            critDamage: this.baseCritDamage,
            def: this.baseDef,
            pickupRange: this.basePickupRange,
            atkSpeedBonus: 0,
            moveSpeedBonus: 0,
        };
        this._level = 1;
        this._exp = 0;
        this._expToNext = 10;
    }

    update(dt: number): void {
        if (!GameManager.instance || GameManager.instance.isPaused) return;
        if (!this.isAlive) return;

        this._updateMovement(dt);
        this._updateInvincible(dt);
    }

    // ---- 移动 ----

    /**
     * 设置移动方向（由 JoystickController 调用）
     */
    public setMoveDirection(direction: Vec2): void {
        this._moveDirection.set(direction);
    }

    private _updateMovement(dt: number): void {
        if (this._moveDirection.lengthSqr() < 0.001) return;

        const speed = this._stats.speed * (1 + this._stats.moveSpeedBonus);
        const pos = this.node.position;
        const newX = pos.x + this._moveDirection.x * speed * dt;
        const newY = pos.y + this._moveDirection.y * speed * dt;

        this.node.setPosition(newX, newY, 0);

        // 面朝移动方向（翻转 Sprite）
        if (this._moveDirection.x !== 0) {
            const scaleX = this._moveDirection.x > 0 ? 1 : -1;
            const scale = this.node.scale;
            this.node.setScale(Math.abs(scale.x) * scaleX, scale.y, scale.z);
        }
    }

    // ---- 受伤 & 治疗 ----

    /**
     * 受到伤害
     */
    public takeDamage(rawDamage: number): number {
        if (this._isInvincible || !this.isAlive) return 0;

        // 减伤计算
        const reduction = this._stats.def / (this._stats.def + 100);
        const finalDamage = Math.max(1, Math.floor(rawDamage * (1 - reduction)));

        this._stats.currentHp = Math.max(0, this._stats.currentHp - finalDamage);

        // 触发无敌帧
        this._isInvincible = true;
        this._invincibleTimer = this._invincibleDuration;

        EventBus.instance.emit(GameEvent.PLAYER_DAMAGED, finalDamage, this._stats.currentHp);

        if (this._stats.currentHp <= 0) {
            this._onDeath();
        }

        return finalDamage;
    }

    /**
     * 治疗
     */
    public heal(amount: number): void {
        if (!this.isAlive) return;
        const before = this._stats.currentHp;
        this._stats.currentHp = Math.min(this._stats.maxHp, this._stats.currentHp + amount);
        const healed = this._stats.currentHp - before;
        if (healed > 0) {
            EventBus.instance.emit(GameEvent.PLAYER_HEAL, healed);
        }
    }

    private _updateInvincible(dt: number): void {
        if (this._isInvincible) {
            this._invincibleTimer -= dt;
            if (this._invincibleTimer <= 0) {
                this._isInvincible = false;
            }
        }
    }

    private _onDeath(): void {
        EventBus.instance.emit(GameEvent.PLAYER_DEAD);
    }

    // ---- 经验 & 升级 ----

    /**
     * 获得经验
     */
    public gainExp(amount: number): void {
        this._exp += amount;
        EventBus.instance.emit(GameEvent.EXP_GAINED, this._exp, this._expToNext);

        while (this._exp >= this._expToNext) {
            this._exp -= this._expToNext;
            this._levelUp();
        }
    }

    private _levelUp(): void {
        this._level++;
        this._expToNext = this._calcExpToNext(this._level);
        EventBus.instance.emit(GameEvent.PLAYER_LEVEL_UP, this._level);
    }

    private _calcExpToNext(level: number): number {
        // 经验需求公式：基础10，每级增加5
        return 10 + (level - 1) * 5;
    }

    // ---- 属性修改 ----

    /**
     * 增加属性（技能/装备加成）
     */
    public addStat(stat: keyof PlayerStats, value: number): void {
        (this._stats as any)[stat] += value;
        if (stat === 'maxHp') {
            this._stats.currentHp += value; // 增加最大血量同时回复
        }
    }

    /**
     * 设置属性乘算加成
     */
    public addStatPercent(stat: keyof PlayerStats, percent: number): void {
        const base = (this._stats as any)[stat];
        (this._stats as any)[stat] = base * (1 + percent);
    }

    // ---- 武器管理 ----

    public addWeapon(weaponNode: Node): boolean {
        if (this._weapons.length >= this._maxWeapons) return false;
        this._weapons.push(weaponNode);
        this.node.addChild(weaponNode);
        EventBus.instance.emit(GameEvent.WEAPON_ACQUIRED, weaponNode.name);
        return true;
    }

    public getWeapons(): Node[] {
        return this._weapons;
    }

    // ---- 碰撞回调 ----

    private _onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D): void {
        // 碰撞处理由 CombatSystem 统一管理
    }

    onDestroy(): void {
        if (Player._instance === this) {
            Player._instance = null;
        }
    }
}
