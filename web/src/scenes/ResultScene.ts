/**
 * ResultScene - 结算场景
 */
import { Scene } from '../engine/Scene.js';
import { SCENE_KEYS } from '../utils/Constants.js';

export class ResultScene extends Scene {
    private _data: any = {};
    private _wasDown: boolean = false;

    constructor() { super(SCENE_KEYS.RESULT); }

    public enter(data?: any): void {
        this._data = data || { success: false };
        this._wasDown = this.input.pointerDown;
    }

    public exit(): void {}

    public update(): void {
        const isDown = this.input.pointerDown;
        const justReleased = this._wasDown && !isDown;
        this._wasDown = isDown;
        if (justReleased) {
            this.game.switchTo(SCENE_KEYS.MENU);
        }
    }

    public render(): void {
        const r = this.renderer;
        r.clear('#1a2e3a');

        const cx = r.width / 2;
        const cy = r.height / 2;

        const title = this._data.success ? '胜利！' : '失败';
        const titleColor = this._data.success ? '#7aff7a' : '#ff5555';

        r.drawText(title, cx, cy - 200, {
            size: 80, bold: true, color: titleColor, align: 'center',
            stroke: '#000', strokeWidth: 6,
        });

        const time = this._data.time || 0;
        const min = Math.floor(time / 60000);
        const sec = Math.floor((time % 60000) / 1000);
        r.drawText(`存活时间: ${min}:${sec.toString().padStart(2, '0')}`,
            cx, cy - 60, { size: 24, color: '#fff', align: 'center' });
        r.drawText(`击杀数: ${this._data.killCount || 0}`,
            cx, cy - 20, { size: 24, color: '#fff', align: 'center' });
        r.drawText(`获得金币: ${this._data.gold || 0}`,
            cx, cy + 20, { size: 24, color: '#ffd24a', align: 'center' });

        r.drawText('点击返回主菜单', cx, r.height - 120, {
            size: 18, color: '#aaa', align: 'center',
        });
    }
}
