/**
 * SaveManager - 本地存档
 */

const SAVE_KEY = 'grass_storm_save_v1';

export interface PlayerSaveData {
    playerId: string;
    playerName: string;
    maxChapter: number;
    maxStage: number;
    totalKills: number;
    gold: number;
    diamond: number;
    unlockedCharacters: string[];
    talents: { [key: string]: number };
    settings: {
        bgmVolume: number;
        sfxVolume: number;
        vibration: boolean;
    };
    lastSaveTime: number;
}

const DEFAULT: PlayerSaveData = {
    playerId: 'player_001',
    playerName: 'Player',
    maxChapter: 1,
    maxStage: 1,
    totalKills: 0,
    gold: 0,
    diamond: 0,
    unlockedCharacters: ['warrior'],
    talents: {},
    settings: { bgmVolume: 0.8, sfxVolume: 1.0, vibration: true },
    lastSaveTime: 0,
};

export class SaveManager {
    private static _instance: SaveManager | null = null;
    private _data: PlayerSaveData = { ...DEFAULT };

    public static get instance(): SaveManager {
        if (!SaveManager._instance) SaveManager._instance = new SaveManager();
        return SaveManager._instance;
    }

    public get data(): PlayerSaveData {
        return this._data;
    }

    public load(): void {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (raw) {
                this._data = { ...DEFAULT, ...JSON.parse(raw) };
            }
        } catch (e) {
            console.warn('[SaveManager] Load failed:', e);
            this._data = { ...DEFAULT };
        }
    }

    public save(): void {
        this._data.lastSaveTime = Date.now();
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(this._data));
        } catch (e) {
            console.warn('[SaveManager] Save failed:', e);
        }
    }

    public addGold(n: number) { this._data.gold += n; this.save(); }
    public addDiamond(n: number) { this._data.diamond += n; this.save(); }
    public reset() { this._data = { ...DEFAULT }; this.save(); }
}
