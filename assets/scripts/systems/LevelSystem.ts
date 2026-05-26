/**
 * LevelSystem - 关卡系统
 * 管理关卡加载、波次调度、结算
 */

import { _decorator, Component } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { ConfigManager, LevelConfig } from '../core/ConfigManager';
import { GameManager, GameState } from '../core/GameManager';
import { SpawnSystem } from './SpawnSystem';

const { ccclass, property } = _decorator;

export interface LevelResult {
    levelId: string;
    success: boolean;
    timeTaken: number;
    killCount: number;
    score: number;
    goldEarned: number;
    expEarned: number;
}

@ccclass('LevelSystem')
export class LevelSystem extends Component {
    private static _instance: LevelSystem | null = null;

    @property(SpawnSystem)
    public spawnSystem: SpawnSystem | null = null;

    private _currentLevel: LevelConfig | null = null;
    private _elapsedTime: number = 0;
    private _isRunning: boolean = false;

    public static get instance(): LevelSystem {
        return LevelSystem._instance!;
    }

    public get currentLevel(): LevelConfig | null {
        return this._currentLevel;
    }

    public get elapsedTime(): number {
        return this._elapsedTime;
    }

    public get remainingTime(): number {
        if (!this._currentLevel) return 0;
        return Math.max(0, this._currentLevel.duration - this._elapsedTime);
    }

    onLoad(): void {
        LevelSystem._instance = this;
    }

    start(): void {
        EventBus.instance.on(GameEvent.LEVEL_COMPLETE, this._onLevelComplete, this);
        EventBus.instance.on(GameEvent.GAME_OVER, this._onGameOver, this);
    }

    /**
     * 加载并开始关卡
     */
    public startLevel(chapter: number, stage: number): boolean {
        const config = ConfigManager.instance.getLevelByChapterStage(chapter, stage);
        if (!config) {
            console.error(`[LevelSystem] Level not found: ${chapter}-${stage}`);
            return false;
        }

        this._currentLevel = config;
        this._elapsedTime = 0;
        this._isRunning = true;

        // 启动刷怪系统
        if (this.spawnSystem) {
            this.spawnSystem.startLevel(config.waves);
        }

        console.log(`[LevelSystem] Starting level: ${config.id} (${config.duration}s)`);
        return true;
    }

    /**
     * 通过 ID 加载关卡
     */
    public startLevelById(levelId: string): boolean {
        const config = ConfigManager.instance.getLevel(levelId);
        if (!config) {
            console.error(`[LevelSystem] Level not found: ${levelId}`);
            return false;
        }

        this._currentLevel = config;
        this._elapsedTime = 0;
        this._isRunning = true;

        if (this.spawnSystem) {
            this.spawnSystem.startLevel(config.waves);
        }

        return true;
    }

    update(dt: number): void {
        if (!this._isRunning) return;
        if (!GameManager.instance || GameManager.instance.isPaused) return;

        this._elapsedTime += dt;

        // 时间到 → 关卡完成（存活模式）
        if (this._currentLevel && this._elapsedTime >= this._currentLevel.duration) {
            this._isRunning = false;
            EventBus.instance.emit(GameEvent.LEVEL_COMPLETE);
        }
    }

    /**
     * 关卡完成结算
     */
    private _onLevelComplete(): void {
        this._isRunning = false;
        if (this.spawnSystem) {
            this.spawnSystem.stop();
        }

        const result = this._generateResult(true);
        console.log('[LevelSystem] Level complete!', result);
    }

    /**
     * 游戏结束（玩家死亡）
     */
    private _onGameOver(): void {
        this._isRunning = false;
        if (this.spawnSystem) {
            this.spawnSystem.stop();
        }

        const result = this._generateResult(false);
        console.log('[LevelSystem] Game over.', result);
    }

    /**
     * 生成关卡结算数据
     */
    private _generateResult(success: boolean): LevelResult {
        const gameData = GameManager.instance.gameData;

        // 金币奖励（随机范围）
        let goldEarned = 0;
        if (this._currentLevel && success) {
            const [min, max] = this._currentLevel.rewards.gold;
            goldEarned = Math.floor(min + Math.random() * (max - min));
        } else {
            // 失败也给部分奖励
            goldEarned = Math.floor(gameData.killCount * 2);
        }

        return {
            levelId: this._currentLevel?.id || '',
            success,
            timeTaken: this._elapsedTime,
            killCount: gameData.killCount,
            score: gameData.score,
            goldEarned,
            expEarned: this._currentLevel?.rewards.exp || 0,
        };
    }

    /**
     * 重置
     */
    public reset(): void {
        this._currentLevel = null;
        this._elapsedTime = 0;
        this._isRunning = false;
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
        if (LevelSystem._instance === this) {
            LevelSystem._instance = null;
        }
    }
}
