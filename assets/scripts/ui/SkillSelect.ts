/**
 * SkillSelect - 技能选择面板
 * 升级时弹出，展示3个技能选项供玩家选择
 */

import { _decorator, Component, Node, Label, Sprite, Button, SpriteFrame } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { SkillSystem, SkillOption } from '../systems/SkillSystem';
import { GameManager, GameState } from '../core/GameManager';

const { ccclass, property } = _decorator;

@ccclass('SkillSelect')
export class SkillSelect extends Component {
    @property(Node)
    public panel: Node | null = null; // 整个面板

    @property([Node])
    public optionNodes: Node[] = []; // 3个选项节点

    @property(Label)
    public titleLabel: Label | null = null;

    private _isShowing: boolean = false;

    start(): void {
        EventBus.instance.on(GameEvent.PLAYER_LEVEL_UP, this._show, this);
        EventBus.instance.on(GameEvent.SKILL_SELECTED, this._hide, this);
        this._hide();
    }

    /**
     * 显示技能选择面板
     */
    private _show(level: number): void {
        if (!this.panel) return;

        this._isShowing = true;
        this.panel.active = true;

        if (this.titleLabel) {
            this.titleLabel.string = `等级提升！Lv.${level}`;
        }

        // 获取技能选项
        const options = SkillSystem.instance?.currentOptions || [];
        this._updateOptions(options);
    }

    /**
     * 隐藏面板
     */
    private _hide(): void {
        if (this.panel) {
            this.panel.active = false;
        }
        this._isShowing = false;
    }

    /**
     * 更新选项显示
     */
    private _updateOptions(options: SkillOption[]): void {
        for (let i = 0; i < this.optionNodes.length; i++) {
            const optNode = this.optionNodes[i];
            if (!optNode) continue;

            if (i < options.length) {
                optNode.active = true;
                this._updateOptionUI(optNode, options[i], i);
            } else {
                optNode.active = false;
            }
        }
    }

    /**
     * 更新单个选项 UI
     */
    private _updateOptionUI(node: Node, option: SkillOption, index: number): void {
        // 名称
        const nameLabel = node.getChildByName('NameLabel')?.getComponent(Label);
        if (nameLabel) {
            nameLabel.string = option.config.name;
        }

        // 描述
        const descLabel = node.getChildByName('DescLabel')?.getComponent(Label);
        if (descLabel) {
            descLabel.string = option.config.description;
        }

        // 等级
        const levelLabel = node.getChildByName('LevelLabel')?.getComponent(Label);
        if (levelLabel) {
            levelLabel.string = `Lv.${option.nextLevel}`;
        }

        // 稀有度颜色
        const rarityColors: Record<string, string> = {
            common: '#FFFFFF',
            rare: '#4FC3F7',
            epic: '#CE93D8',
            legendary: '#FFD54F',
        };
        // 可以根据稀有度设置边框颜色等

        // 按钮事件
        const button = node.getComponent(Button);
        if (button) {
            node.off('click');
            node.on('click', () => this._onSelectSkill(index), this);
        }
    }

    /**
     * 选择技能
     */
    private _onSelectSkill(index: number): void {
        if (!this._isShowing) return;

        const skillSystem = SkillSystem.instance;
        if (skillSystem) {
            skillSystem.selectSkill(index);
        }
    }

    onDestroy(): void {
        EventBus.instance.offTarget(this);
    }
}
