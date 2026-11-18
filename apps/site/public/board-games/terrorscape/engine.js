(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TerrorscapeEngine = factory();
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const fail = (code, message, status = 400) => {
    throw Object.assign(new Error(message), { code, status });
  };
  const demand = (ok, code, message) => {
    if (!ok) fail(code, message);
  };
  const manifest = {
    id: "terrorscape",
    name: "恶夜杀机",
    englishName: "Terrorscape",
    status: "live",
    supportsBots: true,
    allowRoomDeletion: true,
    botActionMode: "projected-legal",
    privateActions: true,
    minPlayers: 2,
    maxPlayers: 4,
    ruleset: "mansion-digital-v1",
    supportedRulesets: ["mansion-digital-v1"],
    supportedExpansions: [],
    description:
      "豪宅中的非对称追逃。1–4 人可开局，空席可由电脑接手，一名追猎者对抗三名幸存者。",
    sources: [
      {
        title: "ICE MAKES 官方游戏介绍",
        url: "https://icemakesgames.com/products/terrorscape",
      },
      {
        title: "出版社 Tabletopia 英文规则书 Version 2",
        url: "https://c.tabletopia.com/games/terrorscape/rules/terrorscape-rulebook-new/en",
      },
      {
        title: "ICE MAKES 古墓扩展角色介绍",
        url: "https://gamefound.com/en/projects/ice-makes/terrorscape-putrefied-enmity/updates/9",
      },
      {
        title: "ICE MAKES 第二季与扩展角色介绍",
        url: "https://gamefound.com/en/projects/ice-makes/terrorscape-2/updates",
      },
    ],
    limitations: [
      "豪宅数字基础场景，不是全部实体规则的逐卡复刻。",
      "豪宅使用双阵营视野、噪音、钥匙、无线电和相遇规则。不同角色的能力按本站豪宅场景适配，选角时可查看实际效果。",
      "扩展角色可在豪宅混搭。默认阵容为威廉、安娜、马可对屠夫，地图、物资和胜利条件使用豪宅数字规则。",
    ],
  };
  const rooms = [
    ["R1", "主厅", "Main Hall", 16, 45, { exit: "main" }],
    ["R2", "画廊", "Gallery", 17, 69, { search: true }],
    ["R3", "走廊", "Hallway", 42, 33, {}],
    ["R4", "书斋", "Den", 45, 47, {}],
    ["R5", "图书馆", "Library", 44, 69, {}],
    ["B1", "起居室", "Living Room", 17, 17, { radio: true, passage: "I" }],
    ["B2", "餐厅", "Dining Room", 39, 18, {}],
    ["B3", "厨房", "Kitchen", 58, 16, {}],
    ["B4", "车库", "Garage", 74, 17, { search: true }],
    ["B5", "宴会厅", "Banquet Hall", 67, 40, { passage: "II" }],
    ["G1", "露台", "Patio", 22, 87, {}],
    ["G2", "墓地", "Graveyard", 56, 88, { passage: "I" }],
    ["G3", "工具棚", "Shed", 87, 86, {}],
    ["G4", "温室", "Greenhouse", 66, 70, { search: true }],
    ["G5", "花园", "Garden", 88, 49, { exit: "hidden", passage: "II" }],
  ].map(([id, name, englishName, x, y, flags]) => ({
    id,
    name,
    englishName,
    x,
    y,
    zone: id[0],
    search: false,
    radio: false,
    exit: null,
    passage: false,
    ...flags,
  }));
  const edges = [
    ["B1", "B2"],
    ["B2", "B3"],
    ["B3", "B4"],
    ["B4", "G5"],
    ["B2", "B5"],
    ["R3", "B5"],
    ["R4", "B5"],
    ["R1", "B1"],
    ["R1", "B2"],
    ["R1", "R3"],
    ["R1", "R2"],
    ["R2", "R3"],
    ["R2", "R5"],
    ["R4", "R5"],
    ["R5", "G4"],
    ["R2", "G1"],
    ["G4", "G5"],
    ["G1", "G2"],
    ["G2", "G3"],
    ["G3", "G5"],
  ];
  const characters = [
    {
      id: "william",
      name: "威廉·胡珀",
      englishName: "William Hooper",
      ability:
        "赤手空拳：不使用防御物品时防御 +1；冲刺主行动最多移动三步，目的地制造噪音。",
      startingItems: [],
    },
    {
      id: "anna",
      name: "安娜·库布里克",
      englishName: "Anna Kubrick",
      ability: "隐匿：不回应追猎者的感知。",
      startingItems: [],
    },
    {
      id: "marco",
      name: "马可·卡罗",
      englishName: "Marco Carro",
      ability: "起始携带医药箱；本场景未实现其余医生能力。",
      startingItems: ["medical-kit"],
    },
    {
      id: "johnson",
      name: "约翰逊",
      englishName: "Johnson",
      ability: "可携带 4 件物品；工具箱修复 +3。",
      startingItems: [],
    },
    {
      id: "sophia",
      name: "索菲娅",
      englishName: "Sophia",
      ability: "无需手电筒即可将密道作为主行动移动。",
      startingItems: [],
    },
    {
      id: "george",
      name: "乔治·卡彭特",
      englishName: "George Carpenter",
      expansion: "Lethal Immortals",
      sourceUrl:
        "https://terrorscape.backerkit.com/hosted_preorders/project_updates?page=4",
      ability:
        "教授：书斋消耗工具箱可远程修复或搜寻；行动后近距离观察可获得研究笔记，消耗笔记静默修复 +1。",
      adaptation:
        "豪宅书斋作为知识地点；观察、笔记与远程操作采用数字适配，非完整角色板复刻。",
      startingItems: [],
    },
    {
      id: "ophelia",
      name: "奥菲莉娅·罗梅罗",
      englishName: "Ophelia Romero",
      expansion: "Putrefied Enmity",
      sourceUrl:
        "https://gamefound.com/en/projects/ice-makes/terrorscape-putrefied-enmity/updates/9",
      ability:
        "鼓励任意同伴：清除恐惧并给一个隐藏鼓励标记；标记可挡一次恐惧或防御 +1。搜寻二选一，另一张放回牌顶且不制造噪音。",
      adaptation:
        "采用官方披露的鼓励及第六感；鼓励由防御者选择是否在相遇中消耗，遇恐惧时自动优先抵消。",
      startingItems: [],
    },
    {
      id: "dylan",
      name: "迪伦·温",
      englishName: "Dylan Wan",
      expansion: "Putrefied Enmity",
      sourceUrl:
        "https://gamefound.com/en/projects/ice-makes/terrorscape-putrefied-enmity/updates/9",
      ability: "坚韧：抵消首次伤害；机械知识：车库额外行动从弃牌回收工具箱。",
      adaptation:
        "豪宅车库作为工具地点；旧存档未记录坚韧时默认已消耗，避免读档再生。",
      startingItems: [],
    },
    {
      id: "caleb",
      name: "凯莱布·皮尔",
      englishName: "Caleb Peele",
      expansion: "Putrefied Enmity",
      sourceUrl:
        "https://gamefound.com/en/projects/ice-makes/terrorscape-putrefied-enmity/updates/9",
      ability:
        "神秘爱好者可在墓地搜寻；每轮一次幸运币：弃掉搜寻牌顶，钥匙则治疗，否则可额外移动两步。",
      adaptation:
        "豪宅墓地作为神秘地点；幸运币限制每轮一次，原物品的完整时机以实体版为准。",
      startingItems: ["lucky-coin"],
    },
    {
      id: "roy",
      name: "罗伊·康德里",
      englishName: "Roy Condrey",
      expansion: "Terrorscape 2",
      sourceUrl:
        "https://gamefound.com/en/projects/ice-makes/terrorscape-2/updates/6",
      ability:
        "近战专家：使用手斧或长剑防御 +2；引路主行动让另一名同伴移动一步，自己位置制造噪音。",
      adaptation:
        "依据官方能力概述，豪宅配装一把手斧；引路数值与手斧基础防御为数字适配。",
      startingItems: ["hatchet"],
    },
    {
      id: "evelyn",
      name: "伊芙琳",
      englishName: "Evelyn",
      expansion: "Terrorscape 2",
      sourceUrl:
        "https://gamefound.com/en/projects/ice-makes/terrorscape-2/updates/7",
      ability:
        "无声包扎：连续两轮在同房间各花一个主行动治疗同伴；消耗能量饮料可清除自己的恐惧并额外移动一步。",
      adaptation:
        "将公开的慢速无声疗伤适配为两轮包扎，将肾上腺素/镇静剂适配为本站能量饮料。",
      startingItems: [],
    },
    {
      id: "zach",
      name: "扎克·格里普",
      englishName: "Zach Grip",
      expansion: "Terrorscape 2",
      sourceUrl:
        "https://gamefound.com/en/projects/ice-makes/terrorscape-2/updates/9",
      ability:
        "携带爱用扳手时修复不制造噪音；追猎者达到三级后，普通修复提高到 +2。",
      adaptation:
        "豪宅仅修复无线电，不包含二代车辆；扳手的防御 +1 与修复加速数值为数字适配。",
      startingItems: ["wrench"],
    },
    {
      id: "victoria",
      name: "维多利亚·霍普",
      englishName: "Victoria Hope",
      expansion: "Terrorscape 2",
      sourceUrl:
        "https://gamefound.com/en/projects/ice-makes/terrorscape-2/updates/10",
      ability:
        "无恐惧时防御 +1；书斋主行动制作实验装置，可防御 +2 或额外行动清除近距离同伴的恐惧。",
      adaptation:
        "官方披露装置制作与冷静应战；具体装置功能、地点和数值为豪宅适配。",
      startingItems: [],
    },
    {
      id: "quinto",
      name: "昆托·鲍恩",
      englishName: "Quinto Bowen",
      expansion: "Terrorscape 2",
      sourceUrl:
        "https://gamefound.com/en/projects/ice-makes/terrorscape-2/updates/11",
      ability:
        "每轮可额外穿过一次密道；无线电修好当轮可在起居室进行一次求援通话，使救援提早一轮。",
      adaptation:
        "官方灵活密道与加速救援以每轮一次穿越、每局一次减一倒数适配豪宅。",
      startingItems: [],
    },
    {
      id: "brenda",
      name: "布伦达·塔拉吉奇",
      englishName: "Brenda Talajic",
      expansion: "Depraved Hunger",
      sourceUrl:
        "https://gamefound.com/en/projects/ice-makes/terrorscape-2/updates/36",
      ability:
        "与警犬库珀结伴：背包容量四件；起始携带左轮手枪，每轮可令库珀在相邻地点制造一次叫声诱饵。",
      adaptation:
        "库珀在豪宅与主人共用位置、健康及逃生，不是第四枚独立幸存者；专属左轮使用本站通用左轮数值。",
      startingItems: ["revolver"],
    },
    {
      id: "hubert",
      name: "休伯特·考森",
      englishName: "Hubert Cawthon",
      expansion: "Fatal Funtime",
      sourceUrl:
        "https://gamefound.com/en/projects/ice-makes/terrorscape-2/updates/36",
      ability:
        "心理预演主行动：下一轮可执行两种不同的主行动，不能连续两轮预演；威士忌瓶诱饵范围提高到两格。",
      adaptation:
        "采用官方披露的预演与远投，双行动不包含连续两次同类搜寻/移动/修复。",
      startingItems: [],
    },
  ];
  const items = [
    {
      id: "research-notes",
      name: "研究笔记",
      description:
        "乔治观察所得；额外行动消耗，远程静默修复 +1，不受普通每轮一次修复限制。",
    },
    {
      id: "lucky-coin",
      name: "幸运币",
      persistent: true,
      description:
        "凯莱布每轮一次：弃掉搜寻牌顶；钥匙则治疗，否则额外移动两步。豪宅适配。",
    },
    {
      id: "hatchet",
      name: "手斧",
      defense: 2,
      description: "防御 +2，消耗；罗伊使用额外 +2。豪宅配装。",
    },
    {
      id: "wrench",
      name: "爱用扳手",
      defense: 1,
      persistent: true,
      description: "防御 +1；扎克持有时修复无噪音。豪宅适配。",
    },
    {
      id: "experimental-gadget",
      name: "实验装置",
      defense: 2,
      description:
        "防御 +2并消耗，或额外行动消耗为一格内同伴清除恐惧。豪宅适配。",
    },
    {
      id: "key",
      name: "钥匙",
      noise: true,
      description: "立即加入团队钥匙，不占库存。",
    },
    {
      id: "toolbox",
      name: "工具箱",
      noise: true,
      description: "主行动：修复无线电 +2，约翰逊 +3，消耗。",
    },
    {
      id: "limestone",
      name: "石灰粉",
      defense: 2,
      description: "相遇：防御 +2，消耗。",
    },
    {
      id: "revolver",
      name: "左轮手枪",
      defense: 2,
      persistent: true,
      noise: true,
      description: "相遇：防御 +2，可额外消耗弹药包再 +2；数字场景数值。",
    },
    {
      id: "ammo",
      name: "弹药包",
      description: "配合左轮手枪防御额外 +2，消耗。",
    },
    {
      id: "first-aid",
      name: "急救包",
      description: "主行动：治疗同房间一名受伤幸存者，消耗。",
    },
    {
      id: "medical-kit",
      name: "医药箱",
      description:
        "主行动：治疗同房间一名幸存者并移除其全部恐惧，消耗。马可的起始物品。",
    },
    {
      id: "flashlight",
      name: "手电筒",
      persistent: true,
      description:
        "主行动：在同一编号的密道端点之间移动（起居室↔墓地，宴会厅↔花园）。",
    },
    {
      id: "secret-map",
      name: "秘密地图",
      persistent: true,
      description: "全员可带五把钥匙从花园隐藏出口逃离。",
    },
    {
      id: "whiskey",
      name: "威士忌瓶",
      description: "额外行动：向相邻房间制造噪音，消耗。",
    },
    {
      id: "firecracker",
      name: "鞭炮",
      noise: true,
      description: "额外行动：所有房间制造噪音，消耗。",
    },
    {
      id: "energy-drink",
      name: "能量饮料",
      description: "额外行动：清除自己的全部恐惧，消耗。",
    },
    {
      id: "amulet",
      name: "古老护符",
      defense: 3,
      description: "相遇：防御 +3，消耗；数字场景数值。",
    },
  ];
  // These six cards are an explicitly reduced digital deck, not transcriptions of printed cards.
  const skills = [
    {
      id: "brutal-rage",
      name: "蛮力狂暴",
      englishName: "Brutal Rage",
      timing: "special",
      unlockLevel: 3,
      description:
        "屠夫三级解锁。替代两次普通行动：每段移动1–2步并搜寻；若未相遇且本段移除了封锁，可继续一段。相遇或未拆封锁时结束回合。",
      adaptation:
        "豪宅数字适配：不另付弃牌成本；满手解锁时自动弃最左旧牌；连续段间可主动结束，不能插入其他技能。",
      sourceUrl:
        "https://terrorscape.backerkit.com/hosted_preorders/project_updates?page=5",
    },
    {
      id: "sense",
      name: "感知",
      timing: "fast",
      description: "选择一个区域，得知其中除安娜外的幸存者。",
    },
    {
      id: "pursue",
      name: "追击",
      timing: "fast",
      description: "额外移动一步。",
    },
    {
      id: "chainsaw",
      name: "电锯轰鸣",
      timing: "special",
      description:
        "替代两次普通行动：当前及相邻房间的幸存者恐惧 +1，随后搜寻。",
    },
    {
      id: "barricade",
      name: "封锁",
      timing: "slow",
      description: "普通行动后，封锁相邻的一扇门。",
    },
    {
      id: "rage",
      name: "残暴怒火",
      timing: "attack",
      description: "本次相遇力量 +2。",
    },
    {
      id: "terror",
      name: "惊吓",
      timing: "fast",
      description: "当前房间幸存者恐惧 +1。",
    },
  ];
  // Published character themes, adapted to the Mansion's existing digital rules.
  // These decks and numbers are deliberately NOT presented as physical card transcriptions.
  const butcherStartingDeck = [
    "sense",
    "sense",
    "pursue",
    "pursue",
    "pursue",
    "chainsaw",
    "chainsaw",
    "barricade",
    "barricade",
    "rage",
    "rage",
    "terror",
  ];
  const commonExpansionCards = ["sense", "pursue", "rage", "terror"];
  const killerStartingDecks = new Map();
  function countCards(cards) {
    const counts = {};
    // Stable skill-id ordering prevents property order from exposing draw order.
    for (const id of [...cards].sort()) counts[id] = (counts[id] || 0) + 1;
    return counts;
  }
  function strengthAtLevel(startingStrength, level, mightCount = 0) {
    return Math.min(10, startingStrength + Math.floor(level / 2) + mightCount);
  }
  function killerLevels(id, startingStrength, ability) {
    return Array.from({ length: 5 }, (_, index) => {
      const level = index + 1;
      const strength = strengthAtLevel(startingStrength, level);
      const increased =
        level > 1 && strength > strengthAtLevel(startingStrength, level - 1);
      let effect = level === 1 ? ability : "沿用上级能力。";
      if (increased) {
        effect =
          id === "queen"
            ? "女王和每只僵尸的相遇力量各提高 1 点；同房合力时，防御成功所需结果按参战单位数累计提高。"
            : "相遇时，幸存者防御成功所需的结果提高 1 点。";
      }
      if (id === "butcher" && level === 3)
        effect = "解锁蛮力狂暴，获得此技能牌；手牌已满时弃置最左侧旧手牌腾位。";
      if (id === "unidentified" && [2, 4].includes(level)) {
        effect +=
          " 新增一次进化机会：须使用适应进化牌，选择力量 +1 或每轮普通行动 +1。";
      }
      return { level, strength, effect };
    });
  }
  const killers = [
    ["butcher", "屠夫", "Butcher", "base", 5, "以电锯、怒火和封锁追猎。", []],
    [
      "huntress",
      "女猎手",
      "Huntress",
      "feral-instincts",
      4,
      "布设套网、恐惧与伤害陷阱；踏入时触发，类型对幸存者隐藏。",
      ["set-trap"],
    ],
    [
      "werewolf",
      "狼人",
      "Werewolf",
      "feral-instincts",
      6,
      "敏锐听觉：循最近的已公布噪音移动并搜寻。",
      ["hyper-hearing"],
    ],
    [
      "strangler",
      "蔓缚者",
      "Strangler",
      "amorphous-peril",
      4,
      "铺设公开核心，沿核心传送并遥控藤蔓搜寻；幸存者可清除核心。",
      ["plant-core", "telesynthesis", "frenzy-vines"],
    ],
    [
      "unidentified",
      "不明体",
      "Unidentified",
      "amorphous-peril",
      3,
      "在等级2和4选择永久力量或速度进化。",
      ["evolve"],
    ],
    [
      "statues",
      "石像群",
      "Statues",
      "lethal-immortals",
      5,
      "四尊石像分布两出口，可切换主像；幸存者凝视独处石像可冻结。本数字版主像公开。",
      ["statue-switch", "statue-patrol"],
    ],
    [
      "queen",
      "不死女王",
      "Queen",
      "putrefied-enmity",
      2,
      "统率至多六只僵尸，同房合力攻击；幸存者持弩可驱散僵尸。",
      ["summon-zombie", "command-zombie", "corpse-poison"],
    ],
    [
      "orion",
      "猎户座",
      "Orion",
      "season-2-core",
      5,
      "标记区域猎物，使用矛枪在相邻房间发起相遇。",
      ["target-lock", "spear-gun"],
    ],
    [
      "eyebot",
      "魔眼机兵",
      "Eyebot",
      "season-2-core",
      4,
      "部署公开侦察机，再以它们为中心扫描区域。",
      ["deploy-drone", "drone-scan"],
    ],
    [
      "parasitoid",
      "寄生体",
      "Parasitoid",
      "season-2-core",
      4,
      "释放侵染云标记房间；下个追猎回合，云中的幸存者受恐惧并中毒。未实现阵营转化。",
      ["infestation-cloud"],
    ],
    [
      "doctor",
      "医生",
      "Doctor",
      "insanity-cure",
      3,
      "向邻近房间释放毒素；重复中毒会受伤，幸存者可用主行动解毒。",
      ["toxic-treatment"],
    ],
    [
      "nightmare",
      "梦魇",
      "Nightmare",
      "insanity-cure",
      3,
      "将区域内幸存者拖入梦魇状态；梦中相遇力量额外+4，可用主行动醒来。本版不含独立梦境地图。",
      ["drag-to-dream"],
    ],
    [
      "wendigo",
      "温迪戈",
      "Wendigo",
      "depraved-hunger",
      6,
      "饥饿换取补牌但污染牌库；冰冻房间会截断移动并禁止搜索修复，可用主行动除冰。",
      ["hunger", "frost-breath"],
    ],
    [
      "doll",
      "诡偶",
      "Doll",
      "fatal-funtime",
      2,
      "位置隐藏，混入空白恶作剧牌并窃取钥匙；幸存者搜到诡偶可夺回钥匙，累计四次则获胜。",
      ["prank", "steal-key", "sabotage"],
    ],
  ].map(
    ([
      id,
      name,
      englishName,
      expansion,
      startingStrength,
      ability,
      skillIds,
    ]) => {
      const startingDeck =
        id === "butcher"
          ? butcherStartingDeck
          : [...skillIds, ...skillIds, ...skillIds, ...commonExpansionCards];
      killerStartingDecks.set(id, startingDeck);
      return {
        id,
        name,
        englishName,
        expansion,
        startingStrength,
        startingRoom: id === "doll" ? null : "G5",
        ability,
        skillIds,
        startingDeckCounts: countCards(startingDeck),
        levels: killerLevels(id, startingStrength, ability),
        unlocks: id === "butcher" ? [{ level: 3, skillId: "brutal-rage" }] : [],
        progressionScope: "mansion-digital",
        adaptation: "mansion-digital",
      };
    },
  );
  const expansionSkillText = {
    "set-trap": ["设置陷阱", "选择自身或相邻房间放置陷阱。"],
    "hyper-hearing": ["敏锐听觉", "向最近已公布噪音移动一步并搜寻。"],
    "plant-core": ["播种核心", "在自身或相邻房间布置核心。"],
    telesynthesis: ["核心传送", "传送到任一核心所在房间。"],
    "frenzy-vines": ["狂乱藤蔓", "从一个核心房间发起遥控相遇。"],
    evolve: ["适应进化", "等级2和4分别解锁一次永久力量或速度。"],
    "statue-switch": ["主像转移", "切换到一尊未冻结的石像。"],
    "statue-patrol": ["石像巡逻", "移动一尊未冻结的石像。"],
    "summon-zombie": ["唤醒亡者", "在自身房间召唤一只僵尸，上限六只。"],
    "command-zombie": ["亡者指令", "移动一只僵尸，或从它所在房间搜寻。"],
    "corpse-poison": ["尸毒", "移除一只僵尸，使其房间与相邻房间的幸存者中毒。"],
    "target-lock": ["锁定猎物", "扫描一个区域并标记其中的猎物。"],
    "spear-gun": ["矛枪", "从相邻房间发动相遇；标记猎物使力量+1。"],
    "deploy-drone": ["部署侦察机", "在自身或相邻房间放置侦察机，上限三架。"],
    "drone-scan": ["监视网络", "扫描一架侦察机所在区域。"],
    "infestation-cloud": [
      "侵染云",
      "标记自身或相邻房间，下个追猎回合触发恐惧与中毒。",
    ],
    "toxic-treatment": [
      "毒性治疗",
      "使自身或相邻房间的幸存者中毒；重复中毒受伤。",
    ],
    "drag-to-dream": ["拖入梦境", "一个区域内的幸存者进入梦魇状态并获得恐惧。"],
    hunger: ["无尽饥饿", "补一张牌，但将一张无效饥饿牌加入弃牌。"],
    "frost-breath": ["冰霜吐息", "冻结自身或相邻房间。"],
    prank: ["恶作剧", "向发现牌堆混入一张空白恶作剧牌。"],
    "steal-key": ["窃取钥匙", "暂时偷走一把团队钥匙，最多持有两把。"],
    sabotage: ["破坏无线电", "在无线电房间降低一点尚未完成的修复进度。"],
    starvation: ["饥饿负担", "无可用效果，留在手牌或弃牌循环。"],
  };
  for (const [id, [name, description]] of Object.entries(expansionSkillText))
    skills.push({
      id,
      name,
      description: "豪宅数字适配：" + description,
      timing: id === "starvation" ? "burden" : "fast",
    });
  items.push({
    id: "doll-prank",
    name: "恶作剧空牌",
    description: "诡偶混入的空白发现牌，不提供物资。",
  });
  items.push({
    id: "crossbow",
    name: "弩",
    persistent: true,
    description:
      "女王对局起始物品。主行动：驱散自身或相邻指定房间中至多两只僵尸。",
  });
  const killerDefinition = (id) => killers.find((k) => k.id === id);
  const room = (id) => rooms.find((r) => r.id === id);
  const item = (id) => items.find((i) => i.id === id);
  const character = (id) => characters.find((c) => c.id === id);
  const skill = (id) => skills.find((c) => c.id === id);
  const neighbors = (id) =>
    edges.filter((e) => e.includes(id)).map((e) => (e[0] === id ? e[1] : e[0]));
  const edgeKey = (a, b) => [a, b].sort().join(":");
  const blocked = (s, a, b) =>
    s.blocks.some((e) => edgeKey(...e) === edgeKey(a, b));
  const isDoor = (a, b) =>
    !["G1:G2", "G2:G3", "G3:G5", "G4:G5"].includes(edgeKey(a, b));
  const owner = (s, id) => s.players.find((p) => p.id === id);
  const survivor = (s, id) => s.survivors.find((p) => p.id === id);
  const side = (s, id) => owner(s, id)?.side || "spectator";
  const owned = (s, id) => s.survivors.filter((p) => p.ownerId === id);
  const limit = (p) => (["johnson", "brenda"].includes(p.id) ? 4 : 3);
  const has = (p, id) => p.inventory.includes(id);
  function hash(seed) {
    let h = 2166136261;
    for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0 || 1;
  }
  function random(s, max) {
    let x = s.rngState;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    s.rngState = x >>> 0;
    return s.rngState % max;
  }
  function shuffle(s, list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = random(s, i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }
  function event(s, type, text, details = {}, audience = "public") {
    s.events.push({
      sequence: ++s.eventSequence,
      round: s.round,
      type,
      text,
      audience,
      ...details,
    });
    if (s.events.length > 180) s.events.shift();
  }
  function noise(s, id, immediate = false) {
    if (!s.noise.includes(id)) s.noise.push(id);
    if (immediate && !s.publicNoise.includes(id)) {
      s.publicNoise.push(id);
      event(s, "noise", `${id} 传出噪音。`, { roomId: id });
    }
  }
  function fear(s, p) {
    if (p.abilityState?.encouragement) {
      p.abilityState.encouragement = false;
      event(s, "encouragement-used", `${p.name} 的鼓励抵消了恐惧。`, {
        survivorId: p.id,
      });
      return;
    }
    if (p.fear === 2) noise(s, p.roomId, true);
    else p.fear++;
  }
  function damageSurvivor(s, p, amount = 1) {
    if (p.abilityState?.toughness && amount > 0) {
      p.abilityState.toughness = false;
      amount--;
      event(s, "toughness-used", `${p.name} 的坚韧抵消了一次伤害。`, {
        survivorId: p.id,
      });
    }
    p.health = Math.max(0, p.health - amount);
    if (p.health === 0) finish(s, "killer", "survivor-eliminated");
  }
  function consume(p, id) {
    const i = p.inventory.indexOf(id);
    if (i >= 0) p.inventory.splice(i, 1);
  }
  function finish(s, team, reason) {
    s.phase = "finished";
    s.currentSide = null;
    s.currentPlayerId = null;
    s.result = {
      winningTeam: team,
      winnerIds: s.players.filter((p) => p.side === team).map((p) => p.id),
      reason,
    };
    event(
      s,
      "game-finished",
      team === "survivors" ? "幸存者团队成功脱险。" : "追猎者赢得了这场猎杀。",
      { result: s.result },
    );
  }
  function setupExpansionKiller(s) {
    const k = s.killer,
      def = killerDefinition(s.options.killerId || "butcher");
    k.id = def.id;
    k.name = def.name;
    k.strength = def.startingStrength;
    if (def.id === "butcher") return;
    k.traps = [];
    k.cores = [];
    k.statues = [];
    k.zombies = [];
    k.drones = [];
    k.frozenRooms = [];
    k.clouds = [];
    k.evolutions = [];
    k.markedIds = [];
    k.stolenKeys = 0;
    k.catches = 0;
    if (k.id === "huntress")
      k.traps = [
        { roomId: "R2", type: "net" },
        { roomId: "B4", type: "skull" },
      ];
    if (k.id === "strangler") k.cores = ["G5"];
    if (k.id === "statues") {
      k.statues = ["G5", "G5", "R1", "R1"].map((roomId, i) => ({
        id: "statue-" + i,
        roomId,
        frozen: false,
      }));
      k.mainStatueId = "statue-0";
    }
    if (k.id === "queen") {
      k.zombies = [
        { id: "zombie-0", roomId: "G5" },
        { id: "zombie-1", roomId: "G5" },
      ];
      k.nextZombie = 2;
      s.survivors[0].inventory.push("crossbow");
    }
    if (k.id === "doll") {
      const places = rooms.filter((r) => r.id !== "R1");
      k.roomId = places[random(s, places.length)].id;
    }
    k.deck = shuffle(s, [...killerStartingDecks.get(def.id)]);
    // At least one character-specific card is available from the opening hand.
    const i = k.deck.findIndex((id) => def.skillIds.includes(id));
    if (i > 0) [k.deck[0], k.deck[i]] = [k.deck[i], k.deck[0]];
  }
  function killerStrength(s) {
    const k = s.killer,
      def = killerDefinition(k.id) || killerDefinition("butcher");
    return strengthAtLevel(
      def.startingStrength,
      k.level,
      (k.evolutions || []).filter((x) => x === "might").length,
    );
  }
  function poisonSurvivor(s, p) {
    if (p.poisoned) damageSurvivor(s, p);
    else p.poisoned = true;
  }
  function killerBeginRound(s) {
    for (const p of s.survivors) {
      delete p.snaredUntilRound;
      delete p.statueGazeRound;
    }
    for (const statue of s.killer.statues || []) statue.frozen = false;
  }
  function killerStartTurn(s) {
    const k = s.killer;
    k.actionsRemaining =
      2 + (k.evolutions || []).filter((x) => x === "speed").length;
    const clouds = (k.clouds || []).filter((c) => c.round < s.round);
    k.clouds = (k.clouds || []).filter((c) => c.round >= s.round);
    for (const cloud of clouds) {
      event(s, "cloud-triggered", `${cloud.roomId} 的侵染云爆发。`, {
        roomId: cloud.roomId,
      });
      for (const p of s.survivors.filter((p) => p.roomId === cloud.roomId)) {
        fear(s, p);
        poisonSurvivor(s, p);
        if (s.phase === "finished") return;
      }
    }
  }
  function moveSurvivorThroughHazards(s, p, path) {
    for (const id of path) {
      p.roomId = id;
      const trap = (s.killer.traps || []).find((t) => t.roomId === id);
      if (trap) {
        s.killer.traps = s.killer.traps.filter((t) => t !== trap);
        event(
          s,
          "trap-triggered",
          `${p.name} 踏入${{ net: "套网", bear: "捕兽", skull: "骷髅" }[trap.type]}陷阱。`,
          { survivorId: p.id, roomId: id, trapType: trap.type },
        );
        if (trap.type === "bear") damageSurvivor(s, p);
        if (trap.type === "skull") {
          fear(s, p);
          fear(s, p);
        }
        if (trap.type === "net") {
          p.snaredUntilRound = s.round;
          break;
        }
        if (s.phase === "finished") break;
      }
      if ((s.killer.frozenRooms || []).some((f) => f.roomId === id)) break;
    }
  }
  function encounterStrength(s, roomId) {
    const k = s.killer;
    let value = k.strength;
    if (k.id === "queen")
      value =
        k.strength *
        ((k.roomId === roomId ? 1 : 0) +
          (k.zombies || []).filter((z) => z.roomId === roomId).length);
    if (
      k.id === "orion" &&
      s.survivors.some(
        (p) => p.roomId === roomId && (k.markedIds || []).includes(p.id),
      )
    )
      value++;
    if (
      k.id === "nightmare" &&
      s.survivors.some((p) => p.roomId === roomId && p.dreaming)
    )
      value += 4;
    return value;
  }
  function extensionLegalActions(s, playerId, actions) {
    if (!s || s.phase === "finished" || !owner(s, playerId)) return actions;
    const k = s.killer,
      team = side(s, playerId),
      add = (a) => actions.push(a),
      near = [k.roomId, ...neighbors(k.roomId)];
    const activeStatue = (k.statues || []).find(
      (st) => st.id === k.mainStatueId,
    );
    if (team === "killer" && activeStatue?.frozen)
      actions = actions.filter(
        (a) =>
          !["killerMove", "killerSearch"].includes(a.type) &&
          !(
            a.type === "playSkill" && ["pursue", "chainsaw"].includes(a.skillId)
          ),
      );
    if (team === "survivors") {
      actions = actions.filter((a) => {
        const p = a.survivorId ? survivor(s, a.survivorId) : null;
        if (s.phase === "survivors" && p?.statueGazeRound === s.round)
          return false;
        if (
          p?.snaredUntilRound === s.round &&
          [
            "move",
            "sprint",
            "passage",
            "flee",
            "coinMove",
            "shortcut",
            "nurseRemedy",
          ].includes(a.type) &&
          !(a.type === "flee" && a.roomId === p.roomId)
        )
          return false;
        if (
          a.type === "guide" &&
          survivor(s, a.targetId)?.snaredUntilRound === s.round
        )
          return false;
        if (
          p &&
          ["search", "repair"].includes(a.type) &&
          (k.frozenRooms || []).some((f) => f.roomId === p.roomId)
        )
          return false;
        return true;
      });
      if (s.phase !== "survivors") return actions;
      for (const p of owned(s, playerId).filter((p) => !p.acted)) {
        const special = (type, label, extra = {}) =>
          add({
            type,
            survivorId: p.id,
            label: `${p.name}：${label}`,
            ...extra,
          });
        if ((k.cores || []).includes(p.roomId))
          special("clearCore", "清除一个蔓藤核心");
        if ((k.frozenRooms || []).some((f) => f.roomId === p.roomId))
          special("clearFrost", "清除一层冰霜");
        if (p.poisoned) special("cleansePoison", "解毒");
        if (p.dreaming) special("wakeUp", "从梦魇中醒来");
        if (k.id === "doll") special("catchDoll", "搜寻诡偶");
        if (p.inventory.includes("crossbow"))
          for (const z of k.zombies || [])
            if ([p.roomId, ...neighbors(p.roomId)].includes(z.roomId))
              special("shootZombie", "用弩驱散此处至多两只僵尸", {
                roomId: z.roomId,
              });
        const bodies = (k.statues || []).filter((st) => st.roomId === p.roomId);
        if (bodies.length === 1 && !bodies[0].frozen)
          special("freezeStatue", "凝视并冻结独处石像", {
            statueId: bodies[0].id,
          });
      }
      return actions;
    }
    if (s.phase !== "killer" || k.stage !== "fast") return actions;
    const use = (skillId, label, extra = {}) =>
      add({ type: "playSkill", skillId, label, ...extra });
    for (const id of new Set(k.hand)) {
      if (!expansionSkillText[id] || id === "starvation") continue;
      const label = expansionSkillText[id][0];
      if (id === "set-trap" && (k.traps || []).length < 4)
        for (const roomId of near.filter(
          (r) => !k.traps.some((t) => t.roomId === r),
        ))
          for (const trapType of ["net", "bear", "skull"])
            if (
              k.traps.filter((t) => t.type === trapType).length <
              (trapType === "net" ? 2 : 1)
            )
              use(
                id,
                `${label}：${room(roomId).name} / ${{ net: "套网", bear: "捕兽", skull: "骷髅" }[trapType]}`,
                { roomId, trapType },
              );
      if (id === "hyper-hearing" && s.publicNoise.length) {
        const distance = (from) => {
          const seen = new Set([from]),
            q = [[from, 0]];
          while (q.length) {
            const [at, n] = q.shift();
            if (s.publicNoise.includes(at)) return n;
            for (const to of neighbors(at))
              if (!seen.has(to)) {
                seen.add(to);
                q.push([to, n + 1]);
              }
          }
          return Infinity;
        };
        const n = distance(k.roomId);
        if (n === 0)
          use(id, "敏锐听觉：搜寻当前噪音房间", { roomId: k.roomId });
        else
          for (const roomId of neighbors(k.roomId))
            if (distance(roomId) === n - 1)
              use(id, `${label}：${room(roomId).name}`, { roomId });
      }
      if (id === "plant-core" && (k.cores || []).length < 5)
        for (const roomId of near)
          use(id, `${label}：${room(roomId).name}`, { roomId });
      if (["telesynthesis", "frenzy-vines"].includes(id))
        for (const roomId of new Set(k.cores || []))
          use(id, `${label}：${room(roomId).name}`, { roomId });
      if (
        id === "evolve" &&
        (k.evolutions || []).length < Math.min(2, Math.floor(k.level / 2))
      )
        for (const evolution of ["might", "speed"])
          use(
            id,
            `${label}：${evolution === "might" ? "力量 +1" : "每轮普通行动 +1"}`,
            { evolution },
          );
      if (["statue-switch", "statue-patrol"].includes(id))
        for (const st of k.statues || [])
          if (!st.frozen) {
            if (id === "statue-switch" && st.id !== k.mainStatueId)
              use(id, `${label}：${room(st.roomId).name} ${st.id}`, {
                statueId: st.id,
              });
            if (id === "statue-patrol")
              for (const roomId of neighbors(st.roomId))
                use(id, `${label}：${st.id} → ${room(roomId).name}`, {
                  statueId: st.id,
                  roomId,
                });
          }
      if (id === "summon-zombie" && (k.zombies || []).length < 6)
        use(id, label);
      if (id === "command-zombie")
        for (const z of k.zombies || []) {
          use(id, `${label}：${z.id} 搜寻${room(z.roomId).name}`, {
            zombieId: z.id,
            command: "search",
          });
          for (const roomId of neighbors(z.roomId))
            use(id, `${label}：${z.id} → ${room(roomId).name}`, {
              zombieId: z.id,
              command: "move",
              roomId,
            });
        }
      if (id === "corpse-poison")
        for (const z of k.zombies || [])
          use(id, `${label}：${room(z.roomId).name}`, { zombieId: z.id });
      if (["target-lock", "drag-to-dream"].includes(id))
        for (const zone of ["R", "B", "G"])
          use(id, `${label}：${zone}区`, { zone });
      if (id === "spear-gun")
        for (const roomId of neighbors(k.roomId))
          use(id, `${label}：${room(roomId).name}`, { roomId });
      if (id === "deploy-drone" && (k.drones || []).length < 3)
        for (const roomId of near.filter((r) => !k.drones.includes(r)))
          use(id, `${label}：${room(roomId).name}`, { roomId });
      if (id === "drone-scan")
        for (const roomId of k.drones || [])
          use(id, `${label}：${room(roomId).name}`, { roomId });
      if (["infestation-cloud", "toxic-treatment", "frost-breath"].includes(id))
        for (const roomId of near)
          use(id, `${label}：${room(roomId).name}`, { roomId });
      if (id === "hunger" && k.hand.length < 5 && k.hungerRound !== s.round)
        use(id, label);
      if (id === "prank" && s.discoverDeck.length < 40) use(id, label);
      if (id === "steal-key" && s.keys > 0 && (k.stolenKeys || 0) < 2)
        use(id, label);
      if (
        id === "sabotage" &&
        room(k.roomId).radio &&
        s.radio.rescueRemaining === null
      )
        use(id, label);
    }
    return actions;
  }
  function applyKillerExtension(s, a) {
    const k = s.killer,
      p = a.survivorId ? survivor(s, a.survivorId) : null;
    const types = [
      "clearCore",
      "clearFrost",
      "cleansePoison",
      "wakeUp",
      "catchDoll",
      "shootZombie",
      "freezeStatue",
    ];
    if (types.includes(a.type)) {
      p.acted = true;
      if (a.type === "clearCore") k.cores.splice(k.cores.indexOf(p.roomId), 1);
      if (a.type === "clearFrost") {
        const f = k.frozenRooms.find((f) => f.roomId === p.roomId);
        if (--f.count === 0)
          k.frozenRooms = k.frozenRooms.filter((x) => x !== f);
      }
      if (a.type === "cleansePoison") p.poisoned = false;
      if (a.type === "wakeUp") p.dreaming = false;
      if (a.type === "shootZombie") {
        let removed = 0;
        k.zombies = k.zombies.filter(
          (z) => z.roomId !== a.roomId || removed++ >= 2,
        );
      }
      if (a.type === "freezeStatue") {
        k.statues.find((st) => st.id === a.statueId).frozen = true;
        p.statueGazeRound = s.round;
      }
      if (a.type === "catchDoll") {
        const caught = p.roomId === k.roomId;
        if (caught) {
          s.keys += k.stolenKeys || 0;
          k.stolenKeys = 0;
          k.catches = (k.catches || 0) + 1;
        }
        event(
          s,
          "doll-searched",
          caught
            ? `${p.name} 找到了诡偶并夺回钥匙。`
            : `${p.name} 没有找到诡偶。`,
          { survivorId: p.id, caught, catches: k.catches || 0 },
          "survivors",
        );
        if (k.catches >= 4) finish(s, "survivors", "doll-captured");
      }
      if (a.type !== "catchDoll")
        event(
          s,
          "survivor-counter",
          a.label || "幸存者化解了一项威胁。",
          { survivorId: p.id, actionType: a.type },
          ["cleansePoison", "wakeUp"].includes(a.type) ? "survivors" : "public",
        );
      if (s.phase !== "finished") afterSurvivorAction(s);
      return true;
    }
    if (a.type !== "playSkill" || !expansionSkillText[a.skillId]) return false;
    consume({ inventory: k.hand }, a.skillId);
    k.discard.push(a.skillId);
    event(s, "skill-played", `${k.name} 使用${skill(a.skillId).name}。`, {
      skillId: a.skillId,
    });
    if (a.skillId === "set-trap")
      k.traps.push({ roomId: a.roomId, type: a.trapType });
    if (a.skillId === "hyper-hearing") {
      if (a.roomId !== k.roomId) doKillerMove(s, a.roomId);
      searchKiller(s);
    }
    if (a.skillId === "plant-core") k.cores.push(a.roomId);
    if (a.skillId === "telesynthesis") doKillerMove(s, a.roomId);
    if (a.skillId === "frenzy-vines") searchKiller(s, a.roomId);
    if (a.skillId === "evolve") {
      k.evolutions.push(a.evolution);
      k.strength = killerStrength(s);
      if (a.evolution === "speed") k.actionsRemaining++;
    }
    if (a.skillId === "statue-switch") {
      k.mainStatueId = a.statueId;
      k.roomId = k.statues.find((st) => st.id === a.statueId).roomId;
    }
    if (a.skillId === "statue-patrol") {
      const st = k.statues.find((st) => st.id === a.statueId);
      st.roomId = a.roomId;
      if (st.id === k.mainStatueId) k.roomId = a.roomId;
    }
    if (a.skillId === "summon-zombie")
      k.zombies.push({ id: "zombie-" + k.nextZombie++, roomId: k.roomId });
    if (a.skillId === "command-zombie") {
      const z = k.zombies.find((z) => z.id === a.zombieId);
      if (a.command === "move") z.roomId = a.roomId;
      else searchKiller(s, z.roomId);
    }
    if (a.skillId === "corpse-poison") {
      const z = k.zombies.find((z) => z.id === a.zombieId),
        area = [z.roomId, ...neighbors(z.roomId)];
      k.zombies = k.zombies.filter((x) => x !== z);
      for (const p of s.survivors.filter((p) => area.includes(p.roomId))) {
        poisonSurvivor(s, p);
        if (s.phase === "finished") break;
      }
    }
    if (["target-lock", "drone-scan", "drag-to-dream"].includes(a.skillId)) {
      const zone = a.zone || room(a.roomId).zone,
        targets = s.survivors.filter(
          (p) => p.id !== "anna" && room(p.roomId).zone === zone,
        );
      if (a.skillId === "target-lock") k.markedIds = targets.map((p) => p.id);
      if (a.skillId === "drag-to-dream")
        for (const p of targets) {
          p.dreaming = true;
          fear(s, p);
        }
      event(
        s,
        "sense-result",
        `${zone}区感知：${targets.map((p) => p.name).join("、") || "无人"}。`,
        { zone, survivorIds: targets.map((p) => p.id) },
      );
    }
    if (a.skillId === "spear-gun") searchKiller(s, a.roomId);
    if (a.skillId === "deploy-drone") k.drones.push(a.roomId);
    if (a.skillId === "infestation-cloud")
      k.clouds.push({ roomId: a.roomId, round: s.round });
    if (a.skillId === "toxic-treatment")
      for (const p of s.survivors.filter((p) => p.roomId === a.roomId)) {
        poisonSurvivor(s, p);
        if (s.phase === "finished") break;
      }
    if (a.skillId === "frost-breath") {
      const f = k.frozenRooms.find((f) => f.roomId === a.roomId);
      if (f) f.count++;
      else k.frozenRooms.push({ roomId: a.roomId, count: 1 });
    }
    if (a.skillId === "hunger") {
      k.hungerRound = s.round;
      k.discard.push("starvation");
      drawKiller(s, 1);
    }
    if (a.skillId === "prank")
      s.discoverDeck.splice(
        random(s, s.discoverDeck.length + 1),
        0,
        "doll-prank",
      );
    if (a.skillId === "steal-key") {
      s.keys--;
      k.stolenKeys++;
    }
    if (a.skillId === "sabotage")
      s.radio.progress = Math.max(0, s.radio.progress - 1);
    return true;
  }
  function getLegalActions(s, id) {
    return extensionLegalActions(s, id, getCoreLegalActions(s, id));
  }
  function validateOptions(options = {}) {
    demand(
      options && typeof options === "object" && !Array.isArray(options),
      "INVALID_OPTIONS",
      "游戏配置必须是对象。",
    );
    demand(
      Object.keys(options).every((k) =>
        ["killerPlayerId", "killerSeat", "survivorIds", "killerId"].includes(k),
      ),
      "INVALID_OPTIONS",
      "未知配置。随机种子不可作为公开房间配置。",
    );
    demand(
      options.killerPlayerId === undefined ||
        (typeof options.killerPlayerId === "string" &&
          options.killerPlayerId.length > 0),
      "INVALID_OPTIONS",
      "追猎席无效。",
    );
    demand(
      options.killerSeat === undefined ||
        ["first", "last"].includes(options.killerSeat),
      "INVALID_OPTIONS",
      "追猎席位置必须是 first 或 last。",
    );
    demand(
      options.killerId === undefined ||
        Boolean(killerDefinition(options.killerId)),
      "INVALID_OPTIONS",
      "未知追猎者。",
    );
    const ids = options.survivorIds || ["william", "anna", "marco"];
    demand(
      Array.isArray(ids) &&
        ids.length === 3 &&
        new Set(ids).size === 3 &&
        ids.every(character),
      "INVALID_OPTIONS",
      "必须选择三名不同的已收录幸存者。",
    );
    return {
      survivorIds: ids.slice(),
      ...(options.killerId && options.killerId !== "butcher"
        ? { killerId: options.killerId }
        : {}),
      ...(options.killerSeat === "first" ? { killerSeat: "first" } : {}),
      ...(options.killerPlayerId
        ? { killerPlayerId: options.killerPlayerId }
        : {}),
    };
  }
  function validatePlayerCount(players) {
    const n = Array.isArray(players) ? players.length : players;
    demand(
      Number.isInteger(n) && n >= 2 && n <= 4,
      "PLAYER_COUNT",
      "恶夜杀机支持 2–4 席。",
    );
    return true;
  }
  function createGame({ players, options = {}, seed } = {}) {
    validatePlayerCount(players);
    options = validateOptions(options);
    demand(
      Array.isArray(players) &&
        players.every(
          (p) =>
            p &&
            typeof p.id === "string" &&
            p.id.length &&
            typeof p.name === "string",
        ) &&
        new Set(players.map((p) => p.id)).size === players.length,
      "INVALID_PLAYERS",
      "玩家 ID 必须唯一且姓名有效。",
    );
    const killerId =
      options.killerPlayerId ||
      players[options.killerSeat === "first" ? 0 : players.length - 1].id;
    demand(
      players.some((p) => p.id === killerId),
      "INVALID_OPTIONS",
      "追猎席必须在玩家名单中。",
    );
    const survivorPlayers = players.filter((p) => p.id !== killerId);
    if (seed === undefined) seed = `${Date.now()}-${Math.random()}`;
    const s = {
      schemaVersion: 1,
      gameId: manifest.id,
      ruleset: manifest.ruleset,
      options: {
        survivorIds: options.survivorIds,
        killerPlayerId: killerId,
        ...(options.killerId ? { killerId: options.killerId } : {}),
        ...(options.killerSeat === "first" ? { killerSeat: "first" } : {}),
      },
      phase: "survivors",
      currentSide: "survivors",
      round: 1,
      turn: 1,
      currentPlayerId: null,
      rngState: hash(seed),
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        side: p.id === killerId ? "killer" : "survivors",
        survivorIds: [],
      })),
      survivors: [],
      killer: {
        id: "butcher",
        name: "屠夫",
        ownerId: killerId,
        roomId: "G5",
        level: 1,
        strength: 5,
        actionsRemaining: 2,
        stage: "fast",
        hand: [],
        deck: [],
        discard: [],
      },
      radio: { progress: 0, rescueRemaining: null, repairedRound: null },
      keys: 0,
      noise: [],
      publicNoise: [],
      blocks: [],
      events: [],
      eventSequence: 0,
      searchDeck: [],
      discoverDeck: [],
      itemDiscard: [],
      choice: null,
      encounter: null,
      flee: null,
      result: null,
    };
    s.survivors = options.survivorIds.map((id, i) => ({
      id,
      name: character(id).name,
      ownerId: survivorPlayers[i % survivorPlayers.length].id,
      roomId: "R1",
      health: 2,
      fear: 0,
      inventory: character(id).startingItems.slice(),
      acted: false,
      abilityState: id === "dylan" ? { toughness: true } : {},
    }));
    for (const p of s.players)
      p.survivorIds = s.survivors
        .filter((q) => q.ownerId === p.id)
        .map((q) => q.id);
    s.discoverDeck = shuffle(s, [
      "key",
      "key",
      "limestone",
      "limestone",
      "limestone",
      "whiskey",
      "whiskey",
      "energy-drink",
      "energy-drink",
      "flashlight",
      "first-aid",
      "first-aid",
      "amulet",
      "ammo",
      "revolver",
      "firecracker",
      "secret-map",
      "toolbox",
      "limestone",
      "whiskey",
      "ammo",
      "energy-drink",
      "first-aid",
      "flashlight",
    ]);
    s.searchDeck = shuffle(s, [
      "key",
      "key",
      "key",
      "key",
      "toolbox",
      "toolbox",
      "first-aid",
      "flashlight",
      "limestone",
      "ammo",
      "revolver",
      "whiskey",
      "secret-map",
    ]);
    s.searchDeck.push("key");
    s.killer.deck = shuffle(s, [...killerStartingDecks.get("butcher")]);
    setupExpansionKiller(s);
    drawKiller(s, 2);
    event(
      s,
      "game-started",
      s.killer.id === "doll"
        ? "三名幸存者进入主厅；诡偶已潜入宅邸。"
        : `三名幸存者进入主厅；${s.killer.name}从花园开始追猎。`,
    );
    refreshCurrent(s);
    return s;
  }
  function refreshCurrent(s) {
    if (s.phase === "finished") return;
    if (s.phase === "killer") s.currentPlayerId = s.killer.ownerId;
    else if (s.phase === "chooseItem")
      s.currentPlayerId = survivor(s, s.choice.survivorId).ownerId;
    else if (s.phase === "flee")
      s.currentPlayerId = survivor(s, s.flee.remainingIds[0]).ownerId;
    else if (s.phase === "encounter")
      s.currentPlayerId =
        s.encounter.stage === "attack"
          ? s.killer.ownerId
          : survivor(s, s.encounter.remainingIds[0]).ownerId;
    else
      s.currentPlayerId = (
        s.survivors.find((p) => !p.acted) || s.survivors[0]
      ).ownerId;
    s.currentSide =
      s.phase === "killer" ||
      (s.phase === "encounter" && s.encounter.stage === "attack")
        ? "killer"
        : "survivors";
  }
  function ensureButcherUnlock(s) {
    const k = s.killer;
    if ((k.id || "butcher") !== "butcher" || k.level < 3) return;
    const unlocked = k.unlockedSkills || (k.unlockedSkills = []);
    if (unlocked.includes("brutal-rage")) return;
    unlocked.push("brutal-rage");
    // Old games retain their deck order. An existing ultimate is marked rather
    // than recreated; older level-three saves receive it at their next draw.
    if ([...k.hand, ...k.deck, ...k.discard].includes("brutal-rage")) return;
    if (k.hand.length >= 5) {
      const displaced = k.hand.shift();
      k.discard.push(displaced);
      event(
        s,
        "unlock-overflow",
        "解锁技能时弃置最左侧旧手牌腾位。",
        { cardId: displaced },
        "killer",
      );
    }
    k.hand.push("brutal-rage");
    event(s, "skill-unlocked", "屠夫解锁蛮力狂暴并加入手牌。", {
      skillId: "brutal-rage",
      level: 3,
    });
  }
  function drawKiller(s, n, discardOnly = false) {
    ensureButcherUnlock(s);
    for (let i = 0; i < n; i++) {
      if (!s.killer.deck.length) {
        const previousLevel = s.killer.level;
        s.killer.level = Math.min(5, s.killer.level + 1);
        s.killer.strength = killerStrength(s);
        if (s.killer.level > previousLevel)
          event(
            s,
            "level-up",
            `${s.killer.name}升至 ${s.killer.level} 级，力量 ${s.killer.strength}。`,
          );
        ensureButcherUnlock(s);
        s.killer.deck = shuffle(s, s.killer.discard.splice(0));
        if (!s.killer.deck.length) break;
      }
      const card = s.killer.deck.shift();
      if (discardOnly || s.killer.hand.length >= 5) s.killer.discard.push(card);
      else s.killer.hand.push(card);
    }
  }
  function beginSurvivors(s) {
    killerBeginRound(s);
    s.round++;
    s.turn++;
    s.noise = [];
    s.publicNoise = [];
    s.phase = "survivors";
    s.encounter = null;
    s.flee = null;
    s.choice = null;
    s.survivors.forEach((p) => {
      p.acted = false;
      if (p.abilityState) p.abilityState.actionsTaken = [];
    });
    if (s.radio.rescueRemaining !== null) {
      s.radio.rescueRemaining--;
      event(s, "rescue-countdown", `救援还需 ${s.radio.rescueRemaining} 轮。`);
      if (s.radio.rescueRemaining === 0)
        return finish(s, "survivors", "rescue");
    }
    if (s.keys >= 5) {
      if (s.survivors.every((p) => p.roomId === "R1"))
        return finish(s, "survivors", "main-exit");
      if (
        s.survivors.every((p) => p.roomId === "G5") &&
        s.survivors.some((p) => has(p, "secret-map"))
      )
        return finish(s, "survivors", "hidden-exit");
    }
    event(s, "survivor-turn", `第 ${s.round} 轮：幸存者行动。`);
  }
  function endKiller(s) {
    delete s.killer.brutalRage;
    drawKiller(s, 3);
    beginSurvivors(s);
  }
  function beginKiller(s) {
    delete s.killer.brutalRage;
    s.publicNoise = s.noise.slice();
    event(
      s,
      "noise-report",
      s.publicNoise.length
        ? `噪音来自：${s.publicNoise.join("、")}。`
        : "这轮没有传出噪音。",
      { rooms: s.publicNoise.slice() },
    );
    s.phase = "killer";
    s.killer.actionsRemaining = 2;
    s.killer.stage = "fast";
    killerStartTurn(s);
    if (s.phase === "finished") return;
    s.turn++;
    event(s, "killer-turn", `${s.killer.name}开始行动。`);
  }
  function afterSurvivorAction(s) {
    if (s.phase !== "finished" && s.survivors.every((p) => p.acted))
      s.phase = "discover";
  }
  function takeItem(s, p, id) {
    if (id === "doll-prank") return;
    if (id === "key") {
      s.keys++;
      event(s, "key-found", `幸存者找到第 ${s.keys} 把钥匙。`, {
        keys: s.keys,
      });
    } else p.inventory.push(id);
  }
  function startChoice(s, p, cards, resume, returnUnchosen = false) {
    s.choice = {
      survivorId: p.id,
      cards,
      resume,
      stage: "select",
      ...(returnUnchosen ? { returnUnchosen: true } : {}),
    };
    s.phase = "chooseItem";
    if (!returnUnchosen)
      for (const id of cards) if (item(id).noise) noise(s, p.roomId);
    event(
      s,
      "items-found",
      `${p.name} 找到物资。`,
      { survivorId: p.id, cards },
      "survivors",
    );
  }
  function finishChoice(s) {
    const resume = s.choice.resume;
    s.choice = null;
    if (resume === "killer") beginKiller(s);
    else {
      s.phase = "survivors";
      afterSurvivorAction(s);
    }
  }
  function chooseItem(s, a) {
    const c = s.choice,
      p = survivor(s, c.survivorId);
    if (c.stage === "select") {
      const chosen = a.index < 0 ? null : c.cards[a.index];
      const unchosen = c.cards.filter((_, i) => i !== a.index);
      if (c.returnUnchosen) {
        s.searchDeck.unshift(...unchosen);
        if (chosen && item(chosen).noise) noise(s, p.roomId);
      } else s.itemDiscard.push(...unchosen);
      if (chosen && a.keep !== false) takeItem(s, p, chosen);
      else if (chosen) s.itemDiscard.push(chosen);
      if (p.inventory.length > limit(p)) {
        c.stage = "discard";
        c.cards = [];
        return;
      }
      finishChoice(s);
    } else {
      const [id] = p.inventory.splice(a.index, 1);
      s.itemDiscard.push(id);
      finishChoice(s);
    }
  }
  function doMove(s, p, path) {
    moveSurvivorThroughHazards(s, p, path);
    p.acted = true;
    event(
      s,
      "survivor-moved",
      `${p.name} 移动至 ${room(p.roomId).name}。`,
      { survivorId: p.id, path },
      "survivors",
    );
  }
  function doKillerMove(s, id) {
    const from = s.killer.roomId;
    if (s.killer.id === "queen")
      for (const z of s.killer.zombies || [])
        if (z.roomId === from) z.roomId = id;
    if (s.killer.id === "statues") {
      const st = (s.killer.statues || []).find(
        (st) => st.id === s.killer.mainStatueId,
      );
      if (st) st.roomId = id;
    }
    s.blocks = s.blocks.filter((e) => edgeKey(...e) !== edgeKey(from, id));
    s.killer.roomId = id;
    event(
      s,
      "killer-moved",
      `${s.killer.name}从 ${room(from).name} 移动至 ${room(id).name}。`,
      { from, roomId: id },
      s.killer.id === "doll" ? "killer" : "public",
    );
  }
  function brutalRagePaths(from) {
    const paths = [];
    for (const first of neighbors(from)) {
      paths.push([first]);
      for (const second of neighbors(first)) paths.push([first, second]);
    }
    return paths;
  }
  function resolveBrutalRageMove(s, path) {
    const k = s.killer;
    const before = s.blocks.length;
    for (const roomId of path) doKillerMove(s, roomId);
    k.brutalRage.segments++;
    const removedBlock = s.blocks.length < before;
    searchKiller(s);
    // Every encounter terminates the skill. Defending and fleeing use the
    // ordinary encounter flow; it already draws three cards and ends the turn.
    if (s.phase === "encounter" || s.phase === "finished") {
      delete k.brutalRage;
      k.stage = "regular";
      return;
    }
    if (!removedBlock) endKiller(s);
  }
  function searchKiller(s, location = s.killer.roomId) {
    const ids = s.survivors
      .filter((p) => p.roomId === location)
      .map((p) => p.id);
    event(
      s,
      "killer-searched",
      ids.length
        ? `${s.killer.name}发现了幸存者！`
        : `${room(location).name} 没有幸存者。`,
      { roomId: location, survivorIds: ids },
    );
    if (ids.length) {
      s.encounter = {
        roomId: location,
        remainingIds: ids,
        allIds: ids.slice(),
        strength: encounterStrength(s, location),
        stage: "attack",
      };
      s.phase = "encounter";
    }
  }
  function encounterToFlee(s) {
    s.flee = {
      roomId: s.encounter.roomId,
      remainingIds: s.encounter.allIds.slice(),
    };
    s.encounter = null;
    s.phase = "flee";
  }
  function defend(s, a) {
    const p = survivor(s, a.survivorId),
      enc = s.encounter;
    const dice = Array.from(
      { length: 4 - p.fear },
      () => [0, 0, 1, 1, 1, 3][random(s, 6)],
    );
    let defense =
      dice.reduce((x, y) => x + y, 0) +
      (p.id === "william" && !a.itemId ? 1 : 0);
    if (p.id === "victoria" && p.fear === 0) defense++;
    if (p.id === "roy" && ["hatchet", "longsword"].includes(a.itemId))
      defense += 2;
    if (a.encouragement && p.abilityState?.encouragement) {
      defense++;
      p.abilityState.encouragement = false;
    }
    if (a.itemId) {
      defense += item(a.itemId).defense;
      if (!item(a.itemId).persistent) {
        consume(p, a.itemId);
        s.itemDiscard.push(a.itemId);
      }
      if (a.ammo) {
        defense += 2;
        consume(p, "ammo");
        s.itemDiscard.push("ammo");
      }
    }
    const success = defense >= enc.strength;
    event(
      s,
      "defended",
      `${p.name} 防御 ${defense} / ${s.killer.name}力量 ${enc.strength}：${success ? "成功抵挡" : "受伤"}。`,
      {
        survivorId: p.id,
        dice,
        defense,
        strength: enc.strength,
        success,
        itemId: a.itemId || null,
      },
    );
    if (success) {
      drawKiller(s, 2, true);
      encounterToFlee(s);
      return;
    }
    damageSurvivor(s, p);
    if (p.health === 0) {
      finish(s, "killer", "survivor-eliminated");
      return;
    }
    enc.remainingIds = enc.remainingIds.filter((id) => id !== p.id);
    if (!enc.remainingIds.length) encounterToFlee(s);
    else {
      enc.stage = "attack";
      enc.strength = encounterStrength(s, enc.roomId);
    }
  }
  const primaryPowerTypes = new Set([
    "encourage",
    "remoteRepair",
    "remoteSearch",
    "guide",
    "bandage",
    "finishBandage",
    "craftGadget",
    "prepareRecording",
  ]);
  const ordinaryPrimaryTypes = new Set([
    "move",
    "sprint",
    "rest",
    "search",
    "repair",
    "unblock",
    "passage",
    "heal",
    "freezeStatue",
    "clearCore",
    "crossbow",
    "cleansePoison",
  ]);
  const extraPowerTypes = new Set([
    "observeKiller",
    "useNotes",
    "recycleToolbox",
    "luckyCoin",
    "coinMove",
    "shortcut",
    "speedRescue",
    "cooperBark",
    "nurseRemedy",
    "activateGadget",
  ]);
  const primaryKind = (type) => (type === "sprint" ? "move" : type);
  function withinRange(from, to, range) {
    let seen = new Set([from]),
      frontier = [from];
    for (let step = 0; step < range; step++) {
      frontier = frontier.flatMap(neighbors).filter((id) => !seen.has(id));
      frontier.forEach((id) => seen.add(id));
    }
    return seen.has(to);
  }
  function powerState(p) {
    return p.abilityState || (p.abilityState = {});
  }
  function increaseRemoteRepair(s, amount) {
    s.radio.progress = Math.min(5, s.radio.progress + amount);
    if (s.radio.progress === 5 && s.radio.rescueRemaining === null) {
      s.radio.rescueRemaining = 5;
      s.radio.repairedRound = s.round;
      event(s, "rescue-called", "幸存者呼叫救援：坚持五轮。");
    }
    event(
      s,
      "radio-repaired",
      `无线电修复进度 ${s.radio.progress}/5。`,
      { progress: s.radio.progress },
      "survivors",
    );
  }
  function survivorPowerActions(s, p) {
    const actions = [],
      add = (action) => actions.push({ survivorId: p.id, ...action });
    const power = p.abilityState || {},
      primary = s.phase === "survivors" && !p.acted;
    if (primary) {
      if (p.id === "ophelia")
        for (const q of s.survivors)
          if (q.fear || !q.abilityState?.encouragement)
            add({
              type: "encourage",
              targetId: q.id,
              label: `${p.name}：鼓励${q.name}`,
            });
      if (p.id === "george" && p.roomId === "R4" && has(p, "toolbox")) {
        if (s.radio.progress < 5)
          add({
            type: "remoteRepair",
            label: `${p.name}：书斋远程静默修复 +1（消耗工具箱）`,
          });
        if (s.searchDeck.length)
          add({
            type: "remoteSearch",
            label: `${p.name}：书斋远程搜寻（消耗工具箱）`,
          });
      }
      if (p.id === "roy")
        for (const q of s.survivors.filter((q) => q.id !== p.id))
          for (const roomId of neighbors(q.roomId).filter(
            (to) => !blocked(s, q.roomId, to),
          ))
            add({
              type: "guide",
              targetId: q.id,
              roomId,
              label: `${p.name}：引导${q.name}前往${room(roomId).name}（自己制造噪音）`,
            });
      if (p.id === "evelyn")
        for (const q of s.survivors.filter(
          (q) => q.roomId === p.roomId && q.health === 1,
        )) {
          if (power.bandageTargetId === q.id && power.bandageRound < s.round)
            add({
              type: "finishBandage",
              targetId: q.id,
              label: `${p.name}：完成${q.name}的无声包扎`,
            });
          else
            add({
              type: "bandage",
              targetId: q.id,
              label: `${p.name}：开始为${q.name}无声包扎（下轮完成）`,
            });
        }
      if (
        p.id === "victoria" &&
        p.roomId === "R4" &&
        !has(p, "experimental-gadget") &&
        p.inventory.length < limit(p)
      )
        add({ type: "craftGadget", label: `${p.name}：在书斋制作实验装置` });
      if (p.id === "hubert" && (power.recordingRound ?? -2) < s.round - 1)
        add({
          type: "prepareRecording",
          label: `${p.name}：心理预演，下轮可执行两种不同主行动`,
        });
    }
    if (
      p.id === "george" &&
      p.acted &&
      (s.killer.id === "doll" || withinRange(p.roomId, s.killer.roomId, 1)) &&
      power.observedRound !== s.round &&
      !has(p, "research-notes") &&
      p.inventory.length < limit(p)
    )
      add({
        type: "observeKiller",
        label: `${p.name}：观察近处追猎者，取得研究笔记`,
      });
    if (has(p, "research-notes") && s.radio.progress < 5)
      add({ type: "useNotes", label: `${p.name}：消耗研究笔记，静默修复 +1` });
    if (
      p.id === "dylan" &&
      p.roomId === "B4" &&
      p.inventory.length < limit(p) &&
      s.itemDiscard.includes("toolbox")
    )
      add({ type: "recycleToolbox", label: `${p.name}：从弃牌回收工具箱` });
    if (
      p.id === "caleb" &&
      has(p, "lucky-coin") &&
      power.coinRound !== s.round &&
      s.searchDeck.length
    )
      for (const q of s.survivors.filter(
        (q) => q.id === p.id || (q.roomId === p.roomId && q.health === 1),
      ))
        add({
          type: "luckyCoin",
          targetId: q.id,
          label: `${p.name}：幸运币（钥匙治疗${q.name}，否则获得额外移动）`,
        });
    if (power.coinMoveReady)
      for (const path of movementPaths(s, p))
        add({
          type: "coinMove",
          path,
          label: `${p.name}：幸运币额外移动至${room(path.at(-1)).name}`,
        });
    if (
      p.id === "quinto" &&
      room(p.roomId).passage &&
      power.shortcutRound !== s.round
    ) {
      const to = rooms.find(
        (r) => r.id !== p.roomId && r.passage === room(p.roomId).passage,
      ).id;
      add({
        type: "shortcut",
        roomId: to,
        label: `${p.name}：额外穿越密道至${room(to).name}`,
      });
    }
    if (
      p.id === "quinto" &&
      p.roomId === "B1" &&
      s.radio.progress === 5 &&
      s.radio.repairedRound === s.round &&
      s.radio.rescueRemaining > 1 &&
      !power.rescueSpeech
    )
      add({ type: "speedRescue", label: `${p.name}：专业求援，救援提早一轮` });
    if (p.id === "brenda" && power.barkRound !== s.round)
      for (const roomId of neighbors(p.roomId))
        add({
          type: "cooperBark",
          roomId,
          label: `${p.name}：库珀在${room(roomId).name}制造叫声诱饵`,
        });
    if (p.id === "evelyn" && has(p, "energy-drink"))
      for (const roomId of [
        p.roomId,
        ...neighbors(p.roomId).filter((to) => !blocked(s, p.roomId, to)),
      ])
        add({
          type: "nurseRemedy",
          roomId,
          label: `${p.name}：配药清除恐惧并移动至${room(roomId).name}`,
        });
    if (has(p, "experimental-gadget"))
      for (const q of s.survivors.filter(
        (q) => q.fear && withinRange(p.roomId, q.roomId, 1),
      ))
        add({
          type: "activateGadget",
          targetId: q.id,
          label: `${p.name}：实验装置安定${q.name}`,
        });
    return actions;
  }
  function applySurvivorPower(s, p, a) {
    if (!primaryPowerTypes.has(a.type) && !extraPowerTypes.has(a.type))
      return false;
    const power = powerState(p),
      q = a.targetId ? survivor(s, a.targetId) : null;
    const discard = (id) => {
      consume(p, id);
      s.itemDiscard.push(id);
    };
    if (primaryPowerTypes.has(a.type)) p.acted = true;
    switch (a.type) {
      case "encourage":
        q.fear = 0;
        powerState(q).encouragement = true;
        break;
      case "remoteRepair":
        discard("toolbox");
        increaseRemoteRepair(s, 1);
        break;
      case "remoteSearch":
        discard("toolbox");
        startChoice(s, p, [s.searchDeck.shift()], "survivors");
        break;
      case "guide":
        moveSurvivorThroughHazards(s, q, [a.roomId]);
        noise(s, p.roomId);
        break;
      case "bandage":
        power.bandageTargetId = q.id;
        power.bandageRound = s.round;
        break;
      case "finishBandage":
        q.health = 2;
        q.poisoned = false;
        delete power.bandageTargetId;
        delete power.bandageRound;
        break;
      case "craftGadget":
        p.inventory.push("experimental-gadget");
        break;
      case "prepareRecording":
        power.recordingRound = s.round;
        break;
      case "observeKiller":
        if (withinRange(p.roomId, s.killer.roomId, 1))
          p.inventory.push("research-notes");
        power.observedRound = s.round;
        break;
      case "useNotes":
        discard("research-notes");
        increaseRemoteRepair(s, 1);
        break;
      case "recycleToolbox":
        s.itemDiscard.splice(s.itemDiscard.indexOf("toolbox"), 1);
        p.inventory.push("toolbox");
        break;
      case "luckyCoin": {
        power.coinRound = s.round;
        const id = s.searchDeck.shift();
        s.itemDiscard.push(id);
        if (id === "key") {
          q.health = 2;
          q.poisoned = false;
        } else power.coinMoveReady = true;
        event(
          s,
          "lucky-coin",
          `${p.name} 的幸运币弃去${item(id).name}。`,
          { survivorId: p.id, cardId: id },
          "survivors",
        );
        break;
      }
      case "coinMove":
        moveSurvivorThroughHazards(s, p, a.path);
        power.coinMoveReady = false;
        break;
      case "shortcut":
        moveSurvivorThroughHazards(s, p, [a.roomId]);
        power.shortcutRound = s.round;
        break;
      case "speedRescue":
        s.radio.rescueRemaining--;
        power.rescueSpeech = true;
        event(
          s,
          "rescue-countdown",
          `无线电员使救援提早，尚需${s.radio.rescueRemaining}轮。`,
        );
        break;
      case "cooperBark":
        noise(s, a.roomId);
        power.barkRound = s.round;
        break;
      case "nurseRemedy":
        discard("energy-drink");
        p.fear = 0;
        if (a.roomId !== p.roomId) moveSurvivorThroughHazards(s, p, [a.roomId]);
        break;
      case "activateGadget":
        discard("experimental-gadget");
        q.fear = 0;
        break;
      default:
        return false;
    }
    event(
      s,
      "survivor-ability",
      `${p.name} 使用角色能力。`,
      {
        survivorId: p.id,
        ability: a.type,
        ...(a.roomId ? { roomId: a.roomId } : {}),
      },
      "survivors",
    );
    if (primaryPowerTypes.has(a.type) && s.phase !== "chooseItem")
      afterSurvivorAction(s);
    return true;
  }
  function finishSurvivorPrimary(s, p, a) {
    if (
      !p ||
      p.id !== "hubert" ||
      (!ordinaryPrimaryTypes.has(a.type) && !primaryPowerTypes.has(a.type))
    )
      return;
    const power = powerState(p);
    if (power.recordingRound !== s.round - 1) return;
    const taken = power.actionsTaken || (power.actionsTaken = []);
    taken.push(primaryKind(a.type));
    if (taken.length === 1) {
      p.acted = false;
      if (s.phase === "discover") s.phase = "survivors";
    }
  }
  function movementPaths(s, p, maxSteps = 2) {
    const result = [];
    const visit = (from, path) => {
      if (path.length === maxSteps) return;
      for (const to of neighbors(from)) {
        if (blocked(s, from, to)) continue;
        const next = [...path, to];
        result.push(next);
        visit(to, next);
      }
    };
    visit(p.roomId, []);
    return result;
  }
  function getCoreLegalActions(s, playerId) {
    if (
      !s ||
      s.gameId !== manifest.id ||
      s.phase === "finished" ||
      !owner(s, playerId)
    )
      return [];
    const actions = [],
      add = (a) => actions.push(a),
      team = side(s, playerId),
      k = s.killer;
    if (s.phase === "chooseItem") {
      const c = s.choice,
        p = survivor(s, c.survivorId);
      if (p.ownerId !== playerId) return [];
      if (c.stage === "discard")
        p.inventory.forEach((id, index) =>
          add({
            type: "chooseItem",
            index,
            label: `库存已满：丢弃${item(id).name}`,
          }),
        );
      else {
        c.cards.forEach((id, index) =>
          add({ type: "chooseItem", index, label: `保留${item(id).name}` }),
        );
        if (c.returnUnchosen)
          c.cards.forEach((id, index) =>
            add({
              type: "chooseItem",
              index,
              keep: false,
              label: `放回另一张，丢弃${item(id).name}`,
            }),
          );
        else add({ type: "chooseItem", index: -1, label: "全部丢弃" });
      }
      return actions;
    }
    if (s.phase === "encounter") {
      const e = s.encounter;
      if (e.stage === "attack") {
        if (team !== "killer") return [];
        add({ type: "attack", label: "发动攻击" });
        if (k.hand.includes("rage"))
          add({
            type: "playSkill",
            skillId: "rage",
            label: "残暴怒火：本次攻击力量 +2",
          });
        return actions;
      }
      if (team !== "survivors") return [];
      for (const id of e.remainingIds) {
        const p = survivor(s, id);
        if (p.ownerId !== playerId) continue;
        add({ type: "defend", survivorId: id, label: `${p.name}：直接防御` });
        for (const it of new Set(p.inventory))
          if (item(it).defense) {
            add({
              type: "defend",
              survivorId: id,
              itemId: it,
              label: `${p.name}：使用${item(it).name}防御`,
            });
            if (it === "revolver" && has(p, "ammo"))
              add({
                type: "defend",
                survivorId: id,
                itemId: it,
                ammo: true,
                label: `${p.name}：左轮手枪 + 弹药包`,
              });
          }
      }
      actions.push(
        ...actions
          .filter((a) => survivor(s, a.survivorId)?.abilityState?.encouragement)
          .map((a) => ({
            ...a,
            encouragement: true,
            label: `${a.label}，消耗鼓励 +1`,
          })),
      );
      return actions;
    }
    if (s.phase === "flee") {
      const p = survivor(s, s.flee.remainingIds[0]);
      if (p.ownerId !== playerId) return [];
      for (const id of [
        p.roomId,
        ...neighbors(p.roomId).filter((id) => !blocked(s, p.roomId, id)),
      ])
        add({
          type: "flee",
          survivorId: p.id,
          roomId: id,
          label: `${p.name}：${id === p.roomId ? "留在原地" : `撤离至${room(id).name}`}`,
        });
      return actions;
    }
    if (s.phase === "discover" && team === "survivors")
      for (const p of owned(s, playerId))
        add({
          type: "discover",
          survivorId: p.id,
          label: `${p.name}：为团队发现物资`,
        });
    if (["survivors", "discover"].includes(s.phase) && team === "survivors") {
      for (const p of owned(s, playerId)) {
        if (s.phase === "survivors" && !p.acted) {
          for (const path of movementPaths(s, p))
            add({
              type: "move",
              survivorId: p.id,
              path,
              label: `${p.name}：移动 ${path.map((id) => room(id).name).join(" → ")}`,
            });
          if (p.id === "william")
            for (const path of movementPaths(s, p, 3))
              add({
                type: "sprint",
                survivorId: p.id,
                path,
                label: `${p.name}：冲刺 ${path.map((id) => room(id).name).join(" → ")}（目的地噪音）`,
              });
          add({
            type: "rest",
            survivorId: p.id,
            label: `${p.name}：休整，清除恐惧`,
          });
          if (
            (["statues", "doll"].includes(k.id) || p.roomId !== k.roomId) &&
            (room(p.roomId).search ||
              (p.id === "caleb" && p.roomId === "G2")) &&
            s.searchDeck.length
          )
            add({
              type: "search",
              survivorId: p.id,
              label: `${p.name}：搜寻物资`,
            });
          if (
            (["statues", "doll"].includes(k.id) || p.roomId !== k.roomId) &&
            room(p.roomId).radio &&
            s.radio.progress < 5 &&
            s.radio.repairedRound !== s.round
          ) {
            add({
              type: "repair",
              survivorId: p.id,
              label: `${p.name}：${p.id === "zach" && has(p, "wrench") ? "无声" : ""}修复无线电 +${p.id === "zach" && k.level >= 3 ? 2 : 1}`,
            });
            if (has(p, "toolbox"))
              add({
                type: "repair",
                survivorId: p.id,
                itemId: "toolbox",
                label: `${p.name}：工具箱修复 +${p.id === "johnson" ? 3 : 2}`,
              });
          }
          for (const e of s.blocks.filter((e) => e.includes(p.roomId)))
            add({
              type: "unblock",
              survivorId: p.id,
              roomId: e.find((id) => id !== p.roomId),
              label: `${p.name}：移除通往${room(e.find((id) => id !== p.roomId)).name}的封锁`,
            });
          if (
            room(p.roomId).passage &&
            (["sophia", "quinto"].includes(p.id) || has(p, "flashlight"))
          )
            add({
              type: "passage",
              survivorId: p.id,
              roomId: rooms.find(
                (r) =>
                  r.id !== p.roomId && r.passage === room(p.roomId).passage,
              ).id,
              label: `${p.name}：穿越秘密通道`,
            });
          for (const medicine of ["first-aid", "medical-kit"].filter((id) =>
            has(p, id),
          ))
            for (const q of s.survivors.filter(
              (q) => q.roomId === p.roomId && q.health === 1,
            ))
              add({
                type: "heal",
                survivorId: p.id,
                itemId: medicine,
                targetId: q.id,
                label: `${p.name}：用${item(medicine).name}治疗${q.name}`,
              });
        }
        if (has(p, "whiskey"))
          for (const id of p.id === "hubert"
            ? rooms
                .filter(
                  (r) => r.id !== p.roomId && withinRange(p.roomId, r.id, 2),
                )
                .map((r) => r.id)
            : neighbors(p.roomId))
            add({
              type: "useItem",
              survivorId: p.id,
              itemId: "whiskey",
              roomId: id,
              label: `${p.name}：将威士忌瓶扔向${room(id).name}`,
            });
        for (const id of ["firecracker", "energy-drink"])
          if (has(p, id))
            add({
              type: "useItem",
              survivorId: p.id,
              itemId: id,
              label: `${p.name}：使用${item(id).name}`,
            });
        for (const q of s.survivors.filter(
          (q) =>
            q.id !== p.id &&
            q.roomId === p.roomId &&
            q.inventory.length < limit(q),
        ))
          for (const id of new Set(p.inventory))
            add({
              type: "giveItem",
              survivorId: p.id,
              targetId: q.id,
              itemId: id,
              label: `${p.name}：将${item(id).name}交给${q.name}`,
            });
      }
      for (const p of owned(s, playerId))
        actions.push(...survivorPowerActions(s, p));
      return actions.filter((a) => {
        const p = a.survivorId ? survivor(s, a.survivorId) : null;
        return !(
          p?.id === "hubert" &&
          p.abilityState?.recordingRound === s.round - 1 &&
          (ordinaryPrimaryTypes.has(a.type) || primaryPowerTypes.has(a.type)) &&
          (p.abilityState.actionsTaken || []).includes(primaryKind(a.type))
        );
      });
    }
    if (s.phase === "killer" && team === "killer") {
      if (k.brutalRage) {
        for (const path of brutalRagePaths(k.roomId))
          add({
            type: "brutalRageMove",
            path,
            label: `蛮力狂暴：${path.map((id) => room(id).name).join(" → ")}，随后搜寻`,
          });
        add({ type: "endBrutalRage", label: "结束蛮力狂暴与本轮追猎" });
        return actions;
      }
      if (k.actionsRemaining > 0) {
        for (const id of neighbors(k.roomId))
          add({
            type: "killerMove",
            roomId: id,
            label: `移动至${room(id).name}`,
          });
        add({ type: "killerSearch", label: "搜寻当前房间" });
      }
      add({ type: "endTurn", label: "结束追猎回合" });
      for (const id of new Set(k.hand)) {
        const def = skill(id);
        if (
          id === "brutal-rage" &&
          k.id === "butcher" &&
          k.level >= 3 &&
          k.actionsRemaining === 2
        )
          add({
            type: "playSkill",
            skillId: id,
            label: "蛮力狂暴：连续破门移动并搜寻",
          });
        if (def.timing === "fast" && k.stage === "fast") {
          if (id === "sense")
            for (const zone of ["R", "B", "G"])
              add({
                type: "playSkill",
                skillId: id,
                zone,
                label: `感知${{ R: "红", B: "蓝", G: "绿" }[zone]}色区域`,
              });
          if (id === "pursue")
            for (const rid of neighbors(k.roomId))
              add({
                type: "playSkill",
                skillId: id,
                roomId: rid,
                label: `追击至${room(rid).name}`,
              });
          if (id === "terror")
            add({
              type: "playSkill",
              skillId: id,
              label: "惊吓：当前房间恐惧 +1",
            });
        }
        if (id === "chainsaw" && k.actionsRemaining === 2)
          add({
            type: "playSkill",
            skillId: id,
            label: "电锯轰鸣：恐惧相邻目标并搜寻",
          });
        if (
          id === "barricade" &&
          k.actionsRemaining === 0 &&
          k.stage !== "slow"
        )
          for (const rid of neighbors(k.roomId))
            if (
              isDoor(k.roomId, rid) &&
              !blocked(s, k.roomId, rid) &&
              s.blocks.length < 7
            )
              add({
                type: "playSkill",
                skillId: id,
                roomId: rid,
                label: `封锁通往${room(rid).name}的门`,
              });
      }
    }
    return actions;
  }
  function signature(a) {
    return JSON.stringify(
      Object.keys(a)
        .filter((k) => k !== "label")
        .sort()
        .map((k) => [k, a[k]]),
    );
  }
  function applyAction(state, playerId, action) {
    demand(
      state &&
        state.gameId === manifest.id &&
        state.ruleset === manifest.ruleset,
      "INVALID_STATE",
      "游戏存档不兼容。",
    );
    demand(
      action && typeof action === "object" && !Array.isArray(action),
      "INVALID_ACTION",
      "行动必须是对象。",
    );
    demand(state.phase !== "finished", "GAME_FINISHED", "游戏已结束。");
    demand(owner(state, playerId), "NOT_A_PLAYER", "你不在本局中。");
    const legal = getLegalActions(state, playerId).find(
      (a) => signature(a) === signature(action),
    );
    demand(legal, "ILLEGAL_ACTION", "此行动不符合当前阶段、席位或资源条件。");
    const s = clone(state),
      a = clone(legal),
      p = a.survivorId ? survivor(s, a.survivorId) : null,
      k = s.killer;
    delete a.label;
    if (applyKillerExtension(s, a)) {
      /* Fully resolved above. */
    } else if (p && applySurvivorPower(s, p, a)) {
      /* Character ability resolved above. */
    } else if (a.type === "chooseItem") chooseItem(s, a);
    else if (a.type === "move" || a.type === "sprint") {
      doMove(s, p, a.path);
      if (a.type === "sprint") noise(s, p.roomId);
      afterSurvivorAction(s);
    } else if (a.type === "rest") {
      p.fear = 0;
      p.acted = true;
      event(s, "rested", `${p.name} 休整。`, { survivorId: p.id }, "survivors");
      afterSurvivorAction(s);
    } else if (a.type === "search") {
      p.acted = true;
      startChoice(
        s,
        p,
        s.searchDeck.splice(0, p.id === "ophelia" ? 2 : 1),
        "survivors",
        p.id === "ophelia",
      );
    } else if (a.type === "repair") {
      p.acted = true;
      let n = p.id === "zach" && k.level >= 3 ? 2 : 1;
      if (a.itemId) {
        n = p.id === "johnson" ? 3 : 2;
        consume(p, "toolbox");
        s.itemDiscard.push("toolbox");
      }
      s.radio.progress = Math.min(5, s.radio.progress + n);
      s.radio.repairedRound = s.round;
      if (!(p.id === "zach" && has(p, "wrench"))) noise(s, p.roomId);
      event(
        s,
        "radio-repaired",
        `无线电修复进度 ${s.radio.progress}/5。`,
        { progress: s.radio.progress },
        "survivors",
      );
      if (s.radio.progress === 5) {
        s.radio.rescueRemaining = 5;
        event(s, "rescue-called", "幸存者呼叫救援：坚持五轮。");
      }
      afterSurvivorAction(s);
    } else if (a.type === "unblock") {
      p.acted = true;
      s.blocks = s.blocks.filter(
        (e) => edgeKey(...e) !== edgeKey(p.roomId, a.roomId),
      );
      event(
        s,
        "door-unblocked",
        `${p.roomId} 与 ${a.roomId} 之间的封锁被移除。`,
        { rooms: [p.roomId, a.roomId] },
      );
      afterSurvivorAction(s);
    } else if (a.type === "passage") {
      doMove(s, p, [a.roomId]);
      afterSurvivorAction(s);
    } else if (a.type === "heal") {
      p.acted = true;
      consume(p, a.itemId);
      s.itemDiscard.push(a.itemId);
      survivor(s, a.targetId).health = 2;
      survivor(s, a.targetId).poisoned = false;
      if (a.itemId === "medical-kit") survivor(s, a.targetId).fear = 0;
      event(s, "healed", "一名幸存者的伤势已被治疗。", {
        survivorId: a.targetId,
      });
      afterSurvivorAction(s);
    } else if (a.type === "giveItem") {
      consume(p, a.itemId);
      survivor(s, a.targetId).inventory.push(a.itemId);
      event(s, "item-given", `${p.name} 交接物资。`, a, "survivors");
    } else if (a.type === "useItem") {
      consume(p, a.itemId);
      s.itemDiscard.push(a.itemId);
      if (a.itemId === "whiskey") noise(s, a.roomId);
      if (a.itemId === "firecracker") rooms.forEach((r) => noise(s, r.id));
      if (a.itemId === "energy-drink") p.fear = 0;
      event(
        s,
        "item-used",
        `${p.name} 使用${item(a.itemId).name}。`,
        a,
        "survivors",
      );
    } else if (a.type === "discover") {
      if (!s.discoverDeck.length) {
        if (s.radio.rescueRemaining === null)
          finish(s, "killer", "discover-deck-exhausted");
        else beginKiller(s);
      } else startChoice(s, p, s.discoverDeck.splice(0, 2), "killer");
    } else if (a.type === "brutalRageMove") {
      resolveBrutalRageMove(s, a.path);
    } else if (a.type === "endBrutalRage") endKiller(s);
    else if (a.type === "killerMove") {
      k.stage = "regular";
      k.actionsRemaining--;
      doKillerMove(s, a.roomId);
    } else if (a.type === "killerSearch") {
      k.stage = "regular";
      k.actionsRemaining--;
      searchKiller(s);
    } else if (a.type === "endTurn") endKiller(s);
    else if (a.type === "playSkill") {
      consume({ inventory: k.hand }, a.skillId);
      k.discard.push(a.skillId);
      event(
        s,
        "skill-played",
        `${s.killer.name}使用${skill(a.skillId).name}。`,
        {
          skillId: a.skillId,
        },
      );
      if (a.skillId === "sense") {
        const ids = s.survivors
          .filter((p) => p.id !== "anna" && room(p.roomId).zone === a.zone)
          .map((p) => p.id);
        event(
          s,
          "sense-result",
          `${a.zone} 区感知到：${ids.map((id) => survivor(s, id).name).join("、") || "无人"}。`,
          { zone: a.zone, survivorIds: ids },
        );
      }
      if (a.skillId === "pursue") doKillerMove(s, a.roomId);
      if (a.skillId === "terror")
        s.survivors
          .filter((p) => p.roomId === k.roomId)
          .forEach((p) => fear(s, p));
      if (a.skillId === "chainsaw") {
        k.stage = "regular";
        k.actionsRemaining = 0;
        s.survivors
          .filter((p) => [k.roomId, ...neighbors(k.roomId)].includes(p.roomId))
          .forEach((p) => fear(s, p));
        searchKiller(s);
      }
      if (a.skillId === "brutal-rage") {
        k.actionsRemaining = 0;
        k.stage = "brutal-rage";
        k.brutalRage = { segments: 0 };
      }
      if (a.skillId === "barricade") {
        s.blocks.push([k.roomId, a.roomId]);
        k.stage = "slow";
        event(s, "door-blocked", `${k.roomId} 与 ${a.roomId} 之间被封锁。`, {
          rooms: [k.roomId, a.roomId],
        });
      }
      if (a.skillId === "rage") {
        s.encounter.strength += 2;
        s.encounter.stage = "defend";
      }
    } else if (a.type === "attack") s.encounter.stage = "defend";
    else if (a.type === "defend") defend(s, a);
    else if (a.type === "flee") {
      moveSurvivorThroughHazards(s, p, [a.roomId]);
      s.flee.remainingIds.shift();
      event(
        s,
        "survivor-fled",
        `${p.name} 完成撤离选择。`,
        { survivorId: p.id, roomId: p.roomId },
        "survivors",
      );
      if (s.phase !== "finished" && !s.flee.remainingIds.length) endKiller(s);
    }
    finishSurvivorPrimary(s, p, a);
    refreshCurrent(s);
    return s;
  }
  function getView(s, viewerId) {
    const viewerSide = side(s, viewerId),
      finished = s.phase === "finished",
      friendly = viewerSide === "survivors" || finished;
    const k = {
      id: s.killer.id,
      name: s.killer.name,
      englishName: killerDefinition(s.killer.id)?.englishName,
      ability: killerDefinition(s.killer.id)?.ability,
      expansion: killerDefinition(s.killer.id)?.expansion,
      adaptation: "mansion-digital",
      ownerId: s.killer.ownerId,
      roomId:
        s.killer.id === "doll" && viewerSide !== "killer" && !finished
          ? null
          : s.killer.roomId,
      level: s.killer.level,
      strength: s.killer.strength,
      actionsRemaining: s.killer.actionsRemaining,
      stage: s.killer.stage,
      brutalRage: s.killer.brutalRage || null,
      traps: (s.killer.traps || []).map((t) => ({
        roomId: t.roomId,
        type: viewerSide === "killer" || finished ? t.type : null,
      })),
      cores: s.killer.cores || [],
      statues: s.killer.statues || [],
      mainStatueId: s.killer.mainStatueId || null,
      zombies: s.killer.zombies || [],
      drones: s.killer.drones || [],
      clouds: s.killer.clouds || [],
      frozenRooms: s.killer.frozenRooms || [],
      evolutions: s.killer.evolutions || [],
      stolenKeys: s.killer.stolenKeys || 0,
      catches: s.killer.catches || 0,
    };
    if (viewerSide === "killer" || finished) {
      k.hand = s.killer.hand.slice();
      k.deckCount = s.killer.deck.length;
      k.deckCounts = countCards(s.killer.deck);
      k.unlockedSkills = (s.killer.unlockedSkills || []).slice();
      k.discard = s.killer.discard.slice();
    }
    const view = {
      schemaVersion: s.schemaVersion,
      gameId: s.gameId,
      ruleset: s.ruleset,
      options: s.options,
      phase: s.phase,
      round: s.round,
      turn: s.turn,
      currentSide: s.currentSide,
      currentPlayerId: s.currentPlayerId,
      viewerSide,
      players: s.players,
      survivors: s.survivors.map((p) => ({
        id: p.id,
        name: p.name,
        ownerId: p.ownerId,
        roomId: friendly ? p.roomId : null,
        health: p.health,
        fear: p.fear,
        inventory: friendly ? p.inventory : null,
        inventoryLimit: limit(p),
        abilityState: friendly ? p.abilityState || {} : null,
        acted: friendly ? p.acted : null,
        poisoned: Boolean(p.poisoned),
        dreaming: Boolean(p.dreaming),
        snared: p.snaredUntilRound === s.round,
      })),
      killer: k,
      radio: {
        progress: friendly ? s.radio.progress : null,
        rescueRemaining: s.radio.rescueRemaining,
        repairedRound: friendly ? s.radio.repairedRound : null,
      },
      keys: s.keys,
      noise: friendly ? s.noise : s.publicNoise,
      blocks: s.blocks,
      discoverDeckCount: friendly ? s.discoverDeck.length : null,
      searchDeckCount: friendly ? s.searchDeck.length : null,
      itemDiscard: friendly ? s.itemDiscard : null,
      encounter: s.encounter
        ? {
            roomId: s.encounter.roomId,
            remainingIds: s.encounter.remainingIds,
            allIds: s.encounter.allIds,
            stage: s.encounter.stage,
            strength: s.encounter.strength,
          }
        : null,
      flee: s.flee
        ? { remainingIds: s.flee.remainingIds, roomId: s.flee.roomId }
        : null,
      choice:
        s.choice && friendly
          ? {
              survivorId: s.choice.survivorId,
              cards: s.choice.cards,
              stage: s.choice.stage,
              returnUnchosen: Boolean(s.choice.returnUnchosen),
            }
          : null,
      events: s.events
        .filter(
          (e) =>
            e.audience === "public" || e.audience === viewerSide || finished,
        )
        .map((e) => {
          const c = { ...e };
          delete c.audience;
          return c;
        }),
      legalActions: getLegalActions(s, viewerId),
      result: s.result,
    };
    return clone(view);
  }
  function getCatalog() {
    return clone({
      manifest,
      rooms,
      edges,
      characters,
      items,
      skills,
      killers,
      phases: [
        "survivors",
        "discover",
        "chooseItem",
        "killer",
        "encounter",
        "flee",
        "finished",
      ],
      expansions: [],
    });
  }
  return {
    manifest,
    validateOptions,
    validatePlayerCount,
    minPlayersForOptions: () => 2,
    rulesetForOptions: () => manifest.ruleset,
    createGame,
    applyAction,
    getLegalActions,
    getView,
    getCatalog,
  };
});
