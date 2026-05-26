/**
 * CharacterSelect - 角色解锁与选择
 * 台账编号: M08-T01
 */

import { _decorator, Component, Node, Label, Button, Sprite, Color, instantiate, Prefab } from 'cc';
import { ConfigManager, PlayerConfig } from '../core/ConfigManager';
import { SaveManager } from '../core/SaveManager';
import { EventBus } from '../core/EventBus';

const { ccclass, property } = _decorator;

@ccclass('CharacterSelect')
export class CharacterSelect extends Component {
    @property(Node)
    public content: Node | null = null;

    @property(Prefab)
    public characterItemPrefab: Prefab | null = null;

    @property(Label)
    public selectedNameLabel: Label | null = null;
    @property(Label)
    public selectedDescLabel: Label | null = null;
    @property(Label)
    public hpLabel: Label | null = null;
    @property(Label)
    public atkLabel: Label | null = null;
    @property(Label)
    public speedLabel: Label | null = null;

    @property(Button)
    public confirmBtn: Button | null = null;
    @property(Button)
    public unlockBtn: Button | null = null;
    @property(Button)
    public closeBtn: Button | null = null;

    @property
    public unlockCostDiamond: number = 200; // 解锁需要的钻石

    private _selectedId: string = 'warrior';
    private _items: Map<string, Node> = new Map();

    onEnable(): void {
        this._refresh();
        this._bindEvents();
        this._selectedId = SaveManager.instance.data.unlockedCharacters[0] || 'warrior';
        this._showCharacterDetail(this._selectedId);
    }

    private _bindEvents(): void {
        this.confirmBtn?.node.on(Node.EventType.TOUCH_END, this._onConfirm, this);
        this.unlockBtn?.node.on(Node.EventType.TOUCH_END, this._onUnlock, this);
        this.closeBtn?.node.on(Node.EventType.TOUCH_END, this._onClose, this);
    }

    private _refresh(): void {
        if (!this.content) return;
        this.content.removeAllChildren();
        this._items.clear();

        const all = ConfigManager.instance.getAllPlayers();
        const save = SaveManager.instance.data;

        for (const cfg of all) {
            const node = this._createItem(cfg, save.unlockedCharacters.includes(cfg.id));
            this.content.addChild(node);
            this._items.set(cfg.id, node);
        }
    }

    private _createItem(cfg: PlayerConfig, unlocked: boolean): Node {
        if (!this.characterItemPrefab) return new Node();
        const node = instantiate(this.characterItemPrefab);

        const nameLabel = node.getChildByName('Name')?.getComponent(Label);
        if (nameLabel) nameLabel.string = cfg.name;

        const lockIcon = node.getChildByName('Lock');
        if (lockIcon) lockIcon.active = !unlocked;

        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.color = unlocked ? new Color(255, 255, 255, 255) : new Color(100, 100, 100, 255);
        }

        node.on(Node.EventType.TOUCH_END, () => this._showCharacterDetail(cfg.id), this);

        return node;
    }

    private _showCharacterDetail(id: string): void {
        this._selectedId = id;
        const cfg = ConfigManager.instance.getPlayer(id);
        if (!cfg) return;

        if (this.selectedNameLabel) this.selectedNameLabel.string = cfg.name;
        if (this.selectedDescLabel) this.selectedDescLabel.string = cfg.description || '';
        if (this.hpLabel) this.hpLabel.string = `HP: ${cfg.baseHp}`;
        if (this.atkLabel) this.atkLabel.string = `ATK: ${cfg.baseAtk}`;
        if (this.speedLabel) this.speedLabel.string = `SPD: ${cfg.baseSpeed}`;

        // 根据解锁状态显示按钮
        const isUnlocked = SaveManager.instance.data.unlockedCharacters.includes(id);
        if (this.confirmBtn?.node) this.confirmBtn.node.active = isUnlocked;
        if (this.unlockBtn?.node) this.unlockBtn.node.active = !isUnlocked;
    }

    private _onConfirm(): void {
        // 把选中角色放到第一位（作为当前选用角色）
        const list = SaveManager.instance.data.unlockedCharacters;
        const idx = list.indexOf(this._selectedId);
        if (idx > 0) {
            list.splice(idx, 1);
            list.unshift(this._selectedId);
            SaveManager.instance.markDirty();
            SaveManager.instance.save();
        }
        EventBus.instance.emit('character_selected', this._selectedId);
        this.node.active = false;
    }

    private _onUnlock(): void {
        const data = SaveManager.instance.data;
        if (data.diamond < this.unlockCostDiamond) {
            console.warn('[CharacterSelect] Not enough diamond');
            EventBus.instance.emit('toast', '钻石不足！');
            return;
        }
        data.diamond -= this.unlockCostDiamond;
        SaveManager.instance.unlockCharacter(this._selectedId);
        SaveManager.instance.save();
        this._refresh();
        this._showCharacterDetail(this._selectedId);
        EventBus.instance.emit('toast', '解锁成功！');
    }

    private _onClose(): void {
        this.node.active = false;
    }
}
