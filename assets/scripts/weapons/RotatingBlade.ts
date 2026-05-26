/**
 * RotatingBlade - 旋转刀刃武器
 * 环绕玩家旋转，碰到敌人造成伤害
 */

import { _decorator, Component, Node, Vec3, math } from 'cc';
import { WeaponBase, WeaponStats } from './WeaponBase';
import { CombatSystem } from '../systems/CombatSystem';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

@ccclass('RotatingBlade')
export class RotatingBlade extends WeaponBase {
    @property
    public rotateSpeed: number = 180; // 度/秒

    @property
    public orbitRadius: number = 80; // 环绕半径

    @property
    public hitCooldown: number = 0.5; // 对同一目标的命中冷却

    // 刀刃节点列表
    private _blades: Node[] = [];
    private _currentAngle: number = 0;

    // 命中冷却记录
    private _hitCooldowns: Map<Enemy, number> = new Map();

    protected _initStats(): void {
        this.weaponId = 'rotating_blade';
        this.weaponName = '旋转刀刃';
        this._maxLevel = 5;
        this._stats = {
            damage: 15,
            attackSpeed: 1.0, // 不用于旋转刀刃（持续旋转）
            range: this.orbitRadius,
            count: 1,
            pierceCount: 999, // 无限穿透
        };
    }

    start(): void {
        super.start();
        this._createBlades();
    }

    /**
     * 创建刀刃节点
     */
    private _createBlades(): void {
        // 清除旧刀刃
        for (const blade of this._blades) {
            blade.destroy();
        }
        this._blades = [];

        // 根据 count 创建
        for (let i = 0; i < this._stats.count; i++) {
            const blade = new Node(`Blade_${i}`);
            this.node.addChild(blade);
            this._blades.push(blade);
        }

        this._updateBladePositions();
    }

    update(dt: number): void {
        if (!GameManager.instance || GameManager.instance.isPaused) return;

        // 旋转
        this._currentAngle += this.rotateSpeed * dt;
        if (this._currentAngle >= 360) this._currentAngle -= 360;

        this._updateBladePositions();
        this._checkHits(dt);
        this._updateCooldowns(dt);
    }

    /**
     * 更新刀刃位置（均匀分布在圆周上）
     */
    private _updateBladePositions(): void {
        const count = this._blades.length;
        const angleStep = 360 / count;

        for (let i = 0; i < count; i++) {
            const angle = (this._currentAngle + angleStep * i) * (Math.PI / 180);
            const x = Math.cos(angle) * this.orbitRadius;
            const y = Math.sin(angle) * this.orbitRadius;
            this._blades[i].setPosition(x, y, 0);
        }
    }

    /**
     * 碰撞检测：检查刀刃是否接触敌人
     */
    private _checkHits(dt: number): void {
        const combat = CombatSystem.instance;
        if (!combat) return;

        const bladeHitRadius = 25; // 刀刃碰撞半径

        for (const blade of this._blades) {
            const bladeWorldPos = blade.worldPosition;

            // 使用空间分区快速查询附近敌人
            const nearbyEnemies = combat.getEnemiesNear(
                bladeWorldPos.x,
                bladeWorldPos.y,
                bladeHitRadius + 20
            );

            for (const enemy of nearbyEnemies) {
                if (!enemy.isAlive) continue;

                // 冷却检查
                if (this._hitCooldowns.has(enemy)) continue;

                // 距离检查
                const pos = enemy.node.worldPosition;
                const dx = pos.x - bladeWorldPos.x;
                const dy = pos.y - bladeWorldPos.y;
                const distSq = dx * dx + dy * dy;
                const hitDist = bladeHitRadius + enemy.data.size * 16;

                if (distSq < hitDist * hitDist) {
                    // 命中
                    combat.dealDamageToEnemy(enemy, this._stats.damage);

                    // 设置冷却
                    this._hitCooldowns.set(enemy, this.hitCooldown);
                }
            }
        }
    }

    /**
     * 更新命中冷却
     */
    private _updateCooldowns(dt: number): void {
        for (const [enemy, timer] of this._hitCooldowns.entries()) {
            const newTimer = timer - dt;
            if (newTimer <= 0 || !enemy.isAlive) {
                this._hitCooldowns.delete(enemy);
            } else {
                this._hitCooldowns.set(enemy, newTimer);
            }
        }
    }

    /**
     * 攻击（旋转刀刃不需要显式攻击，持续旋转）
     */
    public attack(): void {
        // 旋转刀刃的攻击由 _checkHits 持续处理
    }

    /**
     * 升级逻辑
     */
    protected _applyLevelStats(level: number): void {
        switch (level) {
            case 2:
                this._stats.damage = 20;
                this.rotateSpeed = 210;
                break;
            case 3:
                this._stats.damage = 20;
                this._stats.count = 2;
                this._createBlades();
                break;
            case 4:
                this._stats.damage = 30;
                this.rotateSpeed = 240;
                this.orbitRadius = 100;
                break;
            case 5:
                this._stats.damage = 30;
                this._stats.count = 3;
                this.rotateSpeed = 270;
                this._createBlades();
                break;
        }
    }

    onDestroy(): void {
        super.onDestroy();
        this._hitCooldowns.clear();
    }
}
