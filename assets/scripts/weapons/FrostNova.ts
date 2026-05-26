/**
 * FrostNova - 冰霜新星武器
 * 周期性释放冰霜波，AOE伤害 + 减速效果
 */

import { _decorator, Vec3 } from 'cc';
import { WeaponBase } from './WeaponBase';
import { CombatSystem } from '../systems/CombatSystem';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

const { ccclass, property } = _decorator;

@ccclass('FrostNova')
export class FrostNova extends WeaponBase {
    @property
    public slowPercent: number = 0.3; // 减速30%

    @property
    public slowDuration: number = 2.0; // 减速持续时间

    @property
    public aoeRadius: number = 150; // AOE 半径

    protected _initStats(): void {
        this.weaponId = 'frost_nova';
        this.weaponName = '冰霜新星';
        this._maxLevel = 5;
        this._stats = {
            damage: 12,
            attackSpeed: 0.4, // 较低频率，但范围大
            range: 150,
            count: 1,
            pierceCount: 999,
        };
    }

    public attack(): void {
        const combat = CombatSystem.instance;
        const player = Player.instance;
        if (!combat || !player) return;

        const playerPos = player.node.worldPosition;

        // AOE 伤害
        const hits = combat.dealAoeDamage(playerPos, this.aoeRadius, this._stats.damage);

        // 对命中的敌人施加减速
        for (const hit of hits) {
            const enemy = hit.target.getComponent(Enemy);
            if (enemy && enemy.isAlive) {
                this._applySlow(enemy);
            }
        }

        // TODO: 播放冰霜新星特效
    }

    /**
     * 施加减速效果
     */
    private _applySlow(enemy: Enemy): void {
        // 简化实现：直接临时降低速度
        // 完整版应使用 Buff 系统
        const originalSpeed = enemy.data.speed;
        const slowedSpeed = originalSpeed * (1 - this.slowPercent);

        // 临时修改速度（简化版）
        (enemy.data as any).speed = slowedSpeed;

        // 延迟恢复
        this.scheduleOnce(() => {
            if (enemy && enemy.isAlive) {
                (enemy.data as any).speed = originalSpeed;
            }
        }, this.slowDuration);
    }

    protected _applyLevelStats(level: number): void {
        switch (level) {
            case 2:
                this._stats.damage = 16;
                this.aoeRadius = 180;
                break;
            case 3:
                this._stats.damage = 20;
                this.slowPercent = 0.4;
                this._stats.attackSpeed = 0.5;
                break;
            case 4:
                this._stats.damage = 25;
                this.aoeRadius = 220;
                this.slowDuration = 3.0;
                break;
            case 5:
                this._stats.damage = 35;
                this.aoeRadius = 260;
                this.slowPercent = 0.5;
                this._stats.attackSpeed = 0.6;
                break;
        }
    }
}
