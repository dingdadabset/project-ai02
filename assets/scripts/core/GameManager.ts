/**
 * GameManager - 游戏管理器（全局单例）
 * 管理游戏生命周期、状态切换、协调各子系统
 */

import { _decorator, Component, Node, director } from 'cc';
import { EventBus, GameEvent } from './EventBus';

const { ccclass, property } = _decorator;

export enum GameState {
    NONE = 0,
    LOADING = 1,      // 加载中
    HOME = 2,         // 主界面
    PLAYING = 3,      // 游戏中
    PAUSED = 4,       // 暂停
    LEVEL_UP = 5,     // 升级选技能
    BOSS_FIGHT = 6,   // Boss战
    VICTORY = 7,      // 胜利
    GAME_OVER = 8,    // 失败
}

export interface GameData {
    currentLevel: number;
    currentWave: number;
    score: number;
    killCount: number;
    elapsedTime: number;
    playerLevel: number;
}

@ccclass('GameManager')
export class GameManager extends Component {
    private static _instance: GameManager | null = null;

    private _state: GameState = GameState.NONE;
    private _prevState: GameState = GameState.NONE;
    private _gameData: GameData = {
        currentLevel: 1,
        currentWave: 0,
        score: 0,
        killCount: 0,
        elapsedTime: 0,
        playerLevel: 1,
    };

    private _isPaused: boolean = false;

    public static get instance(): GameManager {
        return GameManager._instance!;
    }

    public get state(): GameState {
        return this._state;
    }

    public get gameData(): GameData {
        return this._gameData;
    }

    public get isPaused(): boolean {
        return this._isPaused;
    }

    onLoad(): void {
        if (GameManager._instance && GameManager._instance !== this) {
            this.node.destroy();
            return;
        }
        GameManager._instance = this;
        director.addPersistRootNode(this.node);
        this._initEventListeners();
    }

    private _initEventListeners(): void {
        const bus = EventBus.instance;
        bus.on(GameEvent.ENEMY_KILLED, this._onEnemyKilled, this);
        bus.on(GameEvent.PLAYER_LEVEL_UP, this._onPlayerLevelUp, this);
        bus.on(GameEvent.LEVEL_COMPLETE, this._onLevelComplete, this);
        bus.on(GameEvent.PLAYER_DEAD, this._onPlayerDead, this);
        bus.on(GameEvent.BOSS_SPAWN, this._onBossSpawn, this);
    }

    /**
     * 切换游戏状态
     */
    public changeState(newState: GameState): void {
        if (this._state === newState) return;

        this._prevState = this._state;
        this._state = newState;

        console.log(`[GameManager] State: ${GameState[this._prevState]} -> ${GameState[newState]}`);

        switch (newState) {
            case GameState.PLAYING:
                this._onEnterPlaying();
                break;
            case GameState.PAUSED:
                this._onEnterPaused();
                break;
            case GameState.LEVEL_UP:
                this._onEnterLevelUp();
                break;
            case GameState.VICTORY:
                this._onEnterVictory();
                break;
            case GameState.GAME_OVER:
                this._onEnterGameOver();
                break;
        }
    }

    /**
     * 开始新游戏
     */
    public startGame(level: number = 1): void {
        this._gameData = {
            currentLevel: level,
            currentWave: 0,
            score: 0,
            killCount: 0,
            elapsedTime: 0,
            playerLevel: 1,
        };
        this.changeState(GameState.PLAYING);
        EventBus.instance.emit(GameEvent.GAME_START);
    }

    /**
     * 暂停游戏
     */
    public pauseGame(): void {
        if (this._state !== GameState.PLAYING) return;
        this._isPaused = true;
        this.changeState(GameState.PAUSED);
        EventBus.instance.emit(GameEvent.GAME_PAUSE);
    }

    /**
     * 恢复游戏
     */
    public resumeGame(): void {
        this._isPaused = false;
        this.changeState(this._prevState === GameState.LEVEL_UP ? GameState.PLAYING : this._prevState);
        EventBus.instance.emit(GameEvent.GAME_RESUME);
    }

    update(dt: number): void {
        if (this._state === GameState.PLAYING) {
            this._gameData.elapsedTime += dt;
        }
    }

    // ---- 状态进入回调 ----

    private _onEnterPlaying(): void {
        this._isPaused = false;
        director.resume();
    }

    private _onEnterPaused(): void {
        // 不调用 director.pause()，让 UI 动画继续
    }

    private _onEnterLevelUp(): void {
        this._isPaused = true;
    }

    private _onEnterVictory(): void {
        this._isPaused = true;
    }

    private _onEnterGameOver(): void {
        this._isPaused = true;
        EventBus.instance.emit(GameEvent.GAME_OVER);
    }

    // ---- 事件回调 ----

    private _onEnemyKilled(): void {
        this._gameData.killCount++;
        this._gameData.score += 10;
    }

    private _onPlayerLevelUp(): void {
        this._gameData.playerLevel++;
        this.changeState(GameState.LEVEL_UP);
    }

    private _onLevelComplete(): void {
        this.changeState(GameState.VICTORY);
    }

    private _onPlayerDead(): void {
        this.changeState(GameState.GAME_OVER);
    }

    private _onBossSpawn(): void {
        this.changeState(GameState.BOSS_FIGHT);
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
        if (GameManager._instance === this) {
            GameManager._instance = null;
        }
    }
}
