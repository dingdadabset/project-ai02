/**
 * MenuScene - 主菜单
 */
import { Scene } from '../engine/Scene.js';
import { SCENE_KEYS } from '../utils/Constants.js';
import { SaveManager } from '../core/SaveManager.js';
import { ConfigManager } from '../core/ConfigManager.js';
export class MenuScene extends Scene {
    constructor() {
        super(SCENE_KEYS.MENU);
        this._selectedCharIdx = 0;
        this._allChars = [];
        this._btnStart = { x: 0, y: 0, w: 320, h: 80 };
        this._btnCharLeft = { x: 0, y: 0, w: 60, h: 60 };
        this._btnCharRight = { x: 0, y: 0, w: 60, h: 60 };
        this._wasDown = false;
    }
    enter() {
        this._allChars = ConfigManager.instance.getAllPlayers();
        // 初始选择第一个解锁角色
        const unlocked = SaveManager.instance.data.unlockedCharacters[0] || 'warrior';
        this._selectedCharIdx = Math.max(0, this._allChars.findIndex(c => c.id === unlocked));
    }
    exit() {
        this._wasDown = false;
    }
    update() {
        const isDown = this.input.pointerDown;
        const justReleased = this._wasDown && !isDown;
        this._wasDown = isDown;
        if (justReleased) {
            const p = this.input.pointerCurrent;
            // 开始按钮
            if (this._inRect(p.x, p.y, this._btnStart)) {
                const charId = this._allChars[this._selectedCharIdx].id;
                this.game.switchTo(SCENE_KEYS.GAME, { characterId: charId });
                return;
            }
            // 切换角色
            if (this._inRect(p.x, p.y, this._btnCharLeft)) {
                this._selectedCharIdx = (this._selectedCharIdx - 1 + this._allChars.length) % this._allChars.length;
            }
            if (this._inRect(p.x, p.y, this._btnCharRight)) {
                this._selectedCharIdx = (this._selectedCharIdx + 1) % this._allChars.length;
            }
        }
    }
    _inRect(x, y, r) {
        return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }
    render() {
        const r = this.renderer;
        r.clear('#1a2e3a');
        const cx = r.width / 2;
        // 标题
        r.drawText('草原风暴', cx, 180, {
            size: 72, bold: true, color: '#ffd24a', align: 'center',
            stroke: '#000', strokeWidth: 6,
        });
        r.drawText('GRASS STORM', cx, 270, {
            size: 22, color: '#88aacc', align: 'center', bold: true,
        });
        // 角色展示区
        const char = this._allChars[this._selectedCharIdx];
        const charY = 480;
        // 角色圈
        const charColor = char.id === 'mage' ? '#5cd1ff' : (char.id === 'ranger' ? '#9cf07a' : '#ffd24a');
        r.drawCircle(cx, charY + 30, 40, 'rgba(0,0,0,0.4)'); // 阴影
        r.drawCircle(cx, charY, 50, charColor, '#222', 3);
        r.drawCircle(cx + 12, charY - 6, 5, '#222');
        // 角色名
        r.drawText(char.name, cx, charY + 80, {
            size: 32, bold: true, color: '#fff', align: 'center',
            stroke: '#000', strokeWidth: 4,
        });
        if (char.description) {
            r.drawText(char.description, cx, charY + 120, {
                size: 16, color: '#ccc', align: 'center',
            });
        }
        // 属性显示
        const statY = charY + 160;
        r.drawText(`HP: ${char.baseHp}    ATK: ${char.baseAtk}    SPD: ${char.baseSpeed}`, cx, statY, { size: 18, color: '#aaa', align: 'center' });
        r.drawText(`武器: ${char.startWeapon}`, cx, statY + 28, {
            size: 16, color: '#88ccff', align: 'center',
        });
        // 切换按钮
        this._btnCharLeft.x = cx - 200;
        this._btnCharLeft.y = charY - 30;
        this._btnCharRight.x = cx + 140;
        this._btnCharRight.y = charY - 30;
        r.drawRoundedRect(this._btnCharLeft.x, this._btnCharLeft.y, this._btnCharLeft.w, this._btnCharLeft.h, 30, '#334', '#fff');
        r.drawText('<', this._btnCharLeft.x + 30, this._btnCharLeft.y + 30, { size: 32, color: '#fff', align: 'center', baseline: 'middle', bold: true });
        r.drawRoundedRect(this._btnCharRight.x, this._btnCharRight.y, this._btnCharRight.w, this._btnCharRight.h, 30, '#334', '#fff');
        r.drawText('>', this._btnCharRight.x + 30, this._btnCharRight.y + 30, { size: 32, color: '#fff', align: 'center', baseline: 'middle', bold: true });
        // 开始按钮
        this._btnStart.x = cx - this._btnStart.w / 2;
        this._btnStart.y = r.height - 280;
        r.drawRoundedRect(this._btnStart.x, this._btnStart.y, this._btnStart.w, this._btnStart.h, 16, '#ffd24a', '#fff');
        r.drawText('开始游戏', cx, this._btnStart.y + 40, {
            size: 32, bold: true, color: '#222', align: 'center', baseline: 'middle',
        });
        // 存档信息
        const save = SaveManager.instance.data;
        r.drawText(`金币: ${save.gold}    钻石: ${save.diamond}    最高: ${save.maxChapter}-${save.maxStage}`, cx, r.height - 100, { size: 14, color: '#888', align: 'center' });
        // 操作提示
        r.drawText('触屏拖动 / WASD 移动', cx, r.height - 60, {
            size: 14, color: '#666', align: 'center',
        });
    }
}
//# sourceMappingURL=MenuScene.js.map