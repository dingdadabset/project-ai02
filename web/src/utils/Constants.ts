/**
 * 全局常量
 */

export const SCENE_KEYS = {
    BOOT: 'BootScene',
    PRELOAD: 'PreloadScene',
    MENU: 'MenuScene',
    GAME: 'GameScene',
    HUD: 'HUDScene',
    SKILL_SELECT: 'SkillSelectScene',
    RESULT: 'ResultScene',
} as const;

export const Balance = {
    BASE_EXP_REQUIRED: 10,
    EXP_PER_LEVEL: 5,
    INVINCIBLE_DURATION: 500, // ms
    CONTACT_DAMAGE_INTERVAL: 500, // ms
    PICKUP_RADIUS: 24,
    SKILL_OPTIONS_COUNT: 3,
    MAX_WEAPONS: 6,
    MAP_WIDTH: 4000,
    MAP_HEIGHT: 4000,
};

// 敌人颜色（用于程序化绘制，无需素材）
export const ENEMY_COLORS: Record<string, number> = {
    slime_green: 0x66cc66,
    slime_blue: 0x4488ff,
    skeleton: 0xeeeecc,
    bat: 0x884488,
    archer_goblin: 0xaa6644,
    elite_wolf: 0x999999,
    boss_treant: 0x44aa44,
};

export const DROP_COLORS: Record<string, number> = {
    exp: 0x44ddff,
    gold: 0xffcc00,
    hp_potion: 0xff4488,
    magnet: 0xaa44ff,
};
