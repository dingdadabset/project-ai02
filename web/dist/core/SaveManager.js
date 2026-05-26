/**
 * SaveManager - 本地存档
 */
const SAVE_KEY = 'grass_storm_save_v1';
const DEFAULT = {
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
    constructor() {
        this._data = { ...DEFAULT };
    }
    static get instance() {
        if (!SaveManager._instance)
            SaveManager._instance = new SaveManager();
        return SaveManager._instance;
    }
    get data() {
        return this._data;
    }
    load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (raw) {
                this._data = { ...DEFAULT, ...JSON.parse(raw) };
            }
        }
        catch (e) {
            console.warn('[SaveManager] Load failed:', e);
            this._data = { ...DEFAULT };
        }
    }
    save() {
        this._data.lastSaveTime = Date.now();
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(this._data));
        }
        catch (e) {
            console.warn('[SaveManager] Save failed:', e);
        }
    }
    addGold(n) { this._data.gold += n; this.save(); }
    addDiamond(n) { this._data.diamond += n; this.save(); }
    reset() { this._data = { ...DEFAULT }; this.save(); }
}
SaveManager._instance = null;
//# sourceMappingURL=SaveManager.js.map