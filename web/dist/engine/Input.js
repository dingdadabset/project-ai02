/**
 * Input - 输入管理（触屏 + 鼠标 + 键盘）
 */
import { Vec2 } from './Vec2.js';
export class Input {
    constructor(canvas) {
        this._keys = new Set();
        this._pointerDown = false;
        this._pointerStart = new Vec2();
        this._pointerCurrent = new Vec2();
        this._scaleX = 1;
        this._scaleY = 1;
        this._canvas = canvas;
        this._bindEvents();
        this._updateScale();
        window.addEventListener('resize', () => this._updateScale());
    }
    _updateScale() {
        const rect = this._canvas.getBoundingClientRect();
        this._scaleX = this._canvas.width / rect.width;
        this._scaleY = this._canvas.height / rect.height;
    }
    _toCanvasCoord(clientX, clientY) {
        const rect = this._canvas.getBoundingClientRect();
        return new Vec2((clientX - rect.left) * this._scaleX, (clientY - rect.top) * this._scaleY);
    }
    _bindEvents() {
        // 鼠标
        this._canvas.addEventListener('mousedown', (e) => {
            this._pointerDown = true;
            const p = this._toCanvasCoord(e.clientX, e.clientY);
            this._pointerStart.setFrom(p);
            this._pointerCurrent.setFrom(p);
        });
        this._canvas.addEventListener('mousemove', (e) => {
            if (!this._pointerDown)
                return;
            this._pointerCurrent.setFrom(this._toCanvasCoord(e.clientX, e.clientY));
        });
        window.addEventListener('mouseup', () => {
            this._pointerDown = false;
        });
        // 触摸
        this._canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            if (!t)
                return;
            this._pointerDown = true;
            const p = this._toCanvasCoord(t.clientX, t.clientY);
            this._pointerStart.setFrom(p);
            this._pointerCurrent.setFrom(p);
        }, { passive: false });
        this._canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            if (!t || !this._pointerDown)
                return;
            this._pointerCurrent.setFrom(this._toCanvasCoord(t.clientX, t.clientY));
        }, { passive: false });
        this._canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this._pointerDown = false;
        }, { passive: false });
        this._canvas.addEventListener('touchcancel', () => {
            this._pointerDown = false;
        });
        // 键盘
        window.addEventListener('keydown', (e) => {
            this._keys.add(e.key.toLowerCase());
        });
        window.addEventListener('keyup', (e) => {
            this._keys.delete(e.key.toLowerCase());
        });
    }
    get pointerDown() { return this._pointerDown; }
    get pointerStart() { return this._pointerStart; }
    get pointerCurrent() { return this._pointerCurrent; }
    /**
     * 摇杆方向（归一化），返回 (0,0) 表示无输入
     */
    getJoystickDirection(maxRadius = 60, deadZone = 8) {
        const result = new Vec2();
        // 键盘 WASD/方向键支持
        if (this._keys.has('w') || this._keys.has('arrowup'))
            result.y -= 1;
        if (this._keys.has('s') || this._keys.has('arrowdown'))
            result.y += 1;
        if (this._keys.has('a') || this._keys.has('arrowleft'))
            result.x -= 1;
        if (this._keys.has('d') || this._keys.has('arrowright'))
            result.x += 1;
        if (result.lengthSqr() > 0.001) {
            return result.normalize();
        }
        // 触屏摇杆
        if (this._pointerDown) {
            const dx = this._pointerCurrent.x - this._pointerStart.x;
            const dy = this._pointerCurrent.y - this._pointerStart.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < deadZone)
                return result;
            const r = Math.min(len, maxRadius);
            return new Vec2((dx / len) * (r / maxRadius), (dy / len) * (r / maxRadius));
        }
        return result;
    }
    isKeyDown(key) {
        return this._keys.has(key.toLowerCase());
    }
    isPointerInRect(x, y, w, h) {
        if (!this._pointerDown)
            return false;
        const p = this._pointerCurrent;
        return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    }
    getPointerStartInRect(x, y, w, h) {
        const p = this._pointerStart;
        return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    }
}
//# sourceMappingURL=Input.js.map