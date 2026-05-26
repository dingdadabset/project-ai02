/**
 * SkillSystem - 技能/升级选择系统
 * 管理升级时的技能选项生成、技能效果应用
 */

import { _decorator, Component } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { ConfigManager, SkillConfig } from '../core/ConfigManager';
import { Player } from '../entities/Player';
import { GameManager, GameState } from '../core/GameManager';

const { ccclass, property } = _decorator;

export interface SkillInstance {
    config: SkillConfig;
    currentLevel: number;
}

export interface SkillOption {
    config: SkillConfig;
    nextLevel: number; // 如果是升级，显示下一级
}

@ccclass('SkillSystem')
export class SkillSystem extends Component {
    private static _instance: SkillSystem | null = null;

    // 玩家已获得的技能
    private _acquiredSkills: Map<string, SkillInstance> = new Map();
    // 当前可选项
    private _currentOptions: SkillOption[] = [];
    // 选项数量
    private _optionCount: number = 3;

    public static get instance(): SkillSystem {
        return SkillSystem._instance!;
    }

    public get acquiredSkills(): Map<string, SkillInstance> {
        return this._acquiredSkills;
    }

    public get currentOptions(): SkillOption[] {
        return this._currentOptions;
    }

    onLoad(): void {
        SkillSystem._instance = this;
    }

    start(): void {
        EventBus.instance.on(GameEvent.PLAYER_LEVEL_UP, this._onPlayerLevelUp, this);
    }

    /**
     * 玩家升级时触发：生成技能选项
     */
    private _onPlayerLevelUp(level: number): void {
        this._currentOptions = this._generateOptions();
        // GameManager 已将状态设为 LEVEL_UP
    }

    /**
     * 生成随机技能选项
     */
    private _generateOptions(): SkillOption[] {
        const allSkills = ConfigManager.instance.getAllSkills();
        const candidates: SkillOption[] = [];

        for (const config of allSkills) {
            const acquired = this._acquiredSkills.get(config.id);
            const currentLevel = acquired ? acquired.currentLevel : 0;

            // 排除已满级的技能
            if (currentLevel >= config.maxLevel) continue;

            candidates.push({
                config,
                nextLevel: currentLevel + 1,
            });
        }

        // 加权随机选择
        return this._weightedRandomPick(candidates, this._optionCount);
    }

    /**
     * 加权随机选择
     */
    private _weightedRandomPick(candidates: SkillOption[], count: number): SkillOption[] {
        if (candidates.length <= count) return [...candidates];

        const result: SkillOption[] = [];
        const pool = [...candidates];

        // 稀有度权重
        const rarityWeight: Record<string, number> = {
            common: 60,
            rare: 25,
            epic: 12,
            legendary: 3,
        };

        for (let i = 0; i < count && pool.length > 0; i++) {
            const totalWeight = pool.reduce(
                (sum, opt) => sum + (opt.config.weight || rarityWeight[opt.config.rarity] || 10),
                0
            );

            let rand = Math.random() * totalWeight;
            let picked = 0;

            for (let j = 0; j < pool.length; j++) {
                const w = pool[j].config.weight || rarityWeight[pool[j].config.rarity] || 10;
                rand -= w;
                if (rand <= 0) {
                    picked = j;
                    break;
                }
            }

            result.push(pool[picked]);
            pool.splice(picked, 1);
        }

        return result;
    }

    /**
     * 玩家选择技能
     */
    public selectSkill(index: number): void {
        if (index < 0 || index >= this._currentOptions.length) return;

        const option = this._currentOptions[index];
        this._applySkill(option);

        // 清空选项，恢复游戏
        this._currentOptions = [];
        EventBus.instance.emit(GameEvent.SKILL_SELECTED, option);
        GameManager.instance.changeState(GameState.PLAYING);
    }

    /**
     * 应用技能效果
     */
    private _applySkill(option: SkillOption): void {
        const { config, nextLevel } = option;

        // 更新已获得技能
        if (this._acquiredSkills.has(config.id)) {
            this._acquiredSkills.get(config.id)!.currentLevel = nextLevel;
        } else {
            this._acquiredSkills.set(config.id, { config, currentLevel: nextLevel });
        }

        // 应用效果
        const player = Player.instance;
        if (!player) return;

        for (const effect of config.effects) {
            if (effect.type === 'flat') {
                player.addStat(effect.attribute as any, effect.value);
            } else if (effect.type === 'percent') {
                player.addStatPercent(effect.attribute as any, effect.value);
            }
        }

        // 如果是新武器技能
        if (config.type === 'weapon_new') {
            EventBus.instance.emit(GameEvent.WEAPON_ACQUIRED, config.id);
        } else if (config.type === 'weapon_upgrade') {
            EventBus.instance.emit(GameEvent.WEAPON_UPGRADE, config.id, nextLevel);
        }
    }

    /**
     * 重置（新关卡时）
     */
    public reset(): void {
        this._acquiredSkills.clear();
        this._currentOptions = [];
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
        if (SkillSystem._instance === this) {
            SkillSystem._instance = null;
        }
    }
}
