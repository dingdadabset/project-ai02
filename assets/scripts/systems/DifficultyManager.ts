/**
 * DifficultyManager - 难度递增管理
 * 台账编号: M06-T03
 * 
 * 功能：
 * 1. 关卡内难度曲线（随时间递增刷怪频率/敌人血量/敌人速度）
 * 2. 关卡间难度递增（章节倍率）
 * 3. Boss 出现时全屏提示
 * 4. 监听 boss_phase_change 切换 BGM/UI
 */

import { _decorator, Component } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { LevelSystem } from './LevelSystem';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

export interface DifficultyMultipliers {
    enemyHpMul: number;     // 敌人血量倍率
    enemyAtkMul: number;    // 敌人攻击力倍率
    enemySpeedMul: number;  // 敌人速度倍率
    spawnRateMul: number;   // 刷怪频率倍率
}

@ccclass('DifficultyManager')
export class DifficultyManager extends Component {
    private static _instance: DifficultyManager | null = null;

    @property
    public timeMaxScale: number = 0.5;   // 关卡内时间最大加成 0~50%

    @property
    public chapterScalePerLevel: number = 0.15; // 每章+15%

    private _bossWarningShown: boolean = false;

    public static get instance(): DifficultyManager {
        return DifficultyManager._instance!;
    }

    onLoad(): void {
        DifficultyManager._instance = this;
    }

    start(): void {
        EventBus.instance.on(GameEvent.BOSS_SPAWN, this._onBossSpawn, this);
        EventBus.instance.on('boss_phase_change', this._onBossPhaseChange, this);
        EventBus.instance.on(GameEvent.LEVEL_COMPLETE, this._onLevelReset, this);
        EventBus.instance.on(GameEvent.GAME_OVER, this._onLevelReset, this);
    }

    /**
     * 获取当前难度倍率（基于关卡时间 + 章节）
     */
    public getCurrentMultipliers(): DifficultyMultipliers {
        const level = LevelSystem.instance?.currentLevel;
        let timeFactor = 0;
        let chapterFactor = 0;

        if (level) {
            const elapsed = LevelSystem.instance.elapsedTime;
            timeFactor = Math.min(1, elapsed / level.duration) * this.timeMaxScale;
            chapterFactor = (level.chapter - 1) * this.chapterScalePerLevel;
        }

        const total = 1 + timeFactor + chapterFactor;
        return {
            enemyHpMul: total,
            enemyAtkMul: 1 + (total - 1) * 0.6,   // 攻击力增长慢一点
            enemySpeedMul: 1 + (total - 1) * 0.3, // 速度增长更慢
            spawnRateMul: 1 + timeFactor * 1.5,   // 刷怪频率随时间快速增长
        };
    }

    /**
     * 应用难度倍率到敌人数据（SpawnSystem 调用）
     */
    public applyToEnemyData(rawHp: number, rawAtk: number, rawSpeed: number): {
        hp: number; atk: number; speed: number
    } {
        const m = this.getCurrentMultipliers();
        return {
            hp: Math.floor(rawHp * m.enemyHpMul),
            atk: Math.floor(rawAtk * m.enemyAtkMul),
            speed: rawSpeed * m.enemySpeedMul,
        };
    }

    /**
     * 获取刷怪频率倍率
     */
    public getSpawnRateMul(): number {
        return this.getCurrentMultipliers().spawnRateMul;
    }

    private _onBossSpawn(enemyId: string): void {
        if (this._bossWarningShown) return;
        this._bossWarningShown = true;
        // 全屏 Boss 警告事件，由 HUD 监听显示
        EventBus.instance.emit('boss_warning', { enemyId, duration: 2.0 });
    }

    private _onBossPhaseChange(data: any): void {
        // 通知 UI 切换 Boss 血条样式 / BGM 加快
        EventBus.instance.emit('boss_phase_ui', data);
    }

    private _onLevelReset(): void {
        this._bossWarningShown = false;
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
        if (DifficultyManager._instance === this) {
            DifficultyManager._instance = null;
        }
    }
}
