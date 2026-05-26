/**
 * EquipmentSystem - 装备系统
 * 台账编号: M08-T03
 */

import { _decorator, Component, JsonAsset, resources, Color } from 'cc';
import { SaveManager } from '../core/SaveManager';
import { Player } from '../entities/Player';
import { EventBus } from '../core/EventBus';

const { ccclass } = _decorator;

export type EquipSlot = 'weapon' | 'armor' | 'accessory';
export type EquipQuality = 'common' | 'rare' | 'epic' | 'legendary';

export interface EquipEffect {
    attribute: string;
    value: number;
    type: 'flat' | 'percent';
}

export interface EquipmentConfig {
    id: string;
    name: string;
    slot: EquipSlot;
    quality: EquipQuality;
    icon: string;
    effects: EquipEffect[];
    price: number;
}

const QUALITY_COLORS: Record<EquipQuality, Color> = {
    common: new Color(200, 200, 200, 255),
    rare: new Color(80, 180, 255, 255),
    epic: new Color(200, 80, 255, 255),
    legendary: new Color(255, 180, 50, 255),
};

@ccclass('EquipmentSystem')
export class EquipmentSystem extends Component {
    private static _instance: EquipmentSystem | null = null;

    private _equipments: Map<string, EquipmentConfig> = new Map();
    private _ownedItems: Set<string> = new Set(); // 已拥有的装备ID

    public static get instance(): EquipmentSystem {
        return EquipmentSystem._instance!;
    }

    onLoad(): void {
        if (EquipmentSystem._instance && EquipmentSystem._instance !== this) {
            this.node.destroy();
            return;
        }
        EquipmentSystem._instance = this;
    }

    public async load(): Promise<void> {
        return new Promise((resolve) => {
            resources.load('configs/equipment_config', JsonAsset, (err, asset) => {
                if (err) {
                    console.error('[EquipmentSystem] Failed to load:', err);
                    resolve();
                    return;
                }
                const data = asset.json as { equipments: EquipmentConfig[] };
                if (data.equipments) {
                    data.equipments.forEach(e => this._equipments.set(e.id, e));
                }

                // 加载已拥有装备列表（从存档扩展字段读取，兼容旧存档）
                const save = SaveManager.instance.data as any;
                if (save.ownedEquipments && Array.isArray(save.ownedEquipments)) {
                    this._ownedItems = new Set(save.ownedEquipments);
                }
                console.log(`[EquipmentSystem] Loaded ${this._equipments.size} equipments.`);
                resolve();
            });
        });
    }

    public getAll(): EquipmentConfig[] {
        return Array.from(this._equipments.values());
    }

    public getBySlot(slot: EquipSlot): EquipmentConfig[] {
        return this.getAll().filter(e => e.slot === slot);
    }

    public get(id: string): EquipmentConfig | undefined {
        return this._equipments.get(id);
    }

    public getQualityColor(quality: EquipQuality): Color {
        return QUALITY_COLORS[quality];
    }

    /**
     * 是否已拥有
     */
    public isOwned(id: string): boolean {
        return this._ownedItems.has(id);
    }

    /**
     * 购买装备
     */
    public buyItem(id: string): boolean {
        const config = this._equipments.get(id);
        if (!config) return false;
        if (this.isOwned(id)) {
            EventBus.instance.emit('toast', '已拥有该装备');
            return false;
        }

        const data = SaveManager.instance.data;
        if (data.gold < config.price) {
            EventBus.instance.emit('toast', '金币不足！');
            return false;
        }

        data.gold -= config.price;
        this._ownedItems.add(id);
        this._saveOwnedItems();

        EventBus.instance.emit('equipment_bought', id);
        return true;
    }

    private _saveOwnedItems(): void {
        const save = SaveManager.instance.data as any;
        save.ownedEquipments = Array.from(this._ownedItems);
        SaveManager.instance.save();
    }

    /**
     * 装备到指定槽位
     */
    public equip(id: string): boolean {
        const config = this._equipments.get(id);
        if (!config) return false;
        if (!this.isOwned(id)) {
            EventBus.instance.emit('toast', '尚未拥有该装备');
            return false;
        }

        const save = SaveManager.instance.data;
        if (config.slot === 'weapon') save.equippedWeapon = id;
        else if (config.slot === 'armor') save.equippedArmor = id;
        else if (config.slot === 'accessory') save.equippedAccessory = id;

        SaveManager.instance.save();
        EventBus.instance.emit('equipment_equipped', { id, slot: config.slot });
        return true;
    }

    /**
     * 卸下装备
     */
    public unequip(slot: EquipSlot): void {
        const save = SaveManager.instance.data;
        if (slot === 'weapon') save.equippedWeapon = '';
        else if (slot === 'armor') save.equippedArmor = '';
        else if (slot === 'accessory') save.equippedAccessory = '';

        SaveManager.instance.save();
        EventBus.instance.emit('equipment_unequipped', slot);
    }

    /**
     * 获取当前装备的所有属性加成
     */
    public getEquippedStats(): { [key: string]: number } {
        const save = SaveManager.instance.data;
        const ids = [save.equippedWeapon, save.equippedArmor, save.equippedAccessory];
        const stats: { [key: string]: number } = {};

        for (const id of ids) {
            if (!id) continue;
            const cfg = this._equipments.get(id);
            if (!cfg) continue;
            for (const effect of cfg.effects) {
                stats[effect.attribute] = (stats[effect.attribute] || 0) + effect.value;
            }
        }
        return stats;
    }

    /**
     * 战斗开始时应用装备加成到 Player
     */
    public applyToPlayer(): void {
        const player = Player.instance;
        if (!player) return;

        const save = SaveManager.instance.data;
        const ids = [save.equippedWeapon, save.equippedArmor, save.equippedAccessory];

        for (const id of ids) {
            if (!id) continue;
            const cfg = this._equipments.get(id);
            if (!cfg) continue;
            for (const effect of cfg.effects) {
                if (effect.type === 'flat') {
                    player.addStat(effect.attribute as any, effect.value);
                } else {
                    player.addStatPercent(effect.attribute as any, effect.value);
                }
            }
        }
        console.log('[EquipmentSystem] Equipment applied to player.');
    }
}
