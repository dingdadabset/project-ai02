/**
 * MapManager - 多地图场景管理
 * 台账编号: M06-T05
 * 
 * 功能：
 * 1. 根据关卡配置加载对应地图（草地/沙漠/雪地）
 * 2. 实现地图无缝循环（玩家移动时背景跟随）
 * 3. 切换不闪烁（淡入淡出）
 * 4. 前景/背景层次
 */

import { _decorator, Component, Node, Vec3, Sprite, SpriteFrame, UITransform, Color, tween, UIOpacity } from 'cc';
import { Player } from '../entities/Player';
import { LevelSystem } from './LevelSystem';

const { ccclass, property } = _decorator;

export type MapType = 'grassland' | 'desert' | 'snow' | 'cave' | 'castle';

interface MapTileInfo {
    type: MapType;
    bgColor: Color;
    tileSize: number;
}

@ccclass('MapManager')
export class MapManager extends Component {
    private static _instance: MapManager | null = null;

    @property(Node)
    public bgLayer: Node | null = null;     // 背景层（远景）

    @property(Node)
    public groundLayer: Node | null = null; // 地面层

    @property(Node)
    public fogLayer: Node | null = null;    // 前景雾效

    @property([SpriteFrame])
    public groundSprites: SpriteFrame[] = []; // 各地图地面纹理（顺序: grassland/desert/snow/cave/castle）

    @property
    public tileSize: number = 256;

    @property
    public tileCountPerSide: number = 5; // 5x5=25 块

    private _currentMapType: MapType = 'grassland';
    private _tiles: Node[] = [];
    private _playerLastPos: Vec3 = new Vec3();

    // 地图主题配置
    private _mapInfos: Record<MapType, MapTileInfo> = {
        grassland: { type: 'grassland', bgColor: new Color(120, 180, 100, 255), tileSize: 256 },
        desert: { type: 'desert', bgColor: new Color(220, 180, 100, 255), tileSize: 256 },
        snow: { type: 'snow', bgColor: new Color(220, 230, 240, 255), tileSize: 256 },
        cave: { type: 'cave', bgColor: new Color(60, 50, 50, 255), tileSize: 256 },
        castle: { type: 'castle', bgColor: new Color(100, 80, 100, 255), tileSize: 256 },
    };

    public static get instance(): MapManager {
        return MapManager._instance!;
    }

    public get currentMapType(): MapType {
        return this._currentMapType;
    }

    onLoad(): void {
        MapManager._instance = this;
    }

    start(): void {
        // 根据当前关卡加载地图
        const level = LevelSystem.instance?.currentLevel;
        if (level) {
            this.loadMap(level.map as MapType);
        } else {
            this.loadMap('grassland');
        }
    }

    /**
     * 加载指定类型的地图
     */
    public loadMap(type: MapType): void {
        // 淡入淡出过渡
        const opacity = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        tween(opacity)
            .to(0.2, { opacity: 0 })
            .call(() => {
                this._buildMap(type);
            })
            .to(0.2, { opacity: 255 })
            .start();
    }

    private _buildMap(type: MapType): void {
        this._currentMapType = type;
        const info = this._mapInfos[type];

        // 清除旧地图
        if (this.groundLayer) {
            this.groundLayer.removeAllChildren();
            this._tiles = [];
        }

        // 设置背景色
        if (this.bgLayer) {
            const sprite = this.bgLayer.getComponent(Sprite);
            if (sprite) sprite.color = info.bgColor;
        }

        // 选择对应纹理
        const spriteIndex = this._getSpriteIndex(type);
        const sprite = this.groundSprites[spriteIndex];

        // 生成 Tile 网格
        if (this.groundLayer) {
            const half = Math.floor(this.tileCountPerSide / 2);
            for (let x = -half; x <= half; x++) {
                for (let y = -half; y <= half; y++) {
                    const tile = this._createTile(sprite, x * this.tileSize, y * this.tileSize);
                    this.groundLayer.addChild(tile);
                    this._tiles.push(tile);
                }
            }
        }
    }

    private _createTile(sprite: SpriteFrame | null, x: number, y: number): Node {
        const node = new Node('Tile');
        const trans = node.addComponent(UITransform);
        trans.width = this.tileSize;
        trans.height = this.tileSize;

        const sp = node.addComponent(Sprite);
        if (sprite) sp.spriteFrame = sprite;
        sp.sizeMode = Sprite.SizeMode.CUSTOM;

        node.setPosition(x, y, 0);
        return node;
    }

    private _getSpriteIndex(type: MapType): number {
        const order: MapType[] = ['grassland', 'desert', 'snow', 'cave', 'castle'];
        const idx = order.indexOf(type);
        return idx >= 0 ? idx : 0;
    }

    update(dt: number): void {
        this._updateTileFollow();
    }

    /**
     * 地面跟随玩家：当玩家移出网格中心时重新整理 Tile
     */
    private _updateTileFollow(): void {
        const player = Player.instance;
        if (!player || !this.groundLayer) return;

        const playerPos = player.node.worldPosition;

        // 让地面层中心跟随玩家
        const layerPos = this.groundLayer.position;
        const targetX = Math.floor(playerPos.x / this.tileSize) * this.tileSize;
        const targetY = Math.floor(playerPos.y / this.tileSize) * this.tileSize;

        if (Math.abs(layerPos.x - targetX) > this.tileSize ||
            Math.abs(layerPos.y - targetY) > this.tileSize) {
            this.groundLayer.setPosition(targetX, targetY, 0);
        }
    }

    onDestroy(): void {
        if (MapManager._instance === this) {
            MapManager._instance = null;
        }
    }
}
