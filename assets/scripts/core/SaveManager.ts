/**
 * SaveManager - 存档管理器
 * 使用 localStorage 持久化玩家进度数据
 */

import { sys } from 'cc';

const SAVE_KEY = 'grass_storm_save';

export interface PlayerSaveData {
    // 基础信息
    playerId: string;
    playerName: string;

    // 进度
    maxChapter: number;
    maxStage: number;
    totalKills: number;
    totalPlayTime: number;

    // 货币
    gold: number;
    diamond: number;

    // 解锁
    unlockedCharacters: string[];
    unlockedWeapons: string[];

    // 装备
    equippedWeapon: string;
    equippedArmor: string;
    equippedAccessory: string;

    // 天赋
    talents: { [key: string]: number };

    // 设置
    settings: {
        bgmVolume: number;
        sfxVolume: number;
        vibration: boolean;
        language: string;
    };

    // 时间戳
    lastSaveTime: number;
}

const DEFAULT_SAVE: PlayerSaveData = {
    playerId: 'player_001',
    playerName: 'Player',
    maxChapter: 1,
    maxStage: 1,
    totalKills: 0,
    totalPlayTime: 0,
    gold: 0,
    diamond: 0,
    unlockedCharacters: ['warrior'],
    unlockedWeapons: ['rotating_blade'],
    equippedWeapon: '',
    equippedArmor: '',
    equippedAccessory: '',
    talents: {},
    settings: {
        bgmVolume: 0.8,
        sfxVolume: 1.0,
        vibration: true,
        language: 'zh',
    },
    lastSaveTime: 0,
};

export class SaveManager {
    private static _instance: SaveManager | null = null;
    private _data: PlayerSaveData = { ...DEFAULT_SAVE };
    private _dirty: boolean = false;

    public static get instance(): SaveManager {
        if (!SaveManager._instance) {
            SaveManager._instance = new SaveManager();
        }
        return SaveManager._instance;
    }

    public get data(): PlayerSaveData {
        return this._data;
    }

    /**
     * 加载存档
     */
    public load(): boolean {
        const raw = sys.localStorage.getItem(SAVE_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                this._data = { ...DEFAULT_SAVE, ...parsed };
                console.log('[SaveManager] Save loaded successfully.');
                return true;
            } catch (e) {
                console.error('[SaveManager] Failed to parse save data:', e);
            }
        }
        this._data = { ...DEFAULT_SAVE };
        console.log('[SaveManager] No save found, using defaults.');
        return false;
    }

    /**
     * 保存存档
     */
    public save(): void {
        this._data.lastSaveTime = Date.now();
        const raw = JSON.stringify(this._data);
        sys.localStorage.setItem(SAVE_KEY, raw);
        this._dirty = false;
        console.log('[SaveManager] Save written.');
    }

    /**
     * 标记数据已变更（延迟保存用）
     */
    public markDirty(): void {
        this._dirty = true;
    }

    /**
     * 自动保存（如果有变更）
     */
    public autoSave(): void {
        if (this._dirty) {
            this.save();
        }
    }

    /**
     * 重置存档
     */
    public reset(): void {
        this._data = { ...DEFAULT_SAVE };
        this.save();
        console.log('[SaveManager] Save reset to defaults.');
    }

    /**
     * 删除存档
     */
    public deleteSave(): void {
        sys.localStorage.removeItem(SAVE_KEY);
        this._data = { ...DEFAULT_SAVE };
        console.log('[SaveManager] Save deleted.');
    }

    // ---- 便捷方法 ----

    public addGold(amount: number): void {
        this._data.gold += amount;
        this.markDirty();
    }

    public addDiamond(amount: number): void {
        this._data.diamond += amount;
        this.markDirty();
    }

    public unlockCharacter(id: string): void {
        if (!this._data.unlockedCharacters.includes(id)) {
            this._data.unlockedCharacters.push(id);
            this.markDirty();
        }
    }

    public unlockWeapon(id: string): void {
        if (!this._data.unlockedWeapons.includes(id)) {
            this._data.unlockedWeapons.push(id);
            this.markDirty();
        }
    }

    public updateProgress(chapter: number, stage: number): void {
        if (chapter > this._data.maxChapter ||
            (chapter === this._data.maxChapter && stage > this._data.maxStage)) {
            this._data.maxChapter = chapter;
            this._data.maxStage = stage;
            this.markDirty();
        }
    }

    public setTalent(id: string, level: number): void {
        this._data.talents[id] = level;
        this.markDirty();
    }
}
