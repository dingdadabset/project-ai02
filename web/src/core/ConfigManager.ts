/**
 * ConfigManager - 配置管理（运行时 fetch 加载）
 */

export interface EnemyConfig {
    id: string; name: string;
    type: 'melee' | 'ranged' | 'elite' | 'boss';
    hp: number; atk: number; speed: number; exp: number;
    dropTable: string[]; sprite: string; size: number;
    color?: number;
}

export interface WeaponLevelConfig {
    level: number; damage: number; count: number; speed: number; range?: number;
}

export interface WeaponConfig {
    id: string; name: string; description: string;
    type: string; baseDamage: number; attackSpeed: number; range: number;
    levels: WeaponLevelConfig[];
}

export interface SkillEffect {
    attribute: string; value: number; type: 'flat' | 'percent';
}

export interface SkillConfig {
    id: string; name: string; description: string; icon: string;
    type: 'weapon_new' | 'weapon_upgrade' | 'passive' | 'active';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    weight: number; maxLevel: number; effects: SkillEffect[];
}

export interface WaveConfig {
    time: number; enemy: string; rate: number; duration: number; count?: number;
}

export interface LevelConfig {
    id: string; chapter: number; stage: number;
    duration: number; map: string; waves: WaveConfig[];
    rewards: { gold: [number, number]; exp: number; firstClear?: { type: string; amount: number } };
}

export interface PlayerConfig {
    id: string; name: string; description?: string;
    baseHp: number; baseAtk: number; baseSpeed: number;
    baseCritRate: number; baseCritDamage: number; baseDef: number;
    basePickupRange: number; startWeapon: string; sprite?: string;
}

export class ConfigManager {
    private static _instance: ConfigManager | null = null;

    private _enemies = new Map<string, EnemyConfig>();
    private _weapons = new Map<string, WeaponConfig>();
    private _skills = new Map<string, SkillConfig>();
    private _levels = new Map<string, LevelConfig>();
    private _players = new Map<string, PlayerConfig>();
    private _isLoaded: boolean = false;

    public static get instance(): ConfigManager {
        if (!ConfigManager._instance) ConfigManager._instance = new ConfigManager();
        return ConfigManager._instance;
    }

    public get isLoaded(): boolean { return this._isLoaded; }

    /** 异步加载所有配置 */
    public async load(): Promise<void> {
        const base = './src/configs/';
        const [enemy, weapon, skill, level, player] = await Promise.all([
            fetch(base + 'enemy_config.json').then(r => r.json()),
            fetch(base + 'weapon_config.json').then(r => r.json()),
            fetch(base + 'skill_config.json').then(r => r.json()),
            fetch(base + 'level_config.json').then(r => r.json()),
            fetch(base + 'player_config.json').then(r => r.json()),
        ]);
        (enemy.enemies as EnemyConfig[]).forEach(e => this._enemies.set(e.id, e));
        (weapon.weapons as WeaponConfig[]).forEach(w => this._weapons.set(w.id, w));
        (skill.skills as SkillConfig[]).forEach(s => this._skills.set(s.id, s));
        (level.levels as LevelConfig[]).forEach(l => this._levels.set(l.id, l));
        (player.players as PlayerConfig[]).forEach(p => this._players.set(p.id, p));
        this._isLoaded = true;
        console.log(`[ConfigManager] Loaded: ${this._enemies.size} enemies, ${this._weapons.size} weapons, ${this._skills.size} skills, ${this._levels.size} levels, ${this._players.size} players.`);
    }

    public getEnemy(id: string) { return this._enemies.get(id); }
    public getWeapon(id: string) { return this._weapons.get(id); }
    public getSkill(id: string) { return this._skills.get(id); }
    public getLevel(id: string) { return this._levels.get(id); }
    public getLevelByChapterStage(c: number, s: number) {
        return Array.from(this._levels.values()).find(l => l.chapter === c && l.stage === s);
    }
    public getPlayer(id: string) { return this._players.get(id); }
    public getAllPlayers() { return Array.from(this._players.values()); }
    public getAllSkills() { return Array.from(this._skills.values()); }
    public getAllEnemies() { return Array.from(this._enemies.values()); }
}
