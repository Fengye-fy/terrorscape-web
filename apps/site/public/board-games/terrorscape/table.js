(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const paths = {
    die: 'M12 2 21 7v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M8.5 5.2l3.5 2 3.5-2',
    board: 'M3 4h18v16H3zM3 10h18M10 10v10',
    book: 'M3 4q5-1 9 2 4-3 9-2v14q-5-1-9 2-4-3-9-2zM12 6v14',
    log: 'M5 3h13v16H7a2 2 0 0 1-2-2zM9 7h6M9 10h6M9 13h4M8 21h12V6',
    volume: 'M3 9h4l5-4v14l-5-4H3zM15 9q3 3 0 6M17.5 6q6 6 0 12',
    mute: 'M3 9h4l5-4v14l-5-4H3zM16 9l5 6m0-6-5 6',
    restart: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
    team: 'M3 20v-2a5 5 0 0 1 10 0v2M12 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm3-3a4 4 0 0 1 0 8m1 3a5 5 0 0 1 5 5v1',
    house: 'm2 11 10-8 10 8M5 9v12h14V9M10 21v-7h4v7',
    moon: 'M19.8 15.2A8.6 8.6 0 0 1 9 4.2 8.7 8.7 0 1 0 19.8 15.2z',
    map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16',
    layers: 'm12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5',
    expand: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
    key: 'M15 3a5 5 0 1 1-3.5 8.6L4 19l-1 2h4v-3h3v-3l2.2-2.2M16.5 6.5h.01',
    radio: 'M4 9h16v12H4zM6 9l11-6M7 13h10M14 17h3M7.5 17h1',
    footprint: 'M8.2 14.2c-3.4 0-4.1-3.8-2.9-7.2C6.3 4.2 9 4 10 6.4c1.2 3.3.6 7.8-1.8 7.8zM5 16.3l4.4.6-.5 2.3a2.1 2.1 0 0 1-4.2-.8zM15 10c-1.3-3.1-1-6.2 1-7.1 2.1-1 4.5 1.7 4.3 5.4-.2 2.6-3.9 4.3-5.3 1.7zM15.8 13.5l4.2-.8.5 2.3a2 2 0 0 1-3.9 1.2z',
    search: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0zm-2 4 7 7',
    rest: 'M3 13h4l2-6 4 11 2-7 2 2h4',
    bag: 'M5 8h14l1 13H4zM8 9V7a4 4 0 0 1 8 0v2M7 14h10',
    signal: 'M3 11v2m4-5v8m5-12v16m5-12v8m4-5v2',
    target: 'M20 12a8 8 0 1 1-8-8m0 8 9-9m-5 0h5v5M15 12a3 3 0 1 1-3-3',
    arrow: 'M4 12h15m-6-6 6 6-6 6',
    upRight: 'M6 18 18 6M7 6h11v11',
    chevron: 'm9 5 7 7-7 7',
    back: 'm14 5-7 7 7 7',
    close: 'm5 5 14 14M19 5 5 19',
    heart: 'M20 5q-4-4-8 1-4-5-8-1-4 4 1 9l7 7 7-7q5-5 1-9z',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    badge: 'M12 2 4 5v6c0 5 4 9 8 11 4-2 8-6 8-11V5zM8.5 11.5l2.5 2.5 4.5-5',
    pin: 'M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0zm-5 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
    check: 'm4 12 5 5L20 6',
    bulb: 'M8 15c0-2-3-3.5-3-7a7 7 0 0 1 14 0c0 3.5-3 5-3 7l-1 2H9zM9 20h6M11 23h2',
    skull: 'M8 18H6v-4a7 7 0 1 1 12 0v4h-2v3H8zm-1-7h2m6 0h2m-6 4 1-2 1 2',
    flag: 'M5 22V3m0 1q4-3 8 0 3 2 7-1v10q-4 3-8 0-3-2-7 0',
    compass: 'm3 21 5-13 13-5-5 13zM8 8l8 8',
    info: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 11v5m0-9h.01',
    flash: 'm14 2-11 12h8l-1 8 11-13h-8z'
  };
  const names = { william: '威廉', anna: '安娜', marco: '马可', johnson: '约翰逊', sophia: '索菲娅', butcher: '屠夫' };
  const reasons = { 'main-exit': '五把钥匙打开了主厅的大门。', 'hidden-exit': '秘密地图指向了花园的出口。', rescue: '无线电的呼叫得到了回应，救援队抵达了豪宅。', 'doll-captured': '幸存者第四次找出了诡偶，赢得了对抗。', 'survivor-eliminated': '一名幸存者再次受伤，追猎者赢得了对抗。', 'discover-deck-exhausted': '发现牌堆已经耗尽，幸存者未能及时呼叫救援。' };
  const zones = { R: '红区', B: '蓝区', G: '绿区' };
  const phases = { survivors: '幸存者行动', discover: '发现物资', chooseItem: '挑选物资', killer: '追猎者行动', encounter: '相遇对决', flee: '撤离现场', finished: '对局结束' };
  const actionIcons = { move: 'footprint', killerMove: 'footprint', search: 'search', rest: 'rest', repair: 'radio', discover: 'search', chooseItem: 'bag', giveItem: 'bag', useItem: 'bag', heal: 'heart', passage: 'compass', unblock: 'key', attack: 'skull', defend: 'badge', flee: 'footprint', killerSearch: 'search', playSkill: 'flash', endTurn: 'check' };
  const shortAction = { search: '搜寻物资', rest: '休整', repair: '修复无线电', discover: '发现物资', killerSearch: '搜寻房间', attack: '发起对决', endTurn: '结束追猎回合', passage: '穿过密道' };

  function element(tag, cls, ...children) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    for (const child of children.flat(Infinity)) {
      if (child != null && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }
  function icon(name, size = 18) {
    const s = document.createElementNS(NS, 'svg');
    for (const [key, value] of Object.entries({viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': '1.65', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'ts-ico'})) s.setAttribute(key, value);
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', paths[name] || paths.info);
    s.append(p);
    return s;
  }
  function button(cls, text, click, glyph, hint) {
    const b = element('button', cls, glyph ? icon(glyph) : null, text ? element('span', '', text) : null);
    b.type = 'button';
    if (hint) { b.title = hint; b.setAttribute('aria-label', hint); }
    b.addEventListener('click', click);
    return b;
  }
  function link(cls, href, ...children) {
    const a = element('a', cls, children);
    a.href = href;
    return a;
  }
  function portrait(person, cls = '') {
    const p = typeof person === 'string' ? {id:person,name:names[person]} : person;
    const initial = !names[p.id] && !expansionPortraits.has(p.id) && (p.name || p.id).slice(0,1);
    return element('span','ts-portrait ts-face-' + p.id + ' ' + cls + (initial ? ' ts-monogram' : ''),initial || null);
  }
  const expansionPortraits = new Set(['george','ophelia','dylan','caleb','huntress','werewolf','unidentified','statues','queen',
    'roy','evelyn','zach','victoria','quinto','brenda','hubert','strangler','orion','eyebot','parasitoid','nightmare','wendigo','doll','doctor']);

  const skillTiming = { fast: '快速技能 · 普通行动前', special: '特殊技能 · 替代两次普通行动', slow: '慢速技能 · 普通行动后至多一张', attack: '攻击技能 · 相遇时', burden: '负担牌 · 无法主动打出' };
  const totalCards = counts => Object.values(counts).reduce((sum,n) => sum+n,0);
  function cardList(definitions, counts) {
    const list = element('ul','ts-deck-list');
    for (const def of definitions) {
      if (!counts[def.id]) continue;
      list.append(element('li','',element('strong','',def.name),element('b','ts-copy-count',counts[def.id]+' 张'),
        def.timing ? element('small','',skillTiming[def.timing]) : null, element('p','',def.description)));
    }
    return list;
  }
  function levelTrack(role, currentLevel, hasZach, skills) {
    return element('ol','ts-level-track',(role?.levels || []).map(({level,strength,effect}) =>
      element('li',level === currentLevel ? 'is-current' : level < currentLevel ? 'is-past' : '',
        element('span','','等级 '+level+(level === currentLevel ? ' · 当前' : '')),element('strong','','力量 '+strength),
        element('p','',effect,level===3 && hasZach ? ' 扎克的普通无线电修复提高到 2 点。' : ''),
        (role.unlocks || []).filter(u=>u.level===level).map(u=>element('details','ts-unlock',
          element('summary','','查看解锁牌'),cardList(skills,{[u.skillId]:1}))))));
  }
  function castPicker(catalog, selection) {
    const root = element('div','ts-cast-grid');
    const killers = catalog.killers || [{id:'butcher',name:'屠夫'}];
    const editions = {'feral-instincts':'野性本能','amorphous-peril':'无形危机','lethal-immortals':'致命不朽者','putrefied-enmity':'腐朽之怨',
      'terrorscape-2':'第二季','season-2-core':'第二季','depraved-hunger':'堕落饥渴','fatal-funtime':'致命游乐场','insanity-cure':'疯狂疗法','base':'基础盒'};
    const slots = [];
    function addSlot(title, people, index) {
      const select = element('select','');
      const detail = element('small','ts-cast-ability');
      const badge = element('span','ts-cast-badge');
      const preview = element('details','ts-cast-preview');
      const previewTitle = element('summary','');
      const contents = element('div','');
      preview.append(previewTitle,contents);
      const selectedId = () => index === null ? selection.killerId : selection.survivorIds[index];
      function refresh() {
        const active = people.find(p => p.id === selectedId()) || people[0];
        select.replaceChildren(...people.map(p => {
          const option = element('option','',p.name);
          option.value = p.id;
          option.selected = p.id === active.id;
          option.disabled = index !== null && !option.selected && selection.survivorIds.includes(p.id);
          return option;
        }));
        const origin = editions[(active.expansion || 'base').toLowerCase().replaceAll(' ','-')] || active.expansion;
        detail.textContent = (origin ? origin + ' · ' : '') + (active.ability || '');
        badge.replaceChildren(portrait(active));
        if (index === null) {
          const counts = active.startingDeckCounts || {};
          previewTitle.textContent = '起始牌组与升级 · '+totalCards(counts)+' 张';
          contents.replaceChildren(element('p','ts-mini','开局从这副牌抽 2 张作为起手牌。'),cardList(catalog.skills,counts),
            element('h4','','升级效果'),levelTrack(active,null,selection.survivorIds.includes('zach'),catalog.skills));
        } else {
          const counts = {};
          for (const id of active.startingItems || []) counts[id] = (counts[id] || 0) + 1;
          if (index === 0 && selection.killerId === 'queen') counts.crossbow = (counts.crossbow || 0) + 1;
          const total = totalCards(counts);
          previewTitle.textContent = total ? '起始物品 · '+total+' 张' : '空手入场';
          contents.replaceChildren(total ? cardList(catalog.items,counts) : element('p','ts-mini','可在豪宅搜寻或发现物资。'));
        }
      }
      select.addEventListener('change',() => {
        if (index === null) selection.killerId = select.value;
        else selection.survivorIds[index] = select.value;
        slots.forEach(update => update());
      });
      select.setAttribute('aria-label',title);
      root.append(element('div','ts-cast-slot',badge,element('span','ts-cast-title',title),select,detail,preview));
      slots.push(refresh);
    }
    addSlot('追猎者角色',killers,null);
    selection.survivorIds.forEach((_,i) => addSlot('幸存者 ' + (i+1),catalog.characters,i));
    slots.forEach(update => update());
    return root;
  }
  const heading = (glyph, text) => element('h2', 'ts-h2', icon(glyph, 19), text);
  const pad = n => String(n).padStart(2, '0');
  const shortName = p => names[p.id] || p.name.split('·')[0];
  const endOf = a => a.path ? a.path[a.path.length - 1] : a.roomId;

  function createTable(options) {
    const root = element('div', 'ts-app');
    const catalog = options.catalog;
    const byRoom = Object.fromEntries(catalog.rooms.map(r => [r.id, r]));
    const itemById = Object.fromEntries(catalog.items.map(i => [i.id, i]));
    const roomName = id => byRoom[id]?.name || id;
    let view, actions = [], context = {}, selected, choosingMove = false, routes = false, notice = '', modal = null;
    let stateKey = '', sound = null, soundBusy = false, visibleTab = 'board';
    let lastTrigger = null, recentCards = [];
    const isLocal = options.mode === 'practice';
    function seatLabel(id) {
      const seat = context.seats?.find(p => p.id === id);
      return seat ? seat.id === context.viewerId ? '你' : seat.name : '';
    }

    function ping(message) {
      notice = message;
      const region = root.querySelector('.ts-notice');
      if (region) { region.textContent = message; region.hidden = !message; }
    }
    function closeDialog() {
      if (!modal) return;
      const node = modal;
      modal = null;
      if (node.open) node.close();
      node.remove();
      visibleTab = 'board';
      root.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('is-on', b.dataset.nav === 'board'));
      if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
      lastTrigger = null;
    }
    function dialog(title, children, kind = '') {
      const trigger = modal ? lastTrigger : document.activeElement;
      closeDialog();
      lastTrigger = trigger;
      const d = element('dialog', 'ts-dialog ' + kind);
      d.setAttribute('aria-label', title);
      const x = button('ts-icon-btn', '', closeDialog, 'close', '关闭');
      d.append(element('div', 'ts-dhead', element('h2', '', title), x), element('div', 'ts-dbody', children));
      d.addEventListener('cancel', e => { e.preventDefault(); closeDialog(); });
      d.addEventListener('click', e => { if (e.target === d) closeDialog(); });
      document.body.append(d);
      modal = d;
      d.showModal();
      x.focus({ preventScroll: true });
      return d;
    }
    function navState(id) {
      visibleTab = id;
      root.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('is-on', b.dataset.nav === id));
    }
    function showRules() {
      const sections = [
        ['flag', '如何逃生', '找齐五把团队钥匙，并让三人一起回到主厅；持有秘密地图时也可以在花园集合。另一条路是在起居室修好无线电，然后再坚持五轮。逃生在幸存者回合开始时结算。'],
        ['footprint', '幸存者回合', '每名幸存者各做一次主行动，可以走一至两步、休整、在可搜寻的地点找物资，或修复无线电。同房队友可以交换物品。三人行动后，选一人执行发现并挑选物资。'],
        ['signal', '噪音与追猎', '钥匙、部分物资和修理会制造噪音。追猎者在自己的棋盘上只能看到传来的动静。搜寻命中后发生对决，恐惧会减少防御骰，一名幸存者受伤两次，追猎者即获胜。'],
        ['map', '操作棋盘', '点选队员，再点地图上的房间查看地点、相邻路线和可执行的移动。队员旁的信息按钮可以查看能力与背包。路线开关会显示门道和封锁。'],
        ['die', '本桌规则', isLocal ? '此练习局由你控制三名幸存者，电脑根据追猎者能看到的信息行动。进度随操作保存在当前浏览器。' : '建房时指定的首席或末席控制追猎者，其余席位分控三名幸存者。电脑只使用本阵营可见的信息。角色名旁标有操控者，重新进入房间可以接着玩。']
      ];
      const sources = catalog.manifest.sources.map(s => { const a = link('ts-source', s.url, s.title, icon('upRight', 13)); a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; });
      dialog('规则手册', [sections.map(([g, t, p]) => element('section', 'ts-rule', icon(g, 20), element('div', '', element('h3', '', t), element('p', '', p)))),
        element('details', 'ts-scope', element('summary', '', '本场景收录范围与规则来源'), element('p', '', catalog.manifest.limitations.join(' ')), sources)]);
      navState('rules');
    }
    function logRows(events) {
      return events.slice().reverse().map(e => element('li', 'ts-log-line',
        element('span', 'ts-log-round', 'R' + pad(e.round || 1)), element('span', 'ts-log-dot'), element('span', '', e.text)));
    }
    function showLog() {
      dialog('行动记录', element('ol', 'ts-journal', logRows(view.events)));
      navState('log');
    }
    function restart() {
      if (!options.onRestart) return;
      const selection = {survivorIds:view.survivors.map(p => p.id),killerId:view.killer.id || 'butcher'};
      const yes = button('ts-btn ts-primary', '开始新局', () => {
        closeDialog(); choosingMove = false; selected = null; notice = ''; options.onRestart(selection);
      }, 'restart');
      const choices = castPicker(catalog,selection);
      dialog('重新开局', [element('p', 'ts-copy', '选择追猎者和三名幸存者。开始新局会替换当前练习进度。'), choices, element('div', 'ts-dialog-acts', button('ts-btn', '继续本局', closeDialog), yes)]);
    }
    async function toggleSound() {
      if (soundBusy) return;
      if (sound) { const old = sound; sound = null; old.close().catch(() => {}); paint(); return; }
      const Audio = global.AudioContext || global.webkitAudioContext;
      if (!Audio) return ping('当前浏览器无法播放环境音。');
      soundBusy = true;
      let audio;
      try {
        audio = new Audio();
        await audio.resume();
        const buffer = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
        source.buffer = buffer; source.loop = true;
        filter.type = 'lowpass'; filter.frequency.value = 1250; gain.gain.value = 0.045;
        source.connect(filter).connect(gain).connect(audio.destination); source.start(); sound = audio;
      } catch { if (audio) audio.close().catch(() => {}); ping('环境音暂时无法播放。'); }
      finally { soundBusy = false; paint(); }
    }
    function navigation() {
      const brand = element('span', 'ts-brand-mark', icon('die', 32));
      const brandText = element('span', 'ts-brand-text', '桌游馆');
      const brandEl = options.lobby ? link('ts-brand', options.lobby, brand, brandText) : element('div', 'ts-brand', brand, brandText);
      const tabs = [['board', '游戏桌', 'board', () => { closeDialog(); root.querySelector('.ts-play')?.scrollIntoView({block:'start', behavior:'smooth'}); }],
        ['rules', '规则手册', 'book', showRules], ['log', '行动记录', 'log', showLog]].map(([id, t, g, cb]) => {
          const b = button('ts-nav-item' + (visibleTab === id ? ' is-on' : ''), t, cb, g);
          b.dataset.nav = id; return b;
        });
      const ambiance = button('ts-icon-btn', '', toggleSound, sound ? 'volume' : 'mute', sound ? '关闭雨声' : '开启雨声');
      ambiance.setAttribute('aria-pressed', String(Boolean(sound)));
      return element('header', 'ts-topbar', element('div', 'ts-width ts-top-inner', brandEl, element('nav', 'ts-tabs', tabs),
        element('div', 'ts-tools', ambiance, isLocal ? button('ts-nav-control', '新开一局', restart, 'restart') :
          link('ts-nav-control', options.lobby || '#/', icon('back', 15), '回大厅'))));
    }
    function hero() {
      return element('section', 'ts-hero', element('div', 'ts-width ts-hero-in',
        element('div', 'ts-wordmark', element('i', ''), 'TERRORSCAPE'),
        element('h1', '', '恶夜杀机'),
        element('p', 'ts-hero-text', view.viewerSide === 'killer' ? '循着豪宅里的动静，推断幸存者的藏身之处。' : '带领幸存者穿过雨夜豪宅，找齐钥匙，或让无线电响起。'),
        element('div', 'ts-tags', element('span', '', icon('house', 14), '经典豪宅'), element('b', ''),
          element('span', '', icon(isLocal ? 'die' : 'team', 14), isLocal ? '单人练习' : '房间 ' + context.roomId),
          element('b', ''), element('span', '', icon('eye', 14), view.viewerSide === 'killer' ? '追猎者视角' : '幸存者视角'))));
    }

    const actor = () => view.survivors.find(p => p.id === selected);
    function relevant() {
      if (view.viewerSide === 'killer') return actions;
      return actions.filter(a => !a.survivorId || a.survivorId === selected);
    }
    const moveAction = a => ['move', 'sprint', 'killerMove', 'brutalRageMove', 'flee'].includes(a.type);
    const blockedEdge = (a, b) => view.blocks.some(pair => pair.includes(a) && pair.includes(b));
    function send(action) {
      if (!action || context.busy) return;
      if (!actions.includes(action)) { closeDialog(); ping('局面已更新，请重新选择行动。'); return; }
      closeDialog(); notice = ''; choosingMove = false;
      options.onAction(action);
    }
    function routeLines() {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'ts-routes');
      svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
      const paths = relevant().filter(moveAction);
      const origin = view.viewerSide === 'killer' ? view.killer.roomId : actor()?.roomId;
      for (const [a, b] of catalog.edges) {
        const blocked = blockedEdge(a, b);
        const alongPath = choosingMove && paths.some(p => {
          const steps = [origin, ...(p.path || [p.roomId])];
          return steps.some((r, i) => i && ((r === a && steps[i-1] === b) || (r === b && steps[i-1] === a)));
        });
        if (!routes && !blocked && !alongPath) continue;
        const line = document.createElementNS(NS, 'line');
        for (const [k, v] of Object.entries({x1:byRoom[a].x,y1:byRoom[a].y,x2:byRoom[b].x,y2:byRoom[b].y, class: blocked ? 'blocked' : alongPath ? 'reachable' : '', 'vector-effect':'non-scaling-stroke'})) line.setAttribute(k,v);
        svg.append(line);
      }
      return svg;
    }
    function locationFlags(r) {
      return [r.exit === 'main' ? '主出口' : r.exit === 'hidden' ? '隐藏出口' : '', r.radio ? '无线电' : '', r.search ? '可搜寻' : '', r.passage ? '秘密通道' : ''].filter(Boolean);
    }
    function roleMarkers(id) {
      const k = view.killer, labels = [];
      const here = list => (list || []).filter(token => (token.roomId || token) === id);
      const trapTypes = {net:'网阵',bear:'捕兽夹',skull:'骷髅陷阱'};
      for (const trap of here(k.traps)) labels.push(trapTypes[trap.type] || '陷阱');
      if (here(k.cores).length) labels.push('核心');
      for (const statue of here(k.statues)) labels.push((statue.id === k.mainStatueId ? '主像' : '石像') + (statue.frozen ? '·凝固' : ''));
      const zombies = here(k.zombies).length;
      if (zombies) labels.push('僵尸×' + zombies);
      if (here(k.drones).length) labels.push('无人机');
      if (here(k.clouds).length) labels.push('侵染云');
      for (const ice of here(k.frozenRooms)) labels.push('冰冻×' + ice.count);
      return labels;
    }
    function infoRoom(id) {
      const r = byRoom[id], flags = [...locationFlags(r),...roleMarkers(id)];
      const optionsHere = relevant().filter(a => moveAction(a) && endOf(a) === id);
      const here = view.survivors.filter(p => p.roomId === id).map(shortName);
      if (view.killer.roomId === id) here.push(view.killer.name || '屠夫');
      const connected = catalog.edges.filter(pair => pair.includes(id)).map(pair => pair.find(n => n !== id));
      const routesInfo = connected.map(n => roomName(n) + (blockedEdge(id,n) ? '（封锁）' : '')).join('、');
      const extra = [];
      if (r.exit === 'main') extra.push('集齐五把钥匙后，让三名幸存者在这里会合。');
      if (r.exit === 'hidden') extra.push('五把钥匙与秘密地图可以打开这里的隐藏出口。');
      if (r.radio) extra.push('在这里修复无线电，每轮最多修复一次。');
      if (r.search) extra.push('可以使用主行动，在此搜寻钥匙和物资。');
      if (r.passage) extra.push('部分道具与角色能力可以使用这里的密道。');
      const go = optionsHere.map((a, i) => {
        let label = '移动至' + r.name;
        if (a.type === 'flee') label = actor()?.roomId === id ? '留在原地' : '撤离至' + r.name;
        if (a.type === 'sprint') label = '冲刺至' + r.name + '（有噪音）';
        if (a.type === 'brutalRageMove') label = '蛮力狂暴 · 前往'+r.name+'并搜寻';
        if (a.path?.length > 1) label += ' · 经' + a.path.slice(0,-1).map(roomName).join('、');
        const b = button('ts-btn ts-room-go' + (i === 0 ? ' ts-primary' : ''),label,() => send(a),'footprint');
        if (a.path) b.title = a.path.map(roomName).join(' → ');
        return b;
      });
      dialog(r.name, [element('div', 'ts-room-meta', element('span','ts-zone ts-zone-' + r.zone, r.id), r.englishName, flags.map(f => element('span','ts-tag',f))),
        extra.map(t => element('p','ts-copy',t)),
        element('div','ts-defs', element('strong','','相邻地点'),element('span','',routesInfo), element('strong','','可见棋子'),element('span','',here.join('、') || '无')),
        go.length ? element('div','ts-dialog-acts',go) : element('p','ts-subtle', choosingMove ? '当前角色不能在这次行动中到达这里。' : '点选其他地点可查看路线。')]);
    }
    function roomToken(r) {
      const occupants = view.survivors.filter(p => p.roomId === r.id);
      const killerHere = view.killer.roomId === r.id;
      const noisy = view.noise.includes(r.id);
      const reachable = choosingMove && relevant().some(a => moveAction(a) && endOf(a) === r.id);
      const markers = occupants.map(p => portrait(p, 'ts-pawn'));
      const effects = roleMarkers(r.id);
      if (killerHere) markers.push(portrait(view.killer.id ? view.killer : 'butcher', 'ts-pawn ts-enemy'));
      const b = element('button', 'ts-place ts-zone-' + r.zone + (reachable ? ' is-reachable' : '') + (occupants.length ? ' has-friends' : '') + (killerHere ? ' has-enemy' : ''),
        markers.length ? element('span','ts-pawns',markers) : null,
        effects.length ? element('span','ts-map-effects',effects[0] + (effects.length > 1 ? ' +' + (effects.length-1) : '')) : null,
        element('span','ts-plaque', element('i','ts-place-code',r.id), element('span','ts-place-name',r.name), noisy ? icon('signal',13) : r.radio ? icon('radio',11) : r.search ? icon('search',11) : null));
      b.style.left = r.x + '%'; b.style.top = r.y + '%'; b.type = 'button';
      b.dataset.room = r.id;
      const label = [r.name, r.id, ...locationFlags(r), ...effects, ...occupants.map(shortName), killerHere ? view.killer.name || '屠夫' : null, noisy ? '有噪音' : null, reachable ? '可移动' : null].filter(Boolean).join('，');
      b.setAttribute('aria-label', label); b.title = label;
      b.addEventListener('click', () => {
        const moves = relevant().filter(a => moveAction(a) && endOf(a) === r.id);
        if (choosingMove && moves.length === 1 && moves[0].type !== 'sprint') send(moves[0]);
        else infoRoom(r.id);
      });
      return b;
    }
    function openMap() {
      const d = dialog('豪宅地图', [], 'ts-map-dialog');
      d.querySelector('.ts-dbody').append(mapPanel(true));
    }
    function mapPanel(large = false) {
      const toggle = button('ts-tool' + (routes ? ' is-on' : ''), '路线', () => {
        routes = !routes;
        if (large) { const area = modal?.querySelector('.ts-dbody'); if (area) area.replaceChildren(mapPanel(true)); }
        else paint();
      }, 'layers', '显示或隐藏连通路线');
      toggle.setAttribute('aria-pressed', String(routes));
      const caption = choosingMove ? element('div', 'ts-move-banner', icon('footprint', 15), '点选高亮地点移动', button('ts-text-btn','取消', () => { choosingMove=false; if (large) openMap(); else paint(); })) : null;
      const map = element('div', 'ts-map-stage' + (choosingMove ? ' is-choosing' : ''), routeLines(), catalog.rooms.map(roomToken));
      map.setAttribute('role','group'); map.setAttribute('aria-label','豪宅可交互地图');
      return element('section','ts-panel ts-map-panel',
        element('div','ts-panel-head', heading('map','豪宅地图'), element('div','ts-head-tools',toggle,large ? null : button('ts-tool ts-square','',openMap, 'expand', '放大地图'))),
        caption, map, element('div','ts-legend', element('span','',element('i','ts-legend-dot ally'),'幸存者'), element('span','',element('i','ts-legend-dot foe'),'追猎者'), element('span','',icon('signal',14),'噪音'),
          element('span','ts-legend-hint',icon('info',13),'点击地点查看详情')));
    }
    function chooseMove() {
      choosingMove = !choosingMove; notice = ''; paint();
      const map = root.querySelector('.ts-map-panel');
      if (choosingMove && map) map.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'nearest'});
    }
    function itemTiming(id) {
      if (['whiskey','firecracker','energy-drink','research-notes','lucky-coin'].includes(id)) return '额外行动 · 不占主行动';
      if (['toolbox','first-aid','medical-kit','flashlight','crossbow'].includes(id)) return '主行动';
      if (id==='hatchet') return '相遇防御';
      if (id==='wrench') return '相遇防御 · 修复辅助';
      if (id==='experimental-gadget') return '相遇防御或额外行动';
      if (id==='doll-prank') return '空白发现牌';
      if (['limestone','revolver','ammo','amulet'].includes(id)) return '相遇防御';
      return id === 'key' ? '团队钥匙 · 立即收集' : '被动持有';
    }
    function itemNoise(id) {
      if (id === 'toolbox') return '使用：普通工具箱修复在自己房间制造噪音，角色特例见能力';
      if (id === 'whiskey') return '使用：在所选相邻房间制造噪音';
      if (id === 'firecracker') return '使用：在所有房间制造噪音';
      return '使用：本场景不额外制造噪音';
    }
    function itemActions(p, id) {
      const alternatives = {'research-notes':['useNotes'],'lucky-coin':['luckyCoin'],'experimental-gadget':['activateGadget'],
        crossbow:['shootZombie'],toolbox:['remoteRepair','remoteSearch'],flashlight:['passage']};
      return actions.filter(a => a.survivorId === p?.id &&
        (a.itemId === id || (id === 'ammo' && a.ammo) || alternatives[id]?.includes(a.type)));
    }
    function cardFace(def, count, kind, available, owner, foundIndex) {
      const isSkill = kind === 'skill', drawnDiscard = foundIndex != null && view.choice?.stage === 'discard', renderedKey = stateKey;
      const timing = isSkill ? skillTiming[def.timing] : itemTiming(def.id);
      const b = element('button','ts-hand-card' + (available.length ? ' is-usable' : '') + (isSkill ? ' is-skill' : ''),
        element('span','ts-card-kicker',isSkill ? (view.killer.name || '屠夫') + '技能' : foundIndex != null ? (drawnDiscard ? '选择丢弃的物资' : '刚抽到的物资') : '幸存者物资'),
        element('span','ts-card-title',icon(isSkill ? 'flash' : 'bag',21),element('strong','',def.name),count > 1 ? element('b','ts-card-count','×' + count) : null),
        element('span','ts-card-timing',timing),element('span','ts-card-description',def.description),
        !isSkill ? element('span','ts-card-noise' + (def.noise ? ' is-noisy' : ''),icon(def.noise ? 'signal' : 'mute',13),def.noise ? '抽到即有噪音 · 丢弃也会响' : '抽到：无噪音') : null,
        !isSkill ? element('span','ts-card-noise',itemNoise(def.id)) : def.timing === 'burden' ? null : element('span','ts-card-noise', ['terror','chainsaw'].includes(def.id) ? '恐惧溢出会立即产生公开噪音' : '使用后弃牌'),
        element('span','ts-card-availability',available.length ? (foundIndex != null ? (drawnDiscard ? '可以选择丢弃 · 查看' : '可以选择保留 · 查看') : '当前可操作 · 查看选项') : '查看卡牌说明'));
      b.type='button'; b.setAttribute('aria-label',def.name + '，' + timing);
      const remaining = isSkill && view.killer.deckCounts ? '抽牌堆中还有 '+(view.killer.deckCounts[def.id] || 0)+' 张'+def.name : '';
      if (remaining) {
        b.title = remaining;
        b.setAttribute('aria-label',def.name+'，'+timing+'，'+remaining);
      }
      b.addEventListener('click',()=>{
        if (renderedKey !== stateKey) return ping('局面已更新，请重新选择卡牌。');
        const fresh = isSkill ? actions.filter(a=>a.skillId===def.id) : foundIndex != null ? actions.filter(a=>a.type==='chooseItem' && a.index===foundIndex) : itemActions(owner,def.id);
        const notes = [element('p','ts-card-timing',timing),element('p','ts-copy',def.description)];
        if (remaining) notes.push(element('p','ts-mini',remaining));
        if (!isSkill) notes.push(element('p','ts-copy',def.noise ? '发现或搜寻时，只要抽出此牌就制造噪音；不因放弃保留而撤销。' : '发现或搜寻抽到此牌不会制造噪音。'),element('p','ts-copy',itemNoise(def.id)),
          element('p','ts-subtle',def.persistent ? '可反复使用，不因通常使用而消耗。' : def.id==='key' ? '立即加入团队钥匙，不占背包。' : '使用后消耗；交接不等于使用。'));
        if (def.timing !== 'burden') {
          if (isSkill) notes.push(element('p','ts-subtle','本场景使用后弃牌，不另付实体版弃牌费用。'));
          notes.push(fresh.length ? element('div','ts-action-list',fresh.map(a=>actionButton(a,false,a.label))) : element('p','ts-copy', '当前没有这张牌的合法操作。请等待对应阶段、满足地点/目标条件，或由操控该角色的玩家操作。'));
        }
        dialog(def.name,notes);
      });
      return b;
    }
    function handPanel() {
      const killer = view.viewerSide === 'killer', p = actor();
      const cards = killer ? view.killer.hand : p?.inventory;
      if (!Array.isArray(cards)) return null;
      const defs = killer ? Object.fromEntries(catalog.skills.map(c=>[c.id,c])) : itemById;
      const title = killer ? '我的' + (view.killer.name || '屠夫') + '手牌' : (p ? shortName(p) + ' · 手牌与背包' : '手牌与背包');
      const available = id => killer ? actions.filter(a=>a.skillId===id) : itemActions(p,id);
      const recent = recentCards.filter(r=>r.owner === (killer ? 'killer' : p?.id));
      return element('section','ts-panel ts-hand-panel',element('div','ts-panel-head',heading('bag',title),element('span','ts-mini',cards.length + ' / ' + (killer ? 5 : (p.inventoryLimit ?? (p.id==='johnson' ? 4 : 3))) + ' 张')),
        element('div','ts-hand-body',element('p','ts-hand-help',killer ? '点中文卡牌查看合法技能目标。手牌和牌库数量仅对你可见。' : '选小队成员查看物资。额外行动不占主行动；交接需同房。以服务器给出的可操作项为准。'),
          recent.length ? element('p','ts-recent-cards','最近入手：' + recent.map(r=>(defs[r.id]?.name || '物资') + (r.count>1?' ×'+r.count:'')).join('、')) : null,
          cards.length ? element('div','ts-hand-grid',[...new Set(cards)].map(id=>defs[id] ? cardFace(defs[id],cards.filter(x=>x===id).length,killer?'skill':'item',available(id),p) : null)) : element('p','ts-empty-hand',killer ? '暂时没有技能手牌。回合结束时抽牌。' : '背包是空的。前往搜寻地点，或在发现阶段获取物资。'),
          element('p','ts-card-scope','中文卡面 · 豪宅数字改编，以本场景效果为准；不是实体中文版原卡图。')));
    }
    function foundPanel() {
      if (view.phase !== 'chooseItem' || !Array.isArray(view.choice?.cards)) return null;
      const p = view.survivors.find(p=>p.id===view.choice.survivorId);
      const cards = view.choice.stage==='discard' ? p?.inventory || [] : view.choice.cards;
      return element('section','ts-panel ts-found-panel',element('div','ts-panel-head',heading('search',view.choice.stage==='discard' ? '背包已满 · 选择丢弃' : '本次抽到的物资')),
        element('div','ts-hand-body',element('p','ts-hand-help',view.choice.stage==='discard' ? '选择一张背包物资丢弃；丢弃本身不会制造新的噪音。' : '带噪音标记的牌在抽出时已经制造噪音，无论是否保留。'),
          element('div','ts-hand-grid',cards.map((id,index)=>itemById[id] ? cardFace(itemById[id],1,'item',actions.filter(a=>a.type==='chooseItem' && a.index===index),p,index) : null))));
    }
    function actionNote(a) {
      if (a.type === 'useItem') return '额外行动，不占主行动。' + itemNoise(a.itemId);
      if (a.type === 'giveItem') return '交接，不占主行动，不制造噪音。';
      if (a.type === 'repair') return '主行动；在自己房间制造噪音。';
      if (a.type === 'search' || a.type === 'discover') return '抽到带噪音标记的物资就会制造噪音，即使丢弃。';
      if (a.type === 'playSkill') return skillTiming[catalog.skills.find(c=>c.id===a.skillId)?.timing] || '技能行动';
      return '';
    }
    function detailsFor(p) {
      const def = catalog.characters.find(c => c.id === p.id);
      const state = p.abilityState || {};
      const conditions = [p.poisoned && '中毒',p.dreaming && '梦境中',state.toughness && '可以抵挡一次伤害',
        state.encouragement && '已获鼓励',state.recordingRound && ('录影轮次 ' + state.recordingRound),
        state.bandageTargetId && ('包扎对象 · ' + (catalog.characters.find(c => c.id === state.bandageTargetId)?.name || '队友'))].filter(Boolean);
      const inventory = p.inventory == null ? '背包内容对追猎者保密。' : p.inventory.length ? p.inventory.map(id => {
        const it = itemById[id]; return element('div','ts-item-detail',icon('bag',16),element('div','',element('b','',it?.name || id),element('p','',it?.description || '')));
      }) : '背包是空的。';
      dialog(p.name, [element('div','ts-person-detail',portrait(p),element('div','',element('small','ts-word',def?.englishName || ''),element('p','',def?.ability || ''))),
        element('div','ts-defs',element('strong','','所在地点'),element('span','',roomName(p.roomId) || '位置未知'),element('strong','','健康 / 恐惧'),element('span','',p.health + ' / 2　·　' + p.fear + ' / 2')),
        conditions.length ? element('p','ts-copy',conditions.join('　·　')) : null,
        element('h3','ts-small-heading','随身物品'),element('div','ts-copy',inventory)]);
    }
    function roster() {
      const done = view.survivors.filter(p => p.acted).length;
      return element('section','ts-squad', element('div','ts-section-head',heading('team','幸存者小队'),element('span','ts-mini',view.viewerSide === 'killer' ? '3 名幸存者' : done + ' / 3 已行动')),
        element('div','ts-members',view.survivors.map(p => {
          const active = p.id === selected && view.viewerSide !== 'killer';
          const can = actions.some(a => a.survivorId === p.id);
          const b = element('button','ts-player' + (active ? ' is-active' : ''),portrait(p),element('span','ts-player-copy',
            element('strong','',shortName(p),seatLabel(p.ownerId) ? element('span','ts-seat-owner',' · ' + seatLabel(p.ownerId)) : null),
            element('small','',icon('pin',11),roomName(p.roomId) || '行踪未知',p.poisoned ? ' · 中毒' : '',p.dreaming ? ' · 梦境' : '')),
            element('span','ts-health', [0,1].map(i => element('span',i < p.health ? 'on' : '',icon('heart',11)))),
            element('span','ts-player-status', p.health === 0 ? '已出局' : p.fear ? '恐惧 ' + p.fear : p.acted ? '已行动' : can ? (active ? '已选中' : '待行动') : p.health < 2 ? '受伤' : '存活'));
          b.type = 'button'; b.setAttribute('aria-pressed',String(active)); b.setAttribute('aria-label','选择' + p.name);
          b.addEventListener('click',() => { if (view.viewerSide === 'killer') return detailsFor(p); selected = p.id; choosingMove = false; paint(); });
          return element('div','ts-player-row',b,button('ts-player-info','',()=>detailsFor(p),'info','查看' + p.name + '的角色与背包'));
        })));
    }
    function actionButton(a, primary = false, label) {
      const b = button('ts-btn' + (primary ? ' ts-primary' : ''), label || shortAction[a.type] || (a.label || a.type).replace(/^.*?：/,''),() => send(a),actionIcons[a.type] || 'arrow');
      b.disabled = Boolean(context.busy); const note = actionNote(a); b.title = [a.label,note].filter(Boolean).join(' · '); if (note) b.append(element('small','ts-action-cost',note)); return b;
    }
    function moreActions(list, title = '可用行动') {
      dialog(title, element('div','ts-action-list',list.map(a => actionButton(a,false,a.label))));
    }
    function controls() {
      const mine = relevant(), movement = mine.filter(moveAction), other = mine.filter(a => !moveAction(a));
      const buttons = [], p = actor(), isKiller = view.viewerSide === 'killer';
      if (movement.length) {
        const b = button('ts-btn ts-primary', choosingMove ? '取消选点' : (view.phase === 'flee' ? '选择撤离地点' : '选择移动地点'), chooseMove, 'footprint');
        b.disabled = Boolean(context.busy); buttons.push(b);
      }
      let remaining = other;
      if (['survivors','killer','discover'].includes(view.phase)) {
        const direct = other.filter(a => ['search','repair','rest','killerSearch','passage','discover','endTurn'].includes(a.type) && !a.itemId);
        for (const a of direct) buttons.push(actionButton(a,!buttons.length));
        remaining = other.filter(a => !direct.includes(a));
      }
      if (remaining.length <= 3) {
        for (const a of remaining) {
          const contextual = ['chooseItem','defend','playSkill','giveItem','useItem','heal'].includes(a.type) ? (a.label || '').split('：').slice(-1)[0] : undefined;
          buttons.push(actionButton(a,!buttons.length,contextual));
        }
      } else buttons.push(button('ts-btn' + (buttons.length ? '' : ' ts-primary'), (isKiller ? '技能与行动' : '物品与行动') + '（' + remaining.length + '）',() => moreActions(remaining), 'bag'));
      let hint;
      if (context.closed) hint = '房主已关闭房间。可以返回大厅开一局新的游戏。';
      else if (view.result) hint = '这场对局已经结束。';
      else if (!actions.length) hint = isLocal ? '追猎者正在判断宅邸中的动静…' : '等待' + (seatLabel(view.currentPlayerId) || '其他玩家') + '行动…';
      else if (view.phase === 'discover') hint = '选择一名队员，从发现牌堆翻开物资。';
      else if (view.phase === 'chooseItem') hint = view.choice?.stage === 'discard' ? '背包已满，请选择要丢弃的物品。' : '挑选这次发现要保留的物资。';
      else if (view.phase === 'encounter') hint = '相遇开始，请选择本次对决的行动。';
      else if (view.phase === 'flee') hint = '选择留在原地，或撤到相邻地点。';
      else if (isKiller && view.killer.stage === 'brutal-rage') hint = '蛮力狂暴：选择一至两步路线，抵达后自动搜寻。途经封锁且扑空时可再次移动。';
      else if (view.round === 1 && p?.roomId === 'R1' && !isKiller) hint = '可以去画廊找钥匙，或前往起居室修无线电。';
      else hint = isKiller ? '普通行动剩余 ' + view.killer.actionsRemaining + ' 次。' : '普通移动最多两步，也可留在这里行动。';
      const title = view.result ? '对局结束' : isKiller ? '追猎者行动' : (view.phase === 'chooseItem' ? '物资选择' : (p ? shortName(p) + '的行动' : '本回合行动'));
      const extras = mine.filter(a=>a.type==='useItem');
      return element('section','ts-controls',element('div','ts-section-head',element('h3','',title), view.phase === 'survivors' && !isKiller ? element('span','ts-mini','主行动 × 1') : null),
        element('p','ts-action-hint',hint),extras.length ? element('p','ts-extra-hint','可用额外行动：' + [...new Set(extras.map(a=>itemById[a.itemId]?.name || '物品'))].join('、') + '。不占主行动，噪音代价见卡牌。') : null,element('div','ts-action-grid',buttons));
    }
    function goals() {
      const entries = [['key','集齐钥匙',view.keys,5,'全员返回主厅即可逃出。'],['radio',view.radio.rescueRemaining != null ? '等待救援' : '修复无线电',view.radio.rescueRemaining != null ? 5-view.radio.rescueRemaining : view.radio.progress,5,view.radio.rescueRemaining != null ? '救援还需 ' + view.radio.rescueRemaining + ' 轮。' : '起居室每轮修复一次；修满后还需坚持五轮。']];
      return element('section','ts-panel ts-goals',element('div','ts-section-head',heading('target','逃生目标'),element('span','ts-mini','达成其一')),
        entries.map(([glyph,title,n,max,note])=>element('div','ts-goal',element('span','ts-goal-icon',icon(glyph,21)),
          element('div','ts-goal-body',element('div','ts-goal-top',element('strong','',title),element('span','ts-counter',n == null ? '？' : n,element('small','', ' / '+max))),
            element('div','ts-progress',Array.from({length:max},(_,i)=>element('i',n!=null && i<n?'filled':''))),
            element('p','',n==null ? '修复进度对追猎者保密。' : note)))));
    }
    function turnPanel() {
      return element('div','ts-turn',
        element('div','ts-turn-title',icon('moon',19),element('span','','第 ',element('b','',pad(view.round)),' 轮')),
        element('span','ts-phase' + (view.currentSide === 'killer' ? ' enemy' : ''),element('i',''),phases[view.phase] || '对局中'));
    }
    function remainingDeck() {
      const counts = view.killer.deckCounts;
      return totalCards(counts) ? cardList(catalog.skills,counts) : element('p','ts-copy','抽牌堆已空，下次抽牌或从牌库弃牌时将洗回弃牌。');
    }
    function openDeck() {
      if (!view.killer.deckCounts) return;
      dialog('剩余牌库 · '+view.killer.name,[remainingDeck()]);
      visibleTab = 'deck';
    }
    function hunterPanel() {
      const k = view.killer, own = Array.isArray(k.hand);
      const role = catalog.killers?.find(role => role.id===(k.id || 'butcher'));
      const evolvedMight = (k.evolutions || []).filter(type => type === 'might').length;
      const deckButton = own && k.deckCounts ? button('ts-deck-button','牌库剩余 '+k.deckCount+' 张',openDeck,'bag') : null;
      if (deckButton) {
        deckButton.dataset.hint = '还剩 '+k.deckCount+' 张';
        deckButton.setAttribute('aria-label','抽牌堆还剩 '+k.deckCount+' 张，点击查看牌名与数量');
      }
      return element('section','ts-panel ts-hunter',portrait(k.id ? k : 'butcher'),
        element('div','ts-hunter-main',element('div','ts-section-head',element('h3','','追猎者 · '+(k.name || '屠夫')),element('small','ts-mini','等级 '+k.level+'　力量 '+k.strength)),
          element('p','ts-mini',icon('pin',12),' '+(roomName(k.roomId)||'行踪未知')+(seatLabel(k.ownerId)?' · '+seatLabel(k.ownerId):'')),
          k.ability ? element('p','ts-hand-help',k.ability) : null,
          evolvedMight ? element('p','ts-mini','力量进化 +' + evolvedMight + '（额外计入当前力量）') : null,
          k.id === 'doll' ? element('p','ts-mini','已找出诡偶 ' + (k.catches||0) + ' / 4 · 被窃钥匙 ' + (k.stolenKeys||0)) : null,
          element('h4','ts-upgrade-title','升级面板'),levelTrack(role,k.level,view.survivors.some(p=>p.id==='zach'),catalog.skills),
          element('p','ts-hand-help',k.level<5 ? '需要继续抽牌或弃牌时，若牌库已空则升一级，洗回弃牌后继续。' : '已达等级上限。牌库耗尽后仍会洗回弃牌，但不再升级。'),
          own ? element('div','ts-deck-stats',element('span','','手牌 '+k.hand.length+' / 5'),deckButton,element('span','','弃牌 '+(k.discard?.length||0))) : element('p','ts-subtle',(k.name || '屠夫')+'手牌、牌库与弃牌数量对幸存者保密。'),
          own ? element('p','ts-subtle','回合末抽 3 张；超过 5 张上限的新牌直接丢弃。当前普通行动剩余 '+k.actionsRemaining+' 次。') : null));
    }
    function resultPanel() {
      if (!view.result) return null;
      const win = view.result.winningTeam === 'survivors';
      return element('section','ts-panel ts-result',icon(win ? 'key' : 'skull',35),element('div','',element('h2','',win ? '幸存者胜利' : '追猎者胜利'),
        element('p','',reasons[view.result.reason] || '对局在第 ' + view.round + ' 轮结束。')),
        isLocal ? button('ts-btn ts-primary','再玩一局',restart,'restart') : link('ts-btn',options.lobby || '#/','返回大厅'));
    }
    function paint() {
      if (!view) return;
      const focus = root.contains(document.activeElement) ? document.activeElement.getAttribute('aria-label') || document.activeElement.textContent : null;
      const board = mapPanel();
      const timeline = element('section','ts-panel ts-timeline',element('div','ts-section-head',heading('log','最近动静'),button('ts-text-btn','全部记录',showLog,'chevron')),
        element('ol','ts-journal',logRows(view.events.slice(-3))));
      const banner = element('div','ts-notice',notice); banner.setAttribute('role','status'); banner.hidden = !notice;
      const primarySide = element('div','ts-side',element('section','ts-panel ts-player-panel',turnPanel(),roster(),controls()),goals());
      const footer = element('footer','ts-footer',element('span','',icon('die',15),'恶夜杀机 · 豪宅场景'),options.lobby ? link('',options.lobby, '桌游大厅',icon('upRight',13)) : element('span','',icon('badge',13),'本地存档'));
      root.replaceChildren(navigation(),hero(),element('div','ts-width ts-play',banner,resultPanel(),
        element('div','ts-layout',element('div','ts-maincol',board,foundPanel(),handPanel(),hunterPanel(),timeline),primarySide),footer));
      if (focus && !modal) {
        const same = Array.from(root.querySelectorAll('button,a')).find(el => (el.getAttribute('aria-label') || el.textContent) === focus);
        if (same) same.focus({ preventScroll:true });
      }
    }
    function update(next, legal, meta = {}) {
      const key = [next.turn,next.phase,next.events.at(-1)?.sequence,meta.version].join('/');
      if (key !== stateKey) {
        choosingMove = false;
        if (modal && visibleTab === 'board') closeDialog();
      }
      if (view && key !== stateKey && view.viewerSide === next.viewerSide) {
        const gained = [];
        const compare = (owner,before,after) => {
          if (!Array.isArray(before) || !Array.isArray(after)) return;
          for (const id of new Set(after)) { const count=after.filter(x=>x===id).length-before.filter(x=>x===id).length; if(count>0)gained.push({owner,id,count}); }
        };
        if (next.viewerSide === 'killer') compare('killer',view.killer.hand,next.killer.hand);
        else for (const p of next.survivors) compare(p.id,view.survivors.find(x=>x.id===p.id)?.inventory,p.inventory);
        if (gained.length) recentCards=gained;
      } else if (view && view.viewerSide !== next.viewerSide) recentCards=[];
      view = next; actions = legal || next.legalActions || []; context = meta; stateKey = key;
      const allowed = actions.filter(a => a.survivorId && (view.phase !== 'survivors' || !['giveItem','useItem'].includes(a.type)));
      if (!selected || (allowed.length && !allowed.some(a => a.survivorId === selected))) selected = allowed[0]?.survivorId || view.survivors[0]?.id;
      paint();
      if (modal && visibleTab === 'log') showLog();
      if (modal && visibleTab === 'deck') {
        if (view.killer.deckCounts) modal.querySelector('.ts-dbody').replaceChildren(remainingDeck());
        else closeDialog();
      }
    }
    function dispose() { closeDialog(); if (sound) { sound.close().catch(() => {}); sound = null; } }
    return { root, update, ping, dispose, closeDialog, showRules };
  }
  global.TerrorscapeTable = { createTable, castPicker };
})(globalThis);
