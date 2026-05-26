/**
 * SceneLoader - 场景管理与资源加载
 * 管理场景切换流程（loading→home→battle），资源分包加载，加载进度回调
 * 
 * 台账编号: M01-T06
 */

import { _decorator, Component, Node, director, Prefab, ProgressBar, Label } from 'cc';
import { ConfigManager } from './ConfigManager';
import { ObjectPool } from './ObjectPool';
import { GameManager, GameState } from './GameManager';
import { EventBus, GameEvent } from './EventBus';
import { SaveManager } from './SaveManager';
import { PoolPresets, Scenes, AssetPaths } from '../utils/Constants';

const { ccclass, property } = _decorator;

/** 加载阶段枚举 */
enum LoadStage {
    NONE = 0,
    CONFIG = 1,       // 加载配置表
    PREFABS = 2,      // 加载预制体
    POOL_PRELOAD = 3, // 对象池预加载
    COMPLETE = 4,     // 加载完成
}

/** 资源加载进度数据 */
export interface LoadProgress {
    stage: LoadStage;
    stageName: string;
    stageProgress: number;  // 当前阶段进度 0-1
    totalProgress: number;  // 总进度 0-1
}

@ccclass('SceneLoader')
export class SceneLoader extends Component {
    private static _instance: SceneLoader | null = null;

    @property(ProgressBar)
    public progressBar: ProgressBar | null = null;

    @property(Label)
    public progressLabel: Label | null = null;

    @property(Label)
    public stageLabel: Label | null = null;

    // 预制体注册表（需要在 Cocos 编辑器中拖入）
    @property([Prefab])
    public enemyPrefabs: Prefab[] = [];

    @property([Prefab])
    public projectilePrefabs: Prefab[] = [];

    @property([Prefab])
    public dropPrefabs: Prefab[] = [];

    @property([Prefab])
    public effectPrefabs: Prefab[] = [];

    private _currentStage: LoadStage = LoadStage.NONE;
    private _totalProgress: number = 0;
    private _isLoading: boolean = false;
    private _retryCount: number = 0;
    private _maxRetries: number = 3;

    public static get instance(): SceneLoader {
        return SceneLoader._instance!;
    }

    public get isLoading(): boolean {
        return this._isLoading;
    }

    public get totalProgress(): number {
        return this._totalProgress;
    }

    onLoad(): void {
        if (SceneLoader._instance && SceneLoader._instance !== this) {
            this.node.destroy();
            return;
        }
        SceneLoader._instance = this;
    }

    start(): void {
        // 如果在 loading 场景，自动开始加载
        this.startLoading();
    }

    /**
     * 开始完整加载流程
     */
    public async startLoading(): Promise<void> {
        if (this._isLoading) return;
        this._isLoading = true;
        this._retryCount = 0;

        try {
            // 阶段1: 加载配置表
            await this._loadConfigs();

            // 阶段2: 加载存档
            this._loadSave();

            // 阶段3: 注册预制体到对象池
            this._registerPrefabs();

            // 阶段4: 预加载对象池
            await this._preloadPools();

            // 完成
            this._onLoadComplete();
        } catch (error) {
            console.error('[SceneLoader] Loading failed:', error);
            this._onLoadFailed(error);
        }
    }

    /**
     * 阶段1: 加载配置表
     */
    private async _loadConfigs(): Promise<void> {
        this._setStage(LoadStage.CONFIG, '加载配置表...');

        try {
            await ConfigManager.instance.loadAll();
            this._updateProgress(1.0);
        } catch (error) {
            if (this._retryCount < this._maxRetries) {
                this._retryCount++;
                console.warn(`[SceneLoader] Config load failed, retry ${this._retryCount}/${this._maxRetries}`);
                await this._delay(1000); // 等待1秒后重试
                return this._loadConfigs();
            }
            throw error;
        }
    }

    /**
     * 阶段2: 加载存档
     */
    private _loadSave(): void {
        SaveManager.instance.load();
    }

    /**
     * 阶段3: 注册预制体到对象池
     */
    private _registerPrefabs(): void {
        this._setStage(LoadStage.PREFABS, '注册资源...');

        const pool = ObjectPool.instance;

        // 注册敌人预制体
        for (const prefab of this.enemyPrefabs) {
            if (prefab) {
                pool.registerPrefab(prefab.name, prefab);
            }
        }

        // 注册投射物预制体
        for (const prefab of this.projectilePrefabs) {
            if (prefab) {
                pool.registerPrefab(prefab.name, prefab);
            }
        }

        // 注册掉落物预制体
        for (const prefab of this.dropPrefabs) {
            if (prefab) {
                pool.registerPrefab(prefab.name, prefab);
            }
        }

        // 注册特效预制体
        for (const prefab of this.effectPrefabs) {
            if (prefab) {
                pool.registerPrefab(prefab.name, prefab);
            }
        }

        this._updateProgress(1.0);
    }

    /**
     * 阶段4: 预加载对象池
     */
    private async _preloadPools(): Promise<void> {
        this._setStage(LoadStage.POOL_PRELOAD, '预加载对象池...');

        const presets = Object.values(PoolPresets);
        const total = presets.length;
        let loaded = 0;

        for (const preset of presets) {
            ObjectPool.instance.preload(preset.name, preset.preloadCount);
            loaded++;
            this._updateProgress(loaded / total);

            // 每预加载一批，让出一帧避免卡住
            if (loaded % 3 === 0) {
                await this._nextFrame();
            }
        }
    }

    /**
     * 加载完成
     */
    private _onLoadComplete(): void {
        this._setStage(LoadStage.COMPLETE, '加载完成!');
        this._updateProgress(1.0);
        this._isLoading = false;

        console.log('[SceneLoader] All resources loaded successfully.');

        // 延迟0.5s后跳转到主界面
        this.scheduleOnce(() => {
            this.loadScene(Scenes.HOME);
        }, 0.5);
    }

    /**
     * 加载失败处理
     */
    private _onLoadFailed(error: any): void {
        this._isLoading = false;
        if (this.stageLabel) {
            this.stageLabel.string = '加载失败，点击重试';
        }

        // 可以显示重试按钮
        console.error('[SceneLoader] Load failed after retries:', error);
    }

    /**
     * 切换场景
     */
    public loadScene(sceneName: string): void {
        console.log(`[SceneLoader] Loading scene: ${sceneName}`);
        director.loadScene(sceneName, (err) => {
            if (err) {
                console.error(`[SceneLoader] Failed to load scene: ${sceneName}`, err);
                return;
            }
        });
    }

    /**
     * 预加载战斗场景资源（进入战斗前调用）
     */
    public async preloadBattle(): Promise<void> {
        // 确保对象池已预加载
        if (!ConfigManager.instance.isLoaded) {
            await ConfigManager.instance.loadAll();
        }
        console.log('[SceneLoader] Battle resources preloaded.');
    }

    /**
     * 进入战斗场景
     */
    public enterBattle(chapter: number = 1, stage: number = 1): void {
        if (GameManager.instance) {
            GameManager.instance.gameData.currentLevel = stage;
        }
        this.loadScene(Scenes.BATTLE);
    }

    /**
     * 返回主界面
     */
    public returnHome(): void {
        // 清理战斗资源
        ObjectPool.instance.clearAll();

        if (GameManager.instance) {
            GameManager.instance.changeState(GameState.HOME);
        }

        // 自动保存
        SaveManager.instance.autoSave();

        this.loadScene(Scenes.HOME);
    }

    // ---- 内部工具方法 ----

    private _setStage(stage: LoadStage, label: string): void {
        this._currentStage = stage;
        if (this.stageLabel) {
            this.stageLabel.string = label;
        }
    }

    private _updateProgress(stageProgress: number): void {
        // 总进度 = 各阶段权重
        const stageWeights = [0, 0.3, 0.1, 0.2, 0.4]; // CONFIG, SAVE, PREFABS, POOL
        let totalBefore = 0;
        for (let i = 1; i < this._currentStage; i++) {
            totalBefore += stageWeights[i];
        }
        const currentWeight = stageWeights[this._currentStage] || 0;
        this._totalProgress = totalBefore + currentWeight * stageProgress;

        // 更新UI
        if (this.progressBar) {
            this.progressBar.progress = this._totalProgress;
        }
        if (this.progressLabel) {
            this.progressLabel.string = `${Math.floor(this._totalProgress * 100)}%`;
        }
    }

    private _delay(ms: number): Promise<void> {
        return new Promise(resolve => {
            this.scheduleOnce(() => resolve(), ms / 1000);
        });
    }

    private _nextFrame(): Promise<void> {
        return new Promise(resolve => {
            this.scheduleOnce(() => resolve(), 0);
        });
    }

    onDestroy(): void {
        if (SceneLoader._instance === this) {
            SceneLoader._instance = null;
        }
    }
}
