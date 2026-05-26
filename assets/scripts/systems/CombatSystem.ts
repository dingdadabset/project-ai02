/**
 * CombatSystem - 战斗系统
 * 统一管理伤害计算、碰撞检测、暴击判定
 */

import { _decorator, Component, Node, Vec3 } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

export interface DamageInfo {
    source: Node;
    target: Node;
    baseDamage: number;
    isCrit: boolean;
    finalDamage: number;
    position: Vec3;
}

@ccclass('CombatSystem')
export class CombatSystem extends Component {
    private static _instance: CombatSystem | null = null;

    // 当前场景中活跃的敌人列表
    private _activeEnemies: Enemy[] = [];

    // 空间分区网格
    private _gridSize: number = 100;
    private _grid: Map<string, Enemy[]> = new Map();

    public static get instance(): CombatSystem {
        return CombatSystem._instance!;
    }

    public get activeEnemies(): Enemy[] {
        return this._activeEnemies;
    }

    public get activeEnemyCount(): number {
        return this._activeEnemies.length;
    }

    onLoad(): void {
        CombatSystem._instance = this;
    }

    start(): void {
        EventBus.instance.on(GameEvent.ENEMY_KILLED, this._onEnemyKilled, this);
    }

    update(dt: number): void {
        if (!GameManager.instance || GameManager.instance.isPaused) return;

        // 更新空间分区（用于优化碰撞检测）
        this._updateGrid();

        // 检测敌人与玩家碰撞（接触伤害）
        this._checkEnemyPlayerCollision(dt);
    }

    // ---- 注册/注销敌人 ----

    public registerEnemy(enemy: Enemy): void {
        if (!this._activeEnemies.includes(enemy)) {
            this._activeEnemies.push(enemy);
        }
    }

    public unregisterEnemy(enemy: Enemy): void {
        const idx = this._activeEnemies.indexOf(enemy);
        if (idx !== -1) {
            this._activeEnemies.splice(idx, 1);
        }
    }

    // ---- 伤害计算 ----

    /**
     * 计算玩家对敌人的伤害
     */
    public calcPlayerDamage(baseDamage: number): { damage: number; isCrit: boolean } {
        const player = Player.instance;
        if (!player) return { damage: baseDamage, isCrit: false };

        const stats = player.stats;

        // 暴击判定
        const isCrit = Math.random() < stats.critRate;
        let damage = baseDamage + stats.atk;

        if (isCrit) {
            damage *= stats.critDamage;
        }

        damage = Math.floor(damage);
        return { damage, isCrit };
    }

    /**
     * 对敌人造成伤害
     */
    public dealDamageToEnemy(enemy: Enemy, baseDamage: number): DamageInfo | null {
        if (!enemy || !enemy.isAlive) return null;

        const { damage, isCrit } = this.calcPlayerDamage(baseDamage);
        enemy.takeDamage(damage, isCrit);

        const info: DamageInfo = {
            source: Player.instance?.node!,
            target: enemy.node,
            baseDamage,
            isCrit,
            finalDamage: damage,
            position: enemy.node.worldPosition.clone(),
        };

        return info;
    }

    /**
     * AOE 伤害（范围内所有敌人）
     */
    public dealAoeDamage(center: Vec3, radius: number, baseDamage: number): DamageInfo[] {
        const results: DamageInfo[] = [];
        const radiusSq = radius * radius;

        for (const enemy of this._activeEnemies) {
            if (!enemy.isAlive) continue;

            const pos = enemy.node.worldPosition;
            const dx = pos.x - center.x;
            const dy = pos.y - center.y;
            const distSq = dx * dx + dy * dy;

            if (distSq <= radiusSq) {
                const info = this.dealDamageToEnemy(enemy, baseDamage);
                if (info) results.push(info);
            }
        }

        return results;
    }

    // ---- 空间分区 ----

    private _updateGrid(): void {
        this._grid.clear();

        for (const enemy of this._activeEnemies) {
            if (!enemy.isAlive) continue;
            const pos = enemy.node.worldPosition;
            const key = this._getGridKey(pos.x, pos.y);

            if (!this._grid.has(key)) {
                this._grid.set(key, []);
            }
            this._grid.get(key)!.push(enemy);
        }
    }

    private _getGridKey(x: number, y: number): string {
        const gx = Math.floor(x / this._gridSize);
        const gy = Math.floor(y / this._gridSize);
        return `${gx},${gy}`;
    }

    /**
     * 获取指定位置附近的敌人（九宫格查询）
     */
    public getEnemiesNear(x: number, y: number, radius: number): Enemy[] {
        const results: Enemy[] = [];
        const gridRadius = Math.ceil(radius / this._gridSize);
        const gx = Math.floor(x / this._gridSize);
        const gy = Math.floor(y / this._gridSize);
        const radiusSq = radius * radius;

        for (let dx = -gridRadius; dx <= gridRadius; dx++) {
            for (let dy = -gridRadius; dy <= gridRadius; dy++) {
                const key = `${gx + dx},${gy + dy}`;
                const cell = this._grid.get(key);
                if (!cell) continue;

                for (const enemy of cell) {
                    if (!enemy.isAlive) continue;
                    const pos = enemy.node.worldPosition;
                    const ddx = pos.x - x;
                    const ddy = pos.y - y;
                    if (ddx * ddx + ddy * ddy <= radiusSq) {
                        results.push(enemy);
                    }
                }
            }
        }

        return results;
    }

    /**
     * 获取离指定位置最近的敌人
     */
    public getNearestEnemy(x: number, y: number, maxRange: number = Infinity): Enemy | null {
        let nearest: Enemy | null = null;
        let minDist = maxRange * maxRange;

        for (const enemy of this._activeEnemies) {
            if (!enemy.isAlive) continue;
            const pos = enemy.node.worldPosition;
            const dx = pos.x - x;
            const dy = pos.y - y;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDist) {
                minDist = distSq;
                nearest = enemy;
            }
        }

        return nearest;
    }

    // ---- 敌人碰撞玩家（接触伤害） ----

    private _contactDamageInterval: number = 0.5;
    private _contactDamageTimer: number = 0;

    private _checkEnemyPlayerCollision(dt: number): void {
        this._contactDamageTimer += dt;
        if (this._contactDamageTimer < this._contactDamageInterval) return;
        this._contactDamageTimer = 0;

        const player = Player.instance;
        if (!player || !player.isAlive) return;

        const playerPos = player.node.worldPosition;
        const hitRange = 30; // 接触判定半径

        for (const enemy of this._activeEnemies) {
            if (!enemy.isAlive) continue;
            const pos = enemy.node.worldPosition;
            const dx = pos.x - playerPos.x;
            const dy = pos.y - playerPos.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < hitRange * hitRange) {
                player.takeDamage(enemy.data.atk);
                break; // 每次只受一次接触伤害
            }
        }
    }

    private _onEnemyKilled(data: any): void {
        if (data.enemy) {
            this.unregisterEnemy(data.enemy);
        }
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
        if (CombatSystem._instance === this) {
            CombatSystem._instance = null;
        }
    }
}
