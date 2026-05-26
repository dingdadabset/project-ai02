# 割草游戏 - 技术设计文档 (Technical Design)

## 1. 架构总览

### 1.1 架构模式

采用 **ECS（Entity-Component-System）+ 组件化** 混合架构：

```
┌─────────────────────────────────────────────────┐
│                  Game Layer                       │
│  ┌───────────┬──────────────┬─────────────────┐ │
│  │  Scene    │   UI Layer   │  Audio Manager  │ │
│  │  Manager  │              │                 │ │
│  └───────────┴──────────────┴─────────────────┘ │
├─────────────────────────────────────────────────┤
│                 Logic Layer                       │
│  ┌──────────┬──────────┬──────────┬───────────┐ │
│  │ Combat   │ Movement │  Skill   │  Level    │ │
│  │ System   │ System   │  System  │  System   │ │
│  └──────────┴──────────┴──────────┴───────────┘ │
├─────────────────────────────────────────────────┤
│                  Data Layer                       │
│  ┌──────────┬──────────┬──────────┬───────────┐ │
│  │ Config   │  Save    │  Event   │  Object   │ │
│  │ Manager  │  Manager │  Bus     │  Pool     │ │
│  └──────────┴──────────┴──────────┴───────────┘ │
├─────────────────────────────────────────────────┤
│               Engine Layer (Cocos)               │
│  ┌──────────┬──────────┬──────────┬───────────┐ │
│  │ Renderer │ Physics  │  Input   │  Asset    │ │
│  │          │          │          │  Bundle   │ │
│  └──────────┴──────────┴──────────┴───────────┘ │
└─────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

1. **数据驱动**：所有游戏数值通过 JSON/CSV 配置表管理
2. **对象池化**：所有频繁创建/销毁的对象使用对象池
3. **事件解耦**：模块间通过事件总线通信，降低耦合
4. **组件复用**：通用行为抽象为可复用组件

---

## 2. 目录结构

```
assets/
├── scenes/                 # 场景文件
│   ├── loading.scene       # 加载场景
│   ├── home.scene          # 主界面
│   └── battle.scene        # 战斗场景
├── scripts/                # 脚本代码
│   ├── core/               # 核心框架
│   │   ├── EventBus.ts     # 事件总线
│   │   ├── ObjectPool.ts   # 对象池
│   │   ├── GameManager.ts  # 游戏管理器（单例）
│   │   ├── ConfigManager.ts # 配置管理器
│   │   └── SaveManager.ts  # 存档管理
│   ├── entities/           # 实体
│   │   ├── Player.ts       # 玩家控制器
│   │   ├── Enemy.ts        # 敌人基类
│   │   ├── EnemyTypes/     # 各类敌人
│   │   └── Projectile.ts   # 弹幕/投射物
│   ├── systems/            # 系统
│   │   ├── CombatSystem.ts     # 战斗系统
│   │   ├── MovementSystem.ts   # 移动系统
│   │   ├── SpawnSystem.ts      # 刷怪系统
│   │   ├── SkillSystem.ts      # 技能系统
│   │   ├── LevelSystem.ts      # 关卡系统
│   │   └── DropSystem.ts       # 掉落系统
│   ├── weapons/            # 武器
│   │   ├── WeaponBase.ts   # 武器基类
│   │   ├── RotatingBlade.ts    # 旋转刀刃
│   │   ├── LightningChain.ts   # 闪电链
│   │   ├── Fireball.ts         # 火球术
│   │   └── FrostNova.ts        # 冰霜新星
│   ├── ui/                 # UI组件
│   │   ├── HUD.ts          # 战斗HUD
│   │   ├── SkillSelect.ts  # 技能选择面板
│   │   ├── DamageNumber.ts # 伤害数字
│   │   └── HealthBar.ts    # 血条组件
│   └── utils/              # 工具类
│       ├── MathUtils.ts    # 数学工具
│       ├── Timer.ts        # 计时器
│       └── Constants.ts    # 常量定义
├── configs/                # 配置表
│   ├── enemy_config.json   # 怪物配置
│   ├── weapon_config.json  # 武器配置
│   ├── skill_config.json   # 技能配置
│   ├── level_config.json   # 关卡配置
│   └── player_config.json  # 角色配置
├── resources/              # 动态加载资源
│   ├── prefabs/            # 预制体
│   ├── textures/           # 纹理
│   ├── animations/         # 动画
│   └── audio/              # 音频
└── bundle/                 # 资源分包
    ├── chapter1/           # 第一章资源
    └── chapter2/           # 第二章资源
```

---

## 3. 核心系统设计

### 3.1 游戏管理器 (GameManager)

```typescript
// 游戏状态机
enum GameState {
    LOADING,    // 加载中
    PLAYING,    // 游戏中
    PAUSED,     // 暂停
    LEVEL_UP,   // 升级选技能
    BOSS,       // Boss战
    VICTORY,    // 胜利
    GAME_OVER   // 失败
}

class GameManager {
    // 全局单例，管理游戏生命周期
    // 控制状态切换、暂停/恢复
    // 协调各子系统
}
```

### 3.2 对象池 (ObjectPool)

**设计目标**：同屏 100+ 敌人零 GC

```typescript
class ObjectPool<T extends Node> {
    private pool: T[] = [];
    
    get(): T;           // 从池中获取
    put(obj: T): void;  // 归还到池
    preload(count: number): void; // 预加载
    clear(): void;      // 清空池
}
```

预加载策略：
- 敌人池：关卡开始前预加载 200 个
- 弹幕池：预加载 100 个
- 伤害数字池：预加载 50 个
- 掉落物池：预加载 100 个

### 3.3 事件总线 (EventBus)

```typescript
// 全局事件定义
enum GameEvent {
    ENEMY_KILLED = "enemy_killed",
    PLAYER_LEVEL_UP = "player_level_up",
    PLAYER_DAMAGED = "player_damaged",
    SKILL_SELECTED = "skill_selected",
    WAVE_COMPLETE = "wave_complete",
    BOSS_SPAWN = "boss_spawn",
    GAME_OVER = "game_over",
    ITEM_PICKED = "item_picked",
}
```

### 3.4 战斗系统 (CombatSystem)

```
伤害计算公式：
FinalDamage = BaseDMG × (1 + BonusDMG%) × CritMultiplier - TargetDEF

暴击判定：
if (random() < CritRate) → FinalDamage × CritDamageMultiplier

减伤公式：
DamageReduction = DEF / (DEF + 100)
```

碰撞检测优化：
- 使用 **空间分区（Grid）** 替代全量碰撞检测
- 网格大小 = 最大敌人尺寸 × 2
- 每帧只检测玩家周围 9 宫格内的实体

### 3.5 刷怪系统 (SpawnSystem)

```typescript
interface WaveConfig {
    waveId: number;
    startTime: number;      // 出现时间（秒）
    duration: number;       // 持续时间
    enemyType: string;      // 敌人类型
    spawnRate: number;      // 每秒刷新数量
    maxCount: number;       // 最大同屏数
    spawnPattern: "circle" | "edge" | "point"; // 刷新模式
}
```

刷怪模式：
- **circle**：在玩家周围一定半径的圆上随机生成
- **edge**：从屏幕边缘进入
- **point**：固定点位刷新（Boss）

### 3.6 技能/升级系统 (SkillSystem)

```typescript
interface SkillOption {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: "weapon_new" | "weapon_upgrade" | "passive" | "active";
    rarity: "common" | "rare" | "epic" | "legendary";
    weight: number;         // 出现权重
    maxLevel: number;
    effects: SkillEffect[];
}
```

技能选择算法：
1. 收集所有可用技能（排除已满级）
2. 根据 rarity 和 weight 加权随机
3. 保证至少 1 个武器相关选项
4. 去重后返回 3 个选项

### 3.7 移动系统 (MovementSystem)

**输入方式**：虚拟摇杆（Joystick）

```typescript
class JoystickController {
    direction: Vec2;    // 方向向量（归一化）
    magnitude: number;  // 力度 0-1
    isActive: boolean;  // 是否触摸中
}
```

移动实现：
- 8 方向平滑移动
- 速度 = 基础速度 × magnitude × 速度加成
- 移动边界 = 地图边界内

---

## 4. 性能优化方案

### 4.1 渲染优化

| 方案 | 说明 |
|------|------|
| 批量渲染 | 同类型敌人使用同一材质/图集，合批渲染 |
| GPU 实例化 | 大量相同网格使用 GPU Instancing |
| LOD | 远处敌人降低细节/帧率 |
| 视锥剔除 | 屏幕外实体不渲染 |
| 图集合并 | 所有小图合并为大图集 |

### 4.2 逻辑优化

| 方案 | 说明 |
|------|------|
| 对象池 | 避免运行时 new/destroy |
| 空间分区 | 网格化碰撞检测 |
| 分帧处理 | AI 逻辑分帧更新（非每帧） |
| 脏标记 | 属性变更时才重算 |
| 数据局部性 | SoA 数据布局优化缓存命中 |

### 4.3 内存优化

| 方案 | 说明 |
|------|------|
| 资源分包 | 按章节动态加载 |
| 纹理压缩 | ASTC(iOS) / ETC2(Android) |
| 引用计数 | 自动卸载不用的资源 |
| 动画复用 | 共享骨骼动画数据 |

---

## 5. 数据配置表设计

### 5.1 怪物配置 (enemy_config.json)

```json
{
    "enemies": [
        {
            "id": "slime_green",
            "name": "绿色史莱姆",
            "type": "melee",
            "hp": 30,
            "atk": 5,
            "speed": 80,
            "exp": 5,
            "dropTable": ["gold_small", "hp_orb"],
            "sprite": "enemy_slime_green",
            "size": 0.8
        }
    ]
}
```

### 5.2 武器配置 (weapon_config.json)

```json
{
    "weapons": [
        {
            "id": "rotating_blade",
            "name": "旋转刀刃",
            "type": "melee_aoe",
            "baseDamage": 15,
            "attackSpeed": 1.0,
            "range": 120,
            "levels": [
                { "level": 1, "damage": 15, "count": 1, "speed": 1.0 },
                { "level": 2, "damage": 20, "count": 1, "speed": 1.2 },
                { "level": 3, "damage": 20, "count": 2, "speed": 1.2 },
                { "level": 4, "damage": 30, "count": 2, "speed": 1.5 },
                { "level": 5, "damage": 30, "count": 3, "speed": 1.5 }
            ]
        }
    ]
}
```

### 5.3 关卡配置 (level_config.json)

```json
{
    "levels": [
        {
            "id": "level_1_1",
            "chapter": 1,
            "stage": 1,
            "duration": 180,
            "map": "grassland",
            "waves": [
                { "time": 0, "enemy": "slime_green", "rate": 2, "duration": 30 },
                { "time": 30, "enemy": "slime_blue", "rate": 3, "duration": 30 },
                { "time": 60, "enemy": "skeleton", "rate": 2, "duration": 30 },
                { "time": 120, "enemy": "elite_wolf", "rate": 1, "duration": 20 },
                { "time": 160, "enemy": "boss_treant", "rate": 0, "count": 1 }
            ],
            "rewards": {
                "gold": [100, 200],
                "exp": 50,
                "firstClear": { "type": "diamond", "amount": 30 }
            }
        }
    ]
}
```

---

## 6. 网络架构（后期）

```
┌─────────┐       WebSocket       ┌──────────┐
│  Client  │ ◄──────────────────► │  Server  │
│ (Cocos)  │                      │ (Node.js)│
└─────────┘                      └──────────┘
                                       │
                                       ▼
                                 ┌──────────┐
                                 │  Redis   │ 排行榜/Session
                                 └──────────┘
                                       │
                                       ▼
                                 ┌──────────┐
                                 │  MySQL   │ 用户数据/存档
                                 └──────────┘
```

初期为单机游戏，后期接入：
- 排行榜服务
- 存档云同步
- 每日挑战排名
- 广告/支付 SDK

---

## 7. 工具链

| 工具 | 用途 |
|------|------|
| Cocos Creator 3.8+ | 游戏引擎 & 编辑器 |
| VS Code | 代码编辑 |
| TexturePacker | 图集打包 |
| Spine / DragonBones | 骨骼动画 |
| Tiled Map Editor | 地图编辑（可选） |
| Audacity | 音效编辑 |
| Git + GitHub | 版本管理 |
| Excel/Google Sheet | 数值策划表 |
