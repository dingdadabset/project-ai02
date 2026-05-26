/**
 * 数学工具
 */

export class MathUtils {
    static distance(x1: number, y1: number, x2: number, y2: number): number {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static distanceSqr(x1: number, y1: number, x2: number, y2: number): number {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }

    static randomRange(min: number, max: number): number {
        return min + Math.random() * (max - min);
    }

    static randomInt(min: number, max: number): number {
        return Math.floor(min + Math.random() * (max - min + 1));
    }

    static randomOnCircle(cx: number, cy: number, radius: number): { x: number; y: number } {
        const a = Math.random() * Math.PI * 2;
        return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
    }

    static clamp(v: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, v));
    }

    static weightedRandom(weights: number[]): number {
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < weights.length; i++) {
            r -= weights[i];
            if (r <= 0) return i;
        }
        return weights.length - 1;
    }

    static shuffle<T>(arr: T[]): T[] {
        const result = [...arr];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
}
