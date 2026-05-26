/**
 * ConfigManager - 配置管理器
 * 统一管理所有 JSON 配置表的加载和访问
 */

import { JsonAsset, resources } from 'cc';

export interface EnemyConfig {
    id: string;
    name: string;
    type: 'melee' | 'ranged' | 'elite' | 'boss';
    hp: number;
    atk: number;
    speed: number;
    exp: number;
    dropTable: string[];
    sprite: string;
    size: number;
}

export interface WeaponLevelConfig {
    level: number;
    damage: number;
    count: number;
    speed: number;
    range?: number;
}

export interface WeaponConfig {
    id: string;
    name: string;
    description: string;
    type: 'melee_aoe' | 'ranged_single' | 'ranged_chain' | 'aoe_burst';
    baseDamage: number;
    attackSpeed: number;
    range: number;
    levels: WeaponLevelConfig[];
}

export interface SkillConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: 'weapon_new' | 'weapon_upgrade' | 'passive' | 'active';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    weight: number;
    maxLevel: number;
    effects: { attribute: string; value: number; type: 'flat' | 'percent' }[];
}

export interface WaveConfig {
    time: number;
    enemy: string;
    rate: number;
    duration: number;
    count?: number;
}

export interface LevelConfig {
    id: string;
    chapter: number;
    stage: number;
    duration: number;
    map: string;
    waves: WaveConfig[];
    rewards: {
        gold: [number, number];
        exp: number;
        firstClear?: { type: string; amount: number };
    };
}

export interface PlayerConfig {
    id: string;
    name: string;
    baseHp: number;
    baseAtk: number;
    baseSpeed: number;
    baseCritRate: number;
    baseCritDamage: number;
    baseDef: number;
    basePickupRange: number;
    startWeapon: string;
}

export class ConfigManager {
    private static _instance: ConfigManager | null = null;

    private _enemies: Map<string, EnemyConfig> = new Map();
    private _weapons: Map<string, WeaponConfig> = new Map();
    private _skills: Map<string, SkillConfig> = new Map();
    private _levels: Map<string, LevelConfig> = new Map();
    private _players: Map<string, PlayerConfig> = new Map();

    private _loaded: boolean = false;

    public static get instance(): ConfigManager {
        if (!ConfigManager._instance) {
            ConfigManager._instance = new ConfigManager();
        }
        return ConfigManager._instance;
    }

    public get isLoaded(): boolean {
        return this._loaded;
    }

    /**
     * 加载所有配置表
     */
    public async loadAll(): Promise<void> {
        await Promise.all([
            this._loadConfig('configs/enemy_config', this._parseEnemies.bind(this)),
            this._loadConfig('configs/weapon_config', this._parseWeapons.bind(this)),
            this._loadConfig('configs/skill_config', this._parseSkills.bind(this)),
            this._loadConfig('configs/level_config', this._parseLevels.bind(this)),
            this._loadConfig('configs/player_config', this._parsePlayers.bind(this)),
        ]);
        this._loaded = true;
        console.log('[ConfigManager] All configs loaded.');
    }

    private _loadConfig(path: string, parser: (data: any) => void): Promise<void> {
        return new Promise((resolve, reject) => {
            resources.load(path, JsonAsset, (err, asset) => {
                if (err) {
                    console.error(`[ConfigManager] Failed to load: ${path}`, err);
                    reject(err);
                    return;
                }
                parser(asset.json);
                resolve();
            });
        });
    }

    private _parseEnemies(data: any): void {
        if (data.enemies) {
            data.enemies.forEach((e: EnemyConfig) => this._enemies.set(e.id, e));
        }
    }

    private _parseWeapons(data: any): void {
        if (data.weapons) {
            data.weapons.forEach((w: WeaponConfig) => this._weapons.set(w.id, w));
        }
    }

    private _parseSkills(data: any): void {
        if (data.skills) {
            data.skills.forEach((s: SkillConfig) => this._skills.set(s.id, s));
        }
    }

    private _parseLevels(data: any): void {
        if (data.levels) {
            data.levels.forEach((l: LevelConfig) => this._levels.set(l.id, l));
        }
    }

    private _parsePlayers(data: any): void {
        if (data.players) {
            data.players.forEach((p: PlayerConfig) => this._players.set(p.id, p));
        }
    }

    // ---- 查询接口 ----

    public getEnemy(id: string): EnemyConfig | undefined {
        return this._enemies.get(id);
    }

    public getAllEnemies(): EnemyConfig[] {
        return Array.from(this._enemies.values());
    }

    public getWeapon(id: string): WeaponConfig | undefined {
        return this._weapons.get(id);
    }

    public getAllWeapons(): WeaponConfig[] {
        return Array.from(this._weapons.values());
    }

    public getSkill(id: string): SkillConfig | undefined {
        return this._skills.get(id);
    }

    public getAllSkills(): SkillConfig[] {
        return Array.from(this._skills.values());
    }

    public getSkillsByType(type: string): SkillConfig[] {
        return Array.from(this._skills.values()).filter(s => s.type === type);
    }

    public getLevel(id: string): LevelConfig | undefined {
        return this._levels.get(id);
    }

    public getLevelByChapterStage(chapter: number, stage: number): LevelConfig | undefined {
        return Array.from(this._levels.values()).find(
            l => l.chapter === chapter && l.stage === stage
        );
    }

    public getPlayer(id: string): PlayerConfig | undefined {
        return this._players.get(id);
    }

    public getAllPlayers(): PlayerConfig[] {
        return Array.from(this._players.values());
    }
}
