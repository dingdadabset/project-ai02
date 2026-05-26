/**
 * TalentSystem - 天赋树系统
 * 台账编号: M08-T02
 * 
 * 永久属性提升，消耗金币升级，每局开始时应用到 Player
 */

import { _decorator, Component, JsonAsset, resources } from 'cc';
import { SaveManager } from '../core/SaveManager';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';

const { ccclass } = _decorator;

export interface TalentEffect {
    attribute: string;
    valuePerLevel: number;
    type: 'flat' | 'percent';
}

export interface TalentConfig {
    id: string;
    name: string;
    description: string;
    category: 'attack' | 'defense' | 'support';
    icon: string;
    maxLevel: number;
    costFormula: string;
    effects: TalentEffect[];
}

@ccclass('TalentSystem')
export class TalentSystem extends Component {
    private static _instance: TalentSystem | null = null;

    private _talents: Map<string, TalentConfig> = new Map();
    private _isLoaded: boolean = false;

    public static get instance(): TalentSystem {
        if (!TalentSystem._instance) {
            TalentSystem._instance = new TalentSystem();
        }
        return TalentSystem._instance;
    }

    onLoad(): void {
        if (TalentSystem._instance && TalentSystem._instance !== this) {
            this.node.destroy();
            return;
        }
        TalentSystem._instance = this;
    }

    /**
     * 加载天赋配置
     */
    public async load(): Promise<void> {
        return new Promise((resolve) => {
            resources.load('configs/talent_config', JsonAsset, (err, asset) => {
                if (err) {
                    console.error('[TalentSystem] Failed to load:', err);
                    resolve();
                    return;
                }
                const data = asset.json as { talents: TalentConfig[] };
                if (data.talents) {
                    data.talents.forEach(t => this._talents.set(t.id, t));
                }
                this._isLoaded = true;
                console.log(`[TalentSystem] Loaded ${this._talents.size} talents.`);
                resolve();
            });
        });
    }

    public getAll(): TalentConfig[] {
        return Array.from(this._talents.values());
    }

    public getByCategory(category: string): TalentConfig[] {
        return this.getAll().filter(t => t.category === category);
    }

    public get(id: string): TalentConfig | undefined {
        return this._talents.get(id);
    }

    /**
     * 获取当前天赋等级
     */
    public getLevel(id: string): number {
        return SaveManager.instance.data.talents[id] || 0;
    }

    /**
     * 获取升级所需金币
     */
    public getUpgradeCost(id: string): number {
        const config = this._talents.get(id);
        if (!config) return 0;
        const currentLevel = this.getLevel(id);
        if (currentLevel >= config.maxLevel) return 0;
        // 解析公式: "100 * level" → 100 * (currentLevel+1)
        const nextLevel = currentLevel + 1;
        try {
            // 简单替换 level 即可（避免 eval）
            const formula = config.costFormula.replace(/level/g, nextLevel.toString());
            return Math.floor(this._evalSimple(formula));
        } catch {
            return 100 * nextLevel;
        }
    }

    /**
     * 简单四则运算解析（避免使用 eval）
     */
    private _evalSimple(expr: string): number {
        // 仅支持 + - * / 的简单表达式
        const tokens = expr.replace(/\s/g, '').match(/(\d+\.?\d*)|([+\-*/])/g);
        if (!tokens) return 0;

        let result = parseFloat(tokens[0]);
        for (let i = 1; i < tokens.length; i += 2) {
            const op = tokens[i];
            const val = parseFloat(tokens[i + 1]);
            if (op === '+') result += val;
            else if (op === '-') result -= val;
            else if (op === '*') result *= val;
            else if (op === '/') result /= val;
        }
        return result;
    }

    /**
     * 升级天赋
     * @returns 是否成功
     */
    public upgradeTalent(id: string): boolean {
        const config = this._talents.get(id);
        if (!config) return false;

        const currentLevel = this.getLevel(id);
        if (currentLevel >= config.maxLevel) {
            EventBus.instance.emit('toast', '天赋已满级！');
            return false;
        }

        const cost = this.getUpgradeCost(id);
        const data = SaveManager.instance.data;
        if (data.gold < cost) {
            EventBus.instance.emit('toast', '金币不足！');
            return false;
        }

        // 扣除金币 + 升级
        data.gold -= cost;
        SaveManager.instance.setTalent(id, currentLevel + 1);
        SaveManager.instance.save();

        EventBus.instance.emit('talent_upgraded', { id, level: currentLevel + 1 });
        return true;
    }

    /**
     * 在战斗开始时把所有天赋加成应用到 Player
     */
    public applyToPlayer(): void {
        const player = Player.instance;
        if (!player) return;

        const data = SaveManager.instance.data;
        for (const [id, level] of Object.entries(data.talents)) {
            const config = this._talents.get(id);
            if (!config || level <= 0) continue;

            for (const effect of config.effects) {
                const value = effect.valuePerLevel * level;
                if (effect.type === 'flat') {
                    player.addStat(effect.attribute as any, value);
                } else {
                    player.addStatPercent(effect.attribute as any, value);
                }
            }
        }
        console.log('[TalentSystem] Talents applied to player.');
    }
}
