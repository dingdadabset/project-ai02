/**
 * 数学工具
 */
export class MathUtils {
    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    static distanceSqr(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }
    static randomRange(min, max) {
        return min + Math.random() * (max - min);
    }
    static randomInt(min, max) {
        return Math.floor(min + Math.random() * (max - min + 1));
    }
    static randomOnCircle(cx, cy, radius) {
        const a = Math.random() * Math.PI * 2;
        return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
    }
    static clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }
    static weightedRandom(weights) {
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < weights.length; i++) {
            r -= weights[i];
            if (r <= 0)
                return i;
        }
        return weights.length - 1;
    }
    static shuffle(arr) {
        const result = [...arr];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
}
//# sourceMappingURL=MathUtils.js.map