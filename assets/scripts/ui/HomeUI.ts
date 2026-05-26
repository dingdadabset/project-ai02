/**
 * HomeUI - 主界面
 * 台账编号: M07-T05
 */

import { _decorator, Component, Node, Label, Button, Sprite, SpriteFrame } from 'cc';
import { SaveManager } from '../core/SaveManager';
import { ConfigManager } from '../core/ConfigManager';
import { SceneLoader } from '../core/SceneLoader';
import { EventBus, GameEvent } from '../core/EventBus';

const { ccclass, property } = _decorator;

@ccclass('HomeUI')
export class HomeUI extends Component {
    @property(Label)
    public goldLabel: Label | null = null;
    @property(Label)
    public diamondLabel: Label | null = null;
    @property(Label)
    public playerNameLabel: Label | null = null;
    @property(Label)
    public maxStageLabel: Label | null = null;

    @property(Sprite)
    public characterSprite: Sprite | null = null;
    @property(Label)
    public characterNameLabel: Label | null = null;

    // 入口按钮
    @property(Button)
    public startBattleBtn: Button | null = null;     // 开始战斗（继续上次进度）
    @property(Button)
    public levelSelectBtn: Button | null = null;
    @property(Button)
    public characterBtn: Button | null = null;
    @property(Button)
    public talentBtn: Button | null = null;
    @property(Button)
    public equipmentBtn: Button | null = null;
    @property(Button)
    public taskBtn: Button | null = null;
    @property(Button)
    public shopBtn: Button | null = null;
    @property(Button)
    public settingsBtn: Button | null = null;

    // 各子页面节点
    @property(Node)
    public levelSelectPanel: Node | null = null;
    @property(Node)
    public characterPanel: Node | null = null;
    @property(Node)
    public talentPanel: Node | null = null;
    @property(Node)
    public equipmentPanel: Node | null = null;
    @property(Node)
    public taskPanel: Node | null = null;
    @property(Node)
    public shopPanel: Node | null = null;

    start(): void {
        this._bindEvents();
        this._refreshDisplay();

        // 监听数据变化
        EventBus.instance.on(GameEvent.GOLD_GAINED, this._refreshDisplay, this);
        EventBus.instance.on('save_changed', this._refreshDisplay, this);
    }

    private _bindEvents(): void {
        this.startBattleBtn?.node.on(Node.EventType.TOUCH_END, this._onStartBattle, this);
        this.levelSelectBtn?.node.on(Node.EventType.TOUCH_END, () => this._togglePanel(this.levelSelectPanel), this);
        this.characterBtn?.node.on(Node.EventType.TOUCH_END, () => this._togglePanel(this.characterPanel), this);
        this.talentBtn?.node.on(Node.EventType.TOUCH_END, () => this._togglePanel(this.talentPanel), this);
        this.equipmentBtn?.node.on(Node.EventType.TOUCH_END, () => this._togglePanel(this.equipmentPanel), this);
        this.taskBtn?.node.on(Node.EventType.TOUCH_END, () => this._togglePanel(this.taskPanel), this);
        this.shopBtn?.node.on(Node.EventType.TOUCH_END, () => this._togglePanel(this.shopPanel), this);
    }

    private _refreshDisplay(): void {
        const data = SaveManager.instance.data;
        if (this.goldLabel) this.goldLabel.string = `${data.gold}`;
        if (this.diamondLabel) this.diamondLabel.string = `${data.diamond}`;
        if (this.playerNameLabel) this.playerNameLabel.string = data.playerName;
        if (this.maxStageLabel) {
            this.maxStageLabel.string = `第 ${data.maxChapter}-${data.maxStage} 关`;
        }

        // 当前选择的角色信息
        const playerId = data.unlockedCharacters[0] || 'warrior';
        const playerCfg = ConfigManager.instance?.getPlayer(playerId);
        if (playerCfg && this.characterNameLabel) {
            this.characterNameLabel.string = playerCfg.name;
        }
    }

    private _onStartBattle(): void {
        // 进入上次未通关的关卡
        const data = SaveManager.instance.data;
        SceneLoader.instance?.enterBattle(data.maxChapter, data.maxStage);
    }

    private _togglePanel(panel: Node | null): void {
        if (!panel) return;
        // 关闭所有其他面板
        const all = [
            this.levelSelectPanel, this.characterPanel, this.talentPanel,
            this.equipmentPanel, this.taskPanel, this.shopPanel,
        ];
        for (const p of all) {
            if (p && p !== panel) p.active = false;
        }
        panel.active = !panel.active;
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
    }
}
