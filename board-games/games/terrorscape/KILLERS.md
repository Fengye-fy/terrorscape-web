# 追猎者：豪宅数字适配

本场景使用第一代豪宅地图、三名幸存者与原有逃生条件。下列角色可真人操作，也可由服务器电脑接手。角色主题来自出版社资料；中文名为开发译名。技能牌数量、起始力量、费用、距离和部分效果是本项目的数字适配，**不是实体扩展逐卡复刻**，也不代表实现了扩展地图、二代最终决战或完整规则。

`options.killerId` 选择角色；省略时仍使用 `butcher`。`killerPlayerId` / `killerSeat` 只决定哪个账号操作追猎者，和角色选择互相独立。目录 `catalog.killers` 提供名字、来源产品、能力说明、起始力量、技能 ID 与 `adaptation: 'mansion-digital'`。旧存档使用原有角色和牌堆，不会在读取时重新发牌。

## 第一代扩展

| ID / 角色 | 本数字版实际机制 | 资料与适配边界 |
|---|---|---|
| `huntress` 女猎手 | 放置套网、捕兽与骷髅陷阱；逐步触发，套网截断路径，捕兽造成伤害，骷髅施加恐惧；类型只给追猎者。 | 出版社 Feral Instincts v2 规则的陷阱主题；布置范围和牌堆已缩减。 |
| `werewolf` 狼人 | 向最近的已公布噪音移动一步并搜寻；不读取隐藏幸存者位置。 | 同一规则的 Hyper-hearing；未加入实体银制武器和宝箱系统。 |
| `strangler` 蔓缚者 | 至多五个公开核心，核心传送和从核心房间远程发起相遇；幸存者可用主行动清除核心。 | Amorphous Peril 明确包含 Strangler 和 Unidentified 两名追猎者。实体藤蔓伤害在此改成可防御的相遇。 |
| `unidentified` 不明体 | 等级2和4各选一次永久力量或额外行动进化。 | 同一规则的进化主题；未复刻四张实体进化牌和永久精简弃牌系统。 |
| `statues` 石像群 | 四尊石像分布两出口，可移动次像、切换主像；幸存者凝视独处石像会冻结它直到本轮结束；不阻止搜寻修复。 | Lethal Immortals 的四体与凝视主题；本数字版主像公开，不采用隐藏主像和一次攻击直接击杀。 |
| `queen` 不死女王 | 初始两只僵尸、上限六只；跟随女王移动、独立移动或搜寻；同房单位合力；尸毒重复中毒造成伤害。幸存者初始获弩，可驱散至多两只僵尸。 | Putrefied Enmity 的召唤、合力、弩、毒素主题；不含古墓坍塌、遗物和操控幸存者。 |

资料：

- [ICE MAKES：Feral Instincts](https://icemakesgames.com/products/terrorscape-expansion-feral-instincts)；[出版社 v2 规则 PDF 镜像](https://gamers-hq.de/media/pdf/82/70/0c/Terrorscape_Feral_Instincts_rules_-version_2.pdf)。
- [出版社 Amorphous Peril 规则 PDF 镜像](https://gamers-hq.de/media/pdf/2e/28/40/Terrorscape_Amorphous_Peril_rules.pdf)；[ICE MAKES 官方开发介绍：Statues、Strangler、Unidentified](https://terrorscape.backerkit.com/hosted_preorders/project_updates?page=4)。
- [ICE MAKES：Lethal Immortals](https://icemakesgames.com/products/terrorscape-expansion-lethal-immortals)；[出版社规则 PDF 镜像](https://gamers-hq.de/media/pdf/85/df/18/Terrorscape_Lethal_Immortals_rules.pdf)。
- [ICE MAKES：Putrefied Enmity](https://icemakesgames.com/products/terrorscape-expansion-putrefied-enmity)；[出版社 2024-12-17 规则 PDF 镜像](https://gamers-hq.de/media/pdf/96/93/b9/TERexp4_PN007_Rulesheet_20241217.pdf)。

## 第二代基础盒与扩展

二代角色按官方可混合季别的设计，在本项目沿用豪宅。这不包含极地站、高低差、额外搜索牌堆、四幸存者变体或二代地图。部分资料是出版社开发预览；预览机制可能和最终实体版本不同。

| ID / 角色 | 本数字版实际机制 | 依据及省略 |
|---|---|---|
| `orion` 猎户座 | 区域感知标记猎物，矛枪可从相邻房间发起相遇；命中标记猎物时力量+1。 | 官方二代草案包含 Guided Spear-Gun；本版标记与+1属于数字设计，不含隐匿/延迟卡完整体系。 |
| `eyebot` 魔眼机兵 | 部署至多三架公开侦察机，从侦察机扫描区域。 | 官方二代草案出现部署机器人，官方角色介绍强调监视；未复刻全部程序与机器人牌。 |
| `parasitoid` 寄生体 | 布置公开延迟侵染云，下个追猎回合使其中幸存者获得恐惧与中毒。 | 官方草案的 Cloud of Infestation 主题；用毒素替代直接伤害，不含感染转阵营。 |
| `doctor` 医生 | 邻近房间施毒；重复中毒伤害，幸存者可用主行动解毒。 | 官方 Insanity Cure 角色预览与授权发行商的毒素描述；不复刻强迫完美条件、完整患者系统。 |
| `nightmare` 梦魇 | 以区域技能施加梦魇状态；攻击梦中目标力量+4，目标可用主行动醒来。 | 官方2026年梦境介绍；本版将女孩和梦魇合并为一个地图棋子，不包含独立梦境地图与灯笼/镜子流程。 |
| `wendigo` 温迪戈 | 以饥饿补牌并让无效饥饿牌进入循环；冰冻房间截断移动、阻止搜寻修复，幸存者可逐层除冰。 | 官方2026年重做后的饥饿/冰冻主题；补牌成本和次数经过数字缩减。 |
| `doll` 诡偶 | 非主厅随机隐藏起点；移动位置和日志仅本人可见。混入空白发现牌、窃取钥匙、破坏未完成的无线电；幸存者可盲搜，找回钥匙，累计找到四次则获胜。 | 官方 Fatal Funtime 预览的双向躲藏、窃钥和恶作剧主题；未复刻藏身处、全部陷阱与三张终极面具。 |

资料：

- [ICE MAKES：跨季角色兼容说明](https://gamefound.com/en/projects/ice-makes/terrorscape-2/updates/4)。
- [官方二代规则草案，2025-08-22](https://c.tabletopia.com/games/terrorscape-2/rules/terrorscape2rulebook-22aug25/en)：确认 Orion、Eyebot、Parasitoid，及本项目采用的矛枪、机器人部署、侵染云主题；该草案明确后两者仍在开发。
- [ICE MAKES：Eyebot](https://gamefound.com/en/projects/ice-makes/terrorscape-2/updates/23)。
- [ICE MAKES：Doctor](https://gamefound.com/en/projects/ice-makes/terrorscape-2/updates/33)；[授权德语发行商产品说明](https://www.b-rex-entertainment.com/Spiel/1033769/1033769-Terrorscape-2-Gebrochener-Geist-Erweiterung)。
- [ICE MAKES：梦魇与梦境，2026-05-20](https://gamefound.com/en/projects/ice-makes/terrorscape-2/updates/52)。
- [ICE MAKES：Wendigo 饥饿与冰冻重做，2026-05-08](https://gamefound.com/en/projects/ice-makes/terrorscape-2/updates/51)。
- [ICE MAKES：Doll，2025-10-03](https://gamefound.com/en/projects/ice-makes/terrorscape-2/updates/37)。

## 数据与隐私

公开标记存放在 `view.killer.traps/cores/statues/zombies/drones/clouds/frozenRooms/evolutions`；陷阱类型仅给追猎者，石像主像在本版公开。`poisoned/dreaming/snared` 是幸存者公开状态，不能推导其隐藏位置。诡偶的幸存者投影不提供 `killer.roomId`，移动日志也裁剪。它不通过禁止同房搜寻/修复来间接泄漏位置。

所有动作仍通过最新 `legalActions` 验证并不可变提交；随机种子、牌序、追猎者手牌不会暴露给另一方。人机只能获取自己的投影，不接收完整状态。新增追猎者专属测试见 `test/killers.test.js`。
