/**
 * Renderer - Canvas 2D 渲染器
 */
import { Vec2 } from './Vec2.js';

export class Renderer {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    public cameraX: number = 0;
    public cameraY: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.ctx.imageSmoothingEnabled = false;
    }

    public get width(): number { return this.canvas.width; }
    public get height(): number { return this.canvas.height; }

    public clear(color: string = '#2d3a2d'): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /** 开启相机变换：之后绘制使用世界坐标 */
    public beginCamera(): void {
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2 - this.cameraX, this.canvas.height / 2 - this.cameraY);
    }

    /** 关闭相机变换 */
    public endCamera(): void {
        this.ctx.restore();
    }

    /** 设置相机焦点 */
    public setCameraTarget(x: number, y: number): void {
        this.cameraX = x;
        this.cameraY = y;
    }

    /** 世界坐标 → 屏幕坐标 */
    public worldToScreen(wx: number, wy: number): Vec2 {
        return new Vec2(
            wx - this.cameraX + this.canvas.width / 2,
            wy - this.cameraY + this.canvas.height / 2
        );
    }

    /** 是否在屏幕可见区域内（带 margin 提前剔除） */
    public isInView(wx: number, wy: number, margin: number = 50): boolean {
        const sx = wx - this.cameraX + this.canvas.width / 2;
        const sy = wy - this.cameraY + this.canvas.height / 2;
        return sx > -margin && sx < this.canvas.width + margin
            && sy > -margin && sy < this.canvas.height + margin;
    }

    // ---- 基础绘制 ----

    public drawCircle(x: number, y: number, r: number, fill?: string, stroke?: string, strokeWidth: number = 1): void {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
        }
    }

    public drawRect(x: number, y: number, w: number, h: number, fill?: string, stroke?: string, strokeWidth: number = 1): void {
        if (fill) {
            this.ctx.fillStyle = fill;
            this.ctx.fillRect(x, y, w, h);
        }
        if (stroke) {
            this.ctx.strokeStyle = stroke;
            this.ctx.lineWidth = strokeWidth;
            this.ctx.strokeRect(x, y, w, h);
        }
    }

    public drawRoundedRect(x: number, y: number, w: number, h: number, radius: number, fill?: string, stroke?: string): void {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
    }

    public drawLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number = 1): void {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
    }

    public drawText(text: string, x: number, y: number, options: {
        size?: number; color?: string; align?: CanvasTextAlign; baseline?: CanvasTextBaseline;
        bold?: boolean; stroke?: string; strokeWidth?: number;
    } = {}): void {
        const ctx = this.ctx;
        ctx.font = `${options.bold ? 'bold ' : ''}${options.size || 16}px sans-serif`;
        ctx.textAlign = options.align || 'left';
        ctx.textBaseline = options.baseline || 'top';
        if (options.stroke) {
            ctx.strokeStyle = options.stroke;
            ctx.lineWidth = options.strokeWidth || 3;
            ctx.strokeText(text, x, y);
        }
        ctx.fillStyle = options.color || '#fff';
        ctx.fillText(text, x, y);
    }

    public withAlpha(alpha: number, fn: () => void): void {
        const ctx = this.ctx;
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = alpha;
        fn();
        ctx.globalAlpha = prev;
    }

    public withRotation(x: number, y: number, angle: number, fn: () => void): void {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        fn();
        ctx.restore();
    }
}
