/**
 * LevelSelect - 关卡选择与章节系统
 * 台账编号: M06-T04
 */

import { _decorator, Component, Node, Label, Button, Sprite, instantiate, Prefab, ScrollView, Color } from 'cc';
import { ConfigManager, LevelConfig } from '../core/ConfigManager';
import { SaveManager } from '../core/SaveManager';
import { SceneLoader } from '../core/SceneLoader';

const { ccclass, property } = _decorator;

@ccclass('LevelItem')
class LevelItem {
    public node: Node | null = null;
    public level: LevelConfig | null = null;
    public isLocked: boolean = false;
    public isCleared: boolean = false;
}

@ccclass('LevelSelect')
export class LevelSelect extends Component {
    @property(ScrollView)
    public scrollView: ScrollView | null = null;

    @property(Node)
    public content: Node | null = null;

    @property(Prefab)
    public levelItemPrefab: Prefab | null = null;

    @property(Label)
    public chapterLabel: Label | null = null;

    @property(Button)
    public prevChapterBtn: Button | null = null;

    @property(Button)
    public nextChapterBtn: Button | null = null;

    @property(Button)
    public closeBtn: Button | null = null;

    private _currentChapter: number = 1;
    private _maxChapter: number = 1;

    onEnable(): void {
        this._currentChapter = SaveManager.instance.data.maxChapter;
        this._refresh();
        this._bindEvents();
    }

    private _bindEvents(): void {
        this.prevChapterBtn?.node.on(Node.EventType.TOUCH_END, this._prevChapter, this);
        this.nextChapterBtn?.node.on(Node.EventType.TOUCH_END, this._nextChapter, this);
        this.closeBtn?.node.on(Node.EventType.TOUCH_END, this._close, this);
    }

    private _refresh(): void {
        if (!this.content) return;
        this.content.removeAllChildren();

        // 计算总章节数（从关卡配置中获取）
        const allLevels = this._getLevelsByChapter(this._currentChapter);
        this._maxChapter = this._calcMaxChapter();

        if (this.chapterLabel) {
            this.chapterLabel.string = `第 ${this._currentChapter} 章`;
        }

        const save = SaveManager.instance.data;

        for (const level of allLevels) {
            const node = this._createLevelItem(level, save);
            this.content.addChild(node);
        }
    }

    private _getLevelsByChapter(chapter: number): LevelConfig[] {
        // 通过遍历查找指定章节的所有关卡
        const result: LevelConfig[] = [];
        for (let stage = 1; stage <= 50; stage++) {
            const lvl = ConfigManager.instance.getLevelByChapterStage(chapter, stage);
            if (lvl) result.push(lvl);
            else break;
        }
        return result;
    }

    private _calcMaxChapter(): number {
        // 找到配置中最大的章节号
        let max = 1;
        for (let i = 1; i <= 20; i++) {
            const lvl = ConfigManager.instance.getLevelByChapterStage(i, 1);
            if (lvl) max = i;
            else break;
        }
        return max;
    }

    private _createLevelItem(level: LevelConfig, save: any): Node {
        if (!this.levelItemPrefab) return new Node();
        const node = instantiate(this.levelItemPrefab);

        // 检查锁定状态
        const isUnlocked = level.chapter < save.maxChapter ||
            (level.chapter === save.maxChapter && level.stage <= save.maxStage);
        const isCleared = level.chapter < save.maxChapter ||
            (level.chapter === save.maxChapter && level.stage < save.maxStage);

        // 设置标签
        const titleLabel = node.getChildByName('Title')?.getComponent(Label);
        if (titleLabel) titleLabel.string = `${level.chapter}-${level.stage}`;

        const descLabel = node.getChildByName('Desc')?.getComponent(Label);
        if (descLabel) {
            const dur = Math.floor(level.duration / 60);
            descLabel.string = `${dur}分钟生存`;
        }

        // 锁定/解锁视觉
        const lockIcon = node.getChildByName('Lock');
        if (lockIcon) lockIcon.active = !isUnlocked;

        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.color = isUnlocked ? new Color(255, 255, 255, 255) : new Color(120, 120, 120, 255);
        }

        // 通关星标
        const starNode = node.getChildByName('Stars');
        if (starNode) starNode.active = isCleared;

        // 首通奖励标识
        const firstClearBadge = node.getChildByName('FirstClearBadge');
        if (firstClearBadge && level.rewards.firstClear) {
            firstClearBadge.active = !isCleared;
        }

        // 点击进入
        if (isUnlocked) {
            node.on(Node.EventType.TOUCH_END, () => this._onSelectLevel(level), this);
        }

        return node;
    }

    private _onSelectLevel(level: LevelConfig): void {
        SceneLoader.instance?.enterBattle(level.chapter, level.stage);
    }

    private _prevChapter(): void {
        if (this._currentChapter > 1) {
            this._currentChapter--;
            this._refresh();
        }
    }

    private _nextChapter(): void {
        if (this._currentChapter < this._maxChapter) {
            this._currentChapter++;
            this._refresh();
        }
    }

    private _close(): void {
        this.node.active = false;
    }

    onDestroy(): void {
        // 解绑事件
    }
}
