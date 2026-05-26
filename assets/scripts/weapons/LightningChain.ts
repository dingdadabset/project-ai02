/**
 * LightningChain - 闪电链武器
 * 自动弹射到最近敌人，可连锁弹射多个目标
 */

import { _decorator, Node, Vec3 } from 'cc';
import { WeaponBase } from './WeaponBase';
import { CombatSystem } from '../systems/CombatSystem';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

const { ccclass, property } = _decorator;

@ccclass('LightningChain')
export class LightningChain extends WeaponBase {
    @property
    public chainRange: number = 200; // 弹射范围

    @property
    public chainCount: number = 3; // 弹射次数

    @property
    public damageDecay: number = 0.8; // 每次弹射伤害衰减

    protected _initStats(): void {
        this.weaponId = 'lightning_chain';
        this.weaponName = '闪电链';
        this._maxLevel = 5;
        this._stats = {
            damage: 20,
            attackSpeed: 0.8,
            range: 300,
            count: 1,
            pierceCount: 0,
        };
    }

    public attack(): void {
        const combat = CombatSystem.instance;
        const player = Player.instance;
        if (!combat || !player) return;

        const playerPos = player.node.worldPosition;

        // 找到最近的敌人作为第一个目标
        const firstTarget = combat.getNearestEnemy(playerPos.x, playerPos.y, this._stats.range);
        if (!firstTarget) return;

        // 执行链式弹射
        this._executeChain(firstTarget, this._stats.count);
    }

    private _executeChain(startTarget: Enemy, chains: number): void {
        const combat = CombatSystem.instance;
        if (!combat) return;

        const hitTargets: Set<Enemy> = new Set();
        let currentTarget = startTarget;
        let currentDamage = this._stats.damage;

        for (let i = 0; i < this.chainCount + chains - 1; i++) {
            if (!currentTarget || !currentTarget.isAlive) break;

            // 造成伤害
            combat.dealDamageToEnemy(currentTarget, currentDamage);
            hitTargets.add(currentTarget);

            // 伤害衰减
            currentDamage = Math.floor(currentDamage * this.damageDecay);
            if (currentDamage < 1) break;

            // 找下一个弹射目标（排除已命中的）
            const pos = currentTarget.node.worldPosition;
            const nextTarget = this._findNextTarget(pos, hitTargets);
            currentTarget = nextTarget!;
        }
    }

    private _findNextTarget(from: Vec3, exclude: Set<Enemy>): Enemy | null {
        const combat = CombatSystem.instance;
        if (!combat) return null;

        const nearby = combat.getEnemiesNear(from.x, from.y, this.chainRange);
        let nearest: Enemy | null = null;
        let minDist = this.chainRange * this.chainRange;

        for (const enemy of nearby) {
            if (!enemy.isAlive || exclude.has(enemy)) continue;

            const pos = enemy.node.worldPosition;
            const dx = pos.x - from.x;
            const dy = pos.y - from.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDist) {
                minDist = distSq;
                nearest = enemy;
            }
        }

        return nearest;
    }

    protected _applyLevelStats(level: number): void {
        switch (level) {
            case 2:
                this._stats.damage = 25;
                this.chainCount = 4;
                break;
            case 3:
                this._stats.damage = 30;
                this._stats.attackSpeed = 1.0;
                break;
            case 4:
                this._stats.damage = 35;
                this.chainCount = 5;
                this.damageDecay = 0.85;
                break;
            case 5:
                this._stats.damage = 45;
                this.chainCount = 6;
                this._stats.count = 2; // 同时发射2条链
                break;
        }
    }
}
