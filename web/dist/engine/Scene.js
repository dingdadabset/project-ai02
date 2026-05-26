export class Scene {
    constructor(name) {
        this.name = name;
    }
    get renderer() { return this.game.renderer; }
    get input() { return this.game.input; }
    get width() { return this.game.renderer.width; }
    get height() { return this.game.renderer.height; }
}
//# sourceMappingURL=Scene.js.map