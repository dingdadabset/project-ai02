/**
 * SpawnSystem - 刷怪系统
 * 按照关卡配置，管理敌人的生成时机和方式
 */

import { _decorator, Component, Node, Vec3, Prefab } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { ObjectPool } from '../core/ObjectPool';
import { ConfigManager, WaveConfig, EnemyConfig } from '../core/ConfigManager';
import { GameManager } from '../core/GameManager';
import { CombatSystem } from './CombatSystem';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';

const { ccclass, property } = _decorator;

interface ActiveWave {
    config: WaveConfig;
    spawnTimer: number;
    elapsed: number;
    totalSpawned: number;
}

@ccclass('SpawnSystem')
export class SpawnSystem extends Component {
    @property(Node)
    public enemyContainer: Node | null = null; // 敌人父节点

    @property
    public spawnRadiusMin: number = 400; // 最小刷新半径（离玩家）

    @property
    public spawnRadiusMax: number = 600; // 最大刷新半径

    @property
    public maxEnemiesOnScreen: number = 150; // 同屏最大敌人数

    private _waves: WaveConfig[] = [];
    private _activeWaves: ActiveWave[] = [];
    private _elapsedTime: number = 0;
    private _nextWaveIndex: number = 0;
    private _isRunning: boolean = false;

    /**
     * 加载关卡波次配置并开始刷怪
     */
    public startLevel(waves: WaveConfig[]): void {
        this._waves = waves;
        this._activeWaves = [];
        this._elapsedTime = 0;
        this._nextWaveIndex = 0;
        this._isRunning = true;
    }

    /**
     * 停止刷怪
     */
    public stop(): void {
        this._isRunning = false;
        this._activeWaves = [];
    }

    update(dt: number): void {
        if (!this._isRunning) return;
        if (!GameManager.instance || GameManager.instance.isPaused) return;

        this._elapsedTime += dt;

        // 检查是否有新波次需要激活
        this._checkNewWaves();

        // 更新活跃波次
        this._updateActiveWaves(dt);
    }

    private _checkNewWaves(): void {
        while (this._nextWaveIndex < this._waves.length) {
            const wave = this._waves[this._nextWaveIndex];
            if (this._elapsedTime >= wave.time) {
                this._activeWaves.push({
                    config: wave,
                    spawnTimer: 0,
                    elapsed: 0,
                    totalSpawned: 0,
                });

                if (wave.enemy && wave.enemy.includes('boss')) {
                    EventBus.instance.emit(GameEvent.BOSS_SPAWN, wave.enemy);
                } else {
                    EventBus.instance.emit(GameEvent.WAVE_START, this._nextWaveIndex);
                }

                this._nextWaveIndex++;
            } else {
                break;
            }
        }
    }

    private _updateActiveWaves(dt: number): void {
        for (let i = this._activeWaves.length - 1; i >= 0; i--) {
            const wave = this._activeWaves[i];
            wave.elapsed += dt;
            wave.spawnTimer += dt;

            // 波次持续时间到期
            if (wave.config.duration && wave.elapsed >= wave.config.duration) {
                this._activeWaves.splice(i, 1);
                continue;
            }

            // 固定数量刷新模式（Boss等）
            if (wave.config.count && wave.totalSpawned >= wave.config.count) {
                this._activeWaves.splice(i, 1);
                continue;
            }

            // 按频率刷新
            const interval = wave.config.rate > 0 ? 1.0 / wave.config.rate : 1.0;
            if (wave.spawnTimer >= interval) {
                wave.spawnTimer -= interval;

                // 同屏限制
                if (CombatSystem.instance &&
                    CombatSystem.instance.activeEnemyCount < this.maxEnemiesOnScreen) {
                    this._spawnEnemy(wave.config.enemy);
                    wave.totalSpawned++;
                }
            }
        }

        // 所有波次结束 & 场上无敌人 = 关卡完成
        if (this._nextWaveIndex >= this._waves.length &&
            this._activeWaves.length === 0 &&
            CombatSystem.instance &&
            CombatSystem.instance.activeEnemyCount === 0) {
            this._isRunning = false;
            EventBus.instance.emit(GameEvent.LEVEL_COMPLETE);
        }
    }

    private _spawnEnemy(enemyId: string): void {
        const config = ConfigManager.instance.getEnemy(enemyId);
        if (!config) {
            console.warn(`[SpawnSystem] Unknown enemy: ${enemyId}`);
            return;
        }

        // 从对象池获取
        const node = ObjectPool.instance.get(enemyId);
        if (!node) {
            console.warn(`[SpawnSystem] No pool for: ${enemyId}`);
            return;
        }

        // 设置生成位置
        const spawnPos = this._getSpawnPosition();
        node.setWorldPosition(spawnPos);

        // 初始化敌人数据
        const enemy = node.getComponent(Enemy);
        if (enemy) {
            enemy.init({
                id: config.id,
                type: config.type,
                maxHp: config.hp,
                atk: config.atk,
                speed: config.speed,
                exp: config.exp,
                dropTable: config.dropTable,
            }, enemyId);

            // 注册到战斗系统
            CombatSystem.instance?.registerEnemy(enemy);
        }

        // 添加到场景
        if (this.enemyContainer) {
            this.enemyContainer.addChild(node);
        }
    }

    /**
     * 在玩家周围随机位置生成（屏幕外）
     */
    private _getSpawnPosition(): Vec3 {
        const player = Player.instance;
        const center = player ? player.node.worldPosition : new Vec3(0, 0, 0);

        const angle = Math.random() * Math.PI * 2;
        const radius = this.spawnRadiusMin + Math.random() * (this.spawnRadiusMax - this.spawnRadiusMin);

        return new Vec3(
            center.x + Math.cos(angle) * radius,
            center.y + Math.sin(angle) * radius,
            0
        );
    }

    onDestroy(): void {
        this._isRunning = false;
    }
}
