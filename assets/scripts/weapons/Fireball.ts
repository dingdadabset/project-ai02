/**
 * Fireball - 火球术武器
 * 向最近敌人发射火球，远程单体高伤害
 */

import { _decorator, Vec2, Vec3 } from 'cc';
import { WeaponBase } from './WeaponBase';
import { CombatSystem } from '../systems/CombatSystem';
import { Player } from '../entities/Player';
import { ObjectPool } from '../core/ObjectPool';
import { Projectile, ProjectileData } from '../entities/Projectile';

const { ccclass, property } = _decorator;

@ccclass('Fireball')
export class Fireball extends WeaponBase {
    @property
    public projectileSpeed: number = 500;

    @property
    public projectileLifetime: number = 3;

    protected _initStats(): void {
        this.weaponId = 'fireball';
        this.weaponName = '火球术';
        this._maxLevel = 5;
        this._stats = {
            damage: 35,
            attackSpeed: 0.6,
            range: 400,
            count: 1,
            pierceCount: 0,
        };
    }

    public attack(): void {
        const combat = CombatSystem.instance;
        const player = Player.instance;
        if (!combat || !player) return;

        const playerPos = player.node.worldPosition;

        // 发射多个火球（count）
        for (let i = 0; i < this._stats.count; i++) {
            // 寻找目标
            const target = combat.getNearestEnemy(playerPos.x, playerPos.y, this._stats.range);
            if (!target) return;

            const targetPos = target.node.worldPosition;
            const dx = targetPos.x - playerPos.x;
            const dy = targetPos.y - playerPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 1) continue;

            const direction = new Vec2(dx / dist, dy / dist);

            // 从对象池获取火球
            const node = ObjectPool.instance.get('projectile_fireball');
            if (!node) continue;

            node.setWorldPosition(playerPos.x, playerPos.y, 0);

            // 如果有多个，稍微偏移角度
            if (this._stats.count > 1 && i > 0) {
                const angleOffset = (i - (this._stats.count - 1) / 2) * 15; // 15度间隔
                const rad = angleOffset * (Math.PI / 180);
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);
                const nx = direction.x * cos - direction.y * sin;
                const ny = direction.x * sin + direction.y * cos;
                direction.set(nx, ny);
            }

            const projectile = node.getComponent(Projectile);
            if (projectile) {
                projectile.init({
                    damage: this._stats.damage,
                    speed: this.projectileSpeed,
                    direction,
                    lifetime: this.projectileLifetime,
                    pierceCount: this._stats.pierceCount,
                    aoeRadius: 0,
                    ownerTag: 'player',
                    poolName: 'projectile_fireball',
                });
            }

            // 添加到场景
            this.node.parent?.addChild(node);
        }
    }

    protected _applyLevelStats(level: number): void {
        switch (level) {
            case 2:
                this._stats.damage = 45;
                this.projectileSpeed = 550;
                break;
            case 3:
                this._stats.damage = 50;
                this._stats.count = 2;
                break;
            case 4:
                this._stats.damage = 60;
                this._stats.attackSpeed = 0.8;
                this._stats.pierceCount = 1;
                break;
            case 5:
                this._stats.damage = 75;
                this._stats.count = 3;
                this._stats.pierceCount = 2;
                break;
        }
    }
}
