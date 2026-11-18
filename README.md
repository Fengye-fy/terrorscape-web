# 恶夜杀机 · 网页联机版

桌游 *Terrorscape* 的网页数字改编：雨夜豪宅里，三名幸存者搜钥匙、修无线电，追猎者循着噪音追杀。2–4 个账号联机，一人操作追猎者，其余人分管三名幸存者；空座位可以交给电脑。规则全部由服务器裁决。

> **数字改编，不是实体版逐卡复刻。** 使用第一代豪宅地图和原有逃生条件；扩展角色的技能牌数量、费用、距离等是本项目的适配。中文人物名、卡名为开发译名。美术与牌面为自行绘制，不使用原版文件。实现范围见 [RULES.md](board-games/games/terrorscape/RULES.md) 和 [KILLERS.md](board-games/games/terrorscape/KILLERS.md)。

## 本地试玩

需要 Node.js 18 以上，没有第三方依赖，不用 `npm install`。

```bash
node start.js
```

启动后分别打开（Chrome / Edge 可以直接解析 `*.localhost`）：

| 玩家 | 地址 |
| --- | --- |
| Alice | http://alice.localhost:8770/board-games/index.html |
| Bob | http://bob.localhost:8770/board-games/index.html |
| Carol | http://carol.localhost:8770/board-games/index.html |

子域名就是登录名，每个地址是一个互不串号的身份。Alice 开一间房并选好阵容，其他人凭房间号加入，都点准备后由房主开始。

不联机也能玩：打开 http://localhost:8770/board-games/terrorscape/index.html 是单机练习棋桌，规则引擎在浏览器里跑。

联机身份没有密码，只适合本机试玩和开发：服务只监听 `127.0.0.1`，不要直接暴露到公网。

## 内容

- 两条逃生路线：五把钥匙全员到出口，或修好无线电撑到救援。
- 房主为本局选一名追猎者和三名不同的幸存者，基础角色之外还有第一季、第二季扩展的 24 名角色（豪宅数字适配版）。
- 隐藏信息：幸存者的位置和新噪音在追猎者回合前不公开，每个账号只看到自己该看到的局面。
- 追猎者的牌库内容与等级效果可以在桌面上查看。

## 目录

```text
start.js                              独立启动：页面 + 图片 + 接口，一个进程
board-games/                          后端
  server.js                           HTTP 接口，前缀 /api/board-games
  lib/                                房间、座位、电脑玩家、存档、删房（与具体游戏无关）
  games/terrorscape/                  插件包装、电脑玩家、规则说明、测试
  client/board-games.mjs              无界面的浏览器 SDK
apps/site/public/board-games/         前端
  index.html  board-games.js  board-games.css   共用大厅与房间
  terrorscape-lobby.js                大厅里的建房与等待室
  terrorscape/                        棋桌：engine.js（规则引擎，前后端共用）、table.js、hunter.js、美术与字体
apps/site/public/auth.js              登录桩（接到自己的网站时替换）
```

规则引擎 `terrorscape/engine.js` 同时被服务器插件（`board-games/games/terrorscape/index.js`）和单机练习页加载。`board-games.js` 是几款桌游共用的大厅，`good-cop-bad-cop.js` 只是占位，让共用脚本在只有这一款游戏时照常加载。

## 怎么实现的

- **后端零依赖**。平台层管房间、座位、存档和并发；每款游戏是一个插件，导出 `createGame / applyAction / getLegalActions / getView / getCatalog`，`applyAction` 不修改输入。
- **并发与重试**。每次变更带 `expectedVersion`，版本对不上返回 409；每次操作带 `requestId`，超时重试不会重复执行。
- **无框架、无构建**，2 秒轮询同步。存档是单个 JSON 文件（`board-games/data/`）。

接口契约见 [board-games/API.md](board-games/API.md)。字体为 Noto Serif SC 子集，许可见 `terrorscape/fonts/OFL.txt`。

## 测试

```bash
node board-games/test/run-all.js
```

## 接到自己的网站

1. 用 `createBoardGamesHandler({ dataDir, getUser })` 把接口挂进你的 Node 服务，`getUser(req)` 返回 `{ key, name }` 或 `null`。
2. 把 `apps/site/public/board-games/` 当静态目录发出去。
3. 把 `auth.js` 换成你站上的登录模块，保留 `window.Auth.me()` 和 `login()`。

同系列：[沙丘：帝国 网页联机版](https://github.com/Fengye-fy/dune-imperium-web)、[无间风云 网页联机版](https://github.com/Fengye-fy/good-cop-bad-cop-web)。
