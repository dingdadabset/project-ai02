/**
 * TaskSystem - 每日任务与成就系统
 * 台账编号: M08-T04
 */

import { _decorator, Component, JsonAsset, resources, sys } from 'cc';
import { SaveManager } from '../core/SaveManager';
import { EventBus, GameEvent } from '../core/EventBus';

const { ccclass } = _decorator;

export type TaskType =
    | 'kill_count' | 'level_clear' | 'play_time' | 'level_up'
    | 'total_kills' | 'chapter_clear' | 'unlock_all_characters'
    | 'max_level_weapon' | 'no_damage_clear';

export interface TaskConfig {
    id: string;
    name: string;
    description: string;
    type: TaskType;
    target: number;
    rewardType: 'gold' | 'diamond';
    rewardAmount: number;
}

interface TaskProgress {
    progress: number;
    completed: boolean;
    claimed: boolean;
}

@ccclass('TaskSystem')
export class TaskSystem extends Component {
    private static _instance: TaskSystem | null = null;

    private _dailyTasks: TaskConfig[] = [];
    private _achievements: TaskConfig[] = [];

    private _dailyProgress: Record<string, TaskProgress> = {};
    private _achievementProgress: Record<string, TaskProgress> = {};

    private _lastResetDay: number = 0;

    public static get instance(): TaskSystem {
        return TaskSystem._instance!;
    }

    onLoad(): void {
        if (TaskSystem._instance && TaskSystem._instance !== this) {
            this.node.destroy();
            return;
        }
        TaskSystem._instance = this;
    }

    public async load(): Promise<void> {
        return new Promise((resolve) => {
            resources.load('configs/task_config', JsonAsset, (err, asset) => {
                if (err) {
                    console.error('[TaskSystem] Failed to load:', err);
                    resolve();
                    return;
                }
                const data = asset.json as { dailyTasks: TaskConfig[]; achievements: TaskConfig[] };
                this._dailyTasks = data.dailyTasks || [];
                this._achievements = data.achievements || [];

                this._loadProgressFromSave();
                this._checkDailyReset();
                this._registerListeners();

                console.log(`[TaskSystem] Loaded ${this._dailyTasks.length} daily tasks, ${this._achievements.length} achievements.`);
                resolve();
            });
        });
    }

    private _loadProgressFromSave(): void {
        const save = SaveManager.instance.data as any;
        this._dailyProgress = save.dailyProgress || {};
        this._achievementProgress = save.achievementProgress || {};
        this._lastResetDay = save.lastResetDay || 0;
    }

    private _saveProgress(): void {
        const save = SaveManager.instance.data as any;
        save.dailyProgress = this._dailyProgress;
        save.achievementProgress = this._achievementProgress;
        save.lastResetDay = this._lastResetDay;
        SaveManager.instance.save();
    }

    /**
     * 每日任务每天0点重置
     */
    public _checkDailyReset(): void {
        const today = this._getDayNumber();
        if (this._lastResetDay !== today) {
            // 重置每日任务进度
            this._dailyProgress = {};
            for (const task of this._dailyTasks) {
                this._dailyProgress[task.id] = { progress: 0, completed: false, claimed: false };
            }
            this._lastResetDay = today;
            this._saveProgress();
            EventBus.instance.emit('daily_tasks_reset');
        }
    }

    private _getDayNumber(): number {
        return Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    }

    private _registerListeners(): void {
        const bus = EventBus.instance;
        bus.on(GameEvent.ENEMY_KILLED, this._onEnemyKilled, this);
        bus.on(GameEvent.LEVEL_COMPLETE, this._onLevelComplete, this);
        bus.on(GameEvent.PLAYER_LEVEL_UP, this._onPlayerLevelUp, this);
    }

    private _onEnemyKilled(): void {
        this._addProgress('kill_count', 1);
        this._addProgress('total_kills', 1);

        // 累计总击杀写入存档
        SaveManager.instance.data.totalKills++;
        SaveManager.instance.markDirty();
    }

    private _onLevelComplete(): void {
        this._addProgress('level_clear', 1);
    }

    private _onPlayerLevelUp(): void {
        this._addProgress('level_up', 1);
    }

    /**
     * 增加任务进度
     */
    private _addProgress(type: TaskType, amount: number): void {
        // 每日任务
        for (const task of this._dailyTasks) {
            if (task.type !== type) continue;
            const p = this._getOrCreateProgress(this._dailyProgress, task.id);
            if (p.completed) continue;
            p.progress += amount;
            if (p.progress >= task.target) {
                p.progress = task.target;
                p.completed = true;
                EventBus.instance.emit('task_completed', { task, isDaily: true });
            }
        }

        // 成就（用累计数据）
        if (type === 'total_kills') {
            for (const ach of this._achievements) {
                if (ach.type !== 'total_kills') continue;
                const p = this._getOrCreateProgress(this._achievementProgress, ach.id);
                if (p.completed) continue;
                p.progress = SaveManager.instance.data.totalKills;
                if (p.progress >= ach.target) {
                    p.progress = ach.target;
                    p.completed = true;
                    EventBus.instance.emit('task_completed', { task: ach, isDaily: false });
                }
            }
        }

        this._saveProgress();
    }

    private _getOrCreateProgress(map: Record<string, TaskProgress>, id: string): TaskProgress {
        if (!map[id]) {
            map[id] = { progress: 0, completed: false, claimed: false };
        }
        return map[id];
    }

    /**
     * 领取奖励
     */
    public claimReward(taskId: string, isDaily: boolean): boolean {
        const config = isDaily
            ? this._dailyTasks.find(t => t.id === taskId)
            : this._achievements.find(a => a.id === taskId);
        if (!config) return false;

        const map = isDaily ? this._dailyProgress : this._achievementProgress;
        const p = this._getOrCreateProgress(map, taskId);
        if (!p.completed || p.claimed) return false;

        // 发放奖励
        if (config.rewardType === 'gold') {
            SaveManager.instance.addGold(config.rewardAmount);
        } else {
            SaveManager.instance.addDiamond(config.rewardAmount);
        }
        p.claimed = true;
        this._saveProgress();

        EventBus.instance.emit('reward_claimed', { task: config });
        return true;
    }

    public getDailyTasks(): { config: TaskConfig; progress: TaskProgress }[] {
        return this._dailyTasks.map(t => ({
            config: t,
            progress: this._getOrCreateProgress(this._dailyProgress, t.id),
        }));
    }

    public getAchievements(): { config: TaskConfig; progress: TaskProgress }[] {
        return this._achievements.map(a => ({
            config: a,
            progress: this._getOrCreateProgress(this._achievementProgress, a.id),
        }));
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
    }
}
