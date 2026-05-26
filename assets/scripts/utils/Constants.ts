/**
 * Constants - 全局常量定义
 */

/** 碰撞分组 */
export enum CollisionGroup {
    DEFAULT = 0,
    PLAYER = 1 << 0,
    ENEMY = 1 << 1,
    PLAYER_BULLET = 1 << 2,
    ENEMY_BULLET = 1 << 3,
    PICKUP = 1 << 4,
}

/** 层级（渲染顺序） */
export enum ZOrder {
    MAP_BG = 0,
    DROP_ITEM = 10,
    ENEMY = 20,
    PLAYER = 30,
    PROJECTILE = 40,
    EFFECT = 50,
    UI_WORLD = 60, // 血条等世界空间UI
}

/** 标签 */
export enum Tags {
    PLAYER = 'player',
    ENEMY = 'enemy',
    BOSS = 'boss',
    PROJECTILE_PLAYER = 'proj_player',
    PROJECTILE_ENEMY = 'proj_enemy',
    DROP_EXP = 'drop_exp',
    DROP_GOLD = 'drop_gold',
    DROP_HP = 'drop_hp',
}

/** 场景名 */
export enum Scenes {
    LOADING = 'loading',
    HOME = 'home',
    BATTLE = 'battle',
}

/** 资源路径 */
export const AssetPaths = {
    CONFIGS: 'configs/',
    PREFABS: 'prefabs/',
    TEXTURES: 'textures/',
    AUDIO: 'audio/',
    ANIMATIONS: 'animations/',
} as const;

/** 对象池预设 */
export const PoolPresets = {
    ENEMY_SLIME: { name: 'slime_green', preloadCount: 100 },
    ENEMY_SKELETON: { name: 'skeleton', preloadCount: 80 },
    ENEMY_BAT: { name: 'bat', preloadCount: 60 },
    PROJECTILE_FIREBALL: { name: 'projectile_fireball', preloadCount: 50 },
    DROP_EXP: { name: 'drop_exp', preloadCount: 200 },
    DROP_GOLD: { name: 'drop_gold', preloadCount: 100 },
    DROP_HP: { name: 'drop_hp_potion', preloadCount: 30 },
    DAMAGE_NUMBER: { name: 'damage_number', preloadCount: 50 },
} as const;

/** 游戏平衡常量 */
export const Balance = {
    /** 基础经验需求 */
    BASE_EXP_REQUIRED: 10,
    /** 每级经验增量 */
    EXP_PER_LEVEL: 5,
    /** 无敌帧时长（秒） */
    INVINCIBLE_DURATION: 0.5,
    /** 接触伤害间隔（秒） */
    CONTACT_DAMAGE_INTERVAL: 0.5,
    /** 拾取判定半径 */
    PICKUP_RADIUS: 20,
    /** 升级选项数量 */
    SKILL_OPTIONS_COUNT: 3,
    /** 最大武器槽 */
    MAX_WEAPONS: 6,
    /** 最大被动技能 */
    MAX_PASSIVES: 6,
} as const;
