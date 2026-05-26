/**
 * SkillSelectScene - 技能选择面板
 */
import { Scene } from '../engine/Scene.js';
import { SCENE_KEYS } from '../utils/Constants.js';
const RARITY_COLORS = {
    common: '#cccccc',
    rare: '#5cb6ff',
    epic: '#cc77ff',
    legendary: '#ffaa33',
};
export class SkillSelectScene extends Scene {
    constructor() {
        super(SCENE_KEYS.SKILL_SELECT);
        this._options = [];
        this._gameScene = null;
        this._wasDown = false;
        this._bgGameScene = null;
    }
    enter(data) {
        this._options = (data && data.options) || [];
        this._gameScene = (data && data.gameScene) || null;
        this._wasDown = this.input.pointerDown;
    }
    exit() { }
    update() {
        const isDown = this.input.pointerDown;
        const justReleased = this._wasDown && !isDown;
        this._wasDown = isDown;
        if (justReleased) {
            const p = this.input.pointerCurrent;
            const cardW = 320;
            const cardH = 130;
            const cardX = (this.renderer.width - cardW) / 2;
            const startY = 280;
            const gap = 16;
            for (let i = 0; i < this._options.length; i++) {
                const cy = startY + i * (cardH + gap);
                if (p.x >= cardX && p.x <= cardX + cardW
                    && p.y >= cy && p.y <= cy + cardH) {
                    this._select(i);
                    return;
                }
            }
        }
    }
    _select(idx) {
        if (!this._gameScene)
            return;
        this._gameScene.skill.selectSkill(idx);
        this._gameScene.resume();
        this.game.switchTo(SCENE_KEYS.GAME);
        // 注意：switchTo 会调用 GameScene.enter 重新初始化
        // 所以我们需要让 GameScene 直接resume而不重新初始化
        // 这里换一种实现方式
    }
    render() {
        const r = this.renderer;
        // 先渲染背景的游戏场景（半透明）
        if (this._gameScene) {
            this._gameScene.render();
        }
        // 半透明遮罩
        r.drawRect(0, 0, r.width, r.height, 'rgba(0,0,0,0.7)');
        // 标题
        r.drawText('升级！', r.width / 2, 140, {
            size: 56, bold: true, color: '#ffd24a', align: 'center',
            stroke: '#000', strokeWidth: 6,
        });
        r.drawText('选择一项强化', r.width / 2, 210, {
            size: 22, color: '#fff', align: 'center',
        });
        // 选项卡
        const cardW = 320;
        const cardH = 130;
        const cardX = (r.width - cardW) / 2;
        const startY = 280;
        const gap = 16;
        for (let i = 0; i < this._options.length; i++) {
            const opt = this._options[i];
            const cy = startY + i * (cardH + gap);
            const rarityColor = RARITY_COLORS[opt.config.rarity] || '#fff';
            r.drawRoundedRect(cardX, cy, cardW, cardH, 12, '#1e2a3a', rarityColor);
            r.drawRect(cardX, cy, 6, cardH, rarityColor);
            r.drawText(opt.config.name, cardX + 20, cy + 16, {
                size: 22, bold: true, color: rarityColor,
            });
            r.drawText(`Lv.${opt.nextLevel}`, cardX + cardW - 20, cy + 16, {
                size: 14, color: '#888', align: 'right',
            });
            r.drawText(opt.config.description, cardX + 20, cy + 50, {
                size: 14, color: '#bbb',
            });
            // 类型标识
            const typeText = {
                'weapon_new': '武器',
                'weapon_upgrade': '武器升级',
                'passive': '被动',
                'active': '主动',
            }[opt.config.type] || '';
            r.drawText(typeText, cardX + 20, cy + cardH - 22, {
                size: 12, color: rarityColor,
            });
        }
    }
}
//# sourceMappingURL=SkillSelectScene.js.map