import './terrorscape/table.js';

export const MANOR_ID = 'terrorscape';
const practiceUrl = '/board-games/terrorscape/index.html';
const gameUrl = '#/game/' + MANOR_ID;
const cover = '/board-games/terrorscape/art/mansion.webp';

export function createManorViews({ h, S, auth, topbar, run, act, render, retryBar, armBtn, copyInvite, deleteRoomButton }) {
  const setup = { name:'', capacity:4, visibility:'private', killerSeat:'last', killerId:'butcher', survivorIds:['william','anna','marco'] };
  let currentTable = null, tableRoom = null;
  function lobbyCard(game) {
    return h('article',{class:'game'},h('a',{class:'game-art',href:gameUrl,'aria-label':'进入恶夜杀机'},h('img',{src:cover,alt:'雨夜中的豪宅',width:2172,height:724,loading:'lazy'})),
      h('div',{class:'game-body'},h('p',{class:'eyebrow'},game.englishName),h('h3',null,game.name),
        h('p',{class:'meta'},'1–4 人 · 可补人机'),h('p',null,'幸存者在暗处找钥匙、修无线电。追猎者循着噪音寻找他们。'),
        h('div',{class:'acts'},h('a',{class:'btn',href:gameUrl},'开房邀请朋友'),h('a',{class:'btn ghost',href:practiceUrl},'单人练习'))));
  }
  function segment(key,value,label) {
    const on = setup[key] === value;
    return h('button',{type:'button',class:'seg' + (on ? ' on' : ''),'aria-pressed':String(on),onclick:()=>{setup[key]=value;render();}},label);
  }
  function landing() {
    const catalog = S.catalogs[MANOR_ID];
    if (!catalog) return [topbar(),h('p',{class:'boot'},S.missing || '正在读取豪宅场景…')];
    const signed = Boolean(S.me?.name);
    const nameInput = h('input',{type:'text',maxlength:40,value:setup.name,placeholder:'给这次雨夜聚会起个名字','aria-label':'房间名'});
    nameInput.addEventListener('input',()=>{setup.name=nameInput.value;});
    return [topbar(),h('section',{class:'wrap ts-lobby-entry'},
      h('header',{class:'ts-lobby-banner'},h('p',{class:'eyebrow'},'TERRORSCAPE'),h('h1',{class:'room-title'},'恶夜杀机'),
        h('p',{},'一名追猎者，三名幸存者。你会循声追踪，还是悄悄逃出这座豪宅？'),
        h('div',{class:'acts'},h('button',{type:'submit',form:'manor-room-form',class:'btn',disabled:S.busy || !!S.retry || setup.survivorIds.length!==3},signed?'开房邀请朋友':'登录后开房'),
          h('a',{class:'btn ghost',href:'#/'},'桌游大厅与我的房间'))),
      h('div',{class:'panel'},h('h2',null,'开一间联机房'),h('p',{class:'hint'},'1–4 人可玩。建房后复制邀请链接，等朋友入座，或直接让电脑补齐空位。'),
        h('form',{id:'manor-room-form',class:'create',onsubmit:e=>{
          e.preventDefault(); if (S.busy || S.retry || setup.survivorIds.length!==3) return;
          if (!signed) {auth.login();return;}
          const settings={gameId:MANOR_ID,capacity:setup.capacity,visibility:setup.visibility,options:{killerSeat:setup.killerSeat,killerId:setup.killerId,survivorIds:setup.survivorIds.slice()}};
          if(setup.name.trim())settings.name=setup.name.trim();
          run((_,rid)=>S.api.create(settings,{requestId:rid}),null,r=>{location.hash='#/room/'+r.room.id;});
        }},
        h('label',null,'房间名',nameInput),
        h('div',{class:'field'},h('span',null,'席位上限'),h('div',{class:'segs'},[2,3,4].map(n=>segment('capacity',n,n+' 席')))),
        h('div',{class:'field'},h('span',null,'追猎者席位'),h('div',{class:'segs'},segment('killerSeat','last','末席 · 房主当幸存者'),segment('killerSeat','first','首席 · 房主当追猎者'))),
        h('div',{class:'ts-cast-section'},h('h3',null,'本局阵容'),h('p',{class:'hint'},
          '从 ' + catalog.characters.length + ' 名幸存者中选三名，再从 ' + (catalog.killers?.length || 1) + ' 名追猎者中选一名。能力说明采用豪宅数字版规则。'),
          globalThis.TerrorscapeTable.castPicker(catalog,setup)),
        h('div',{class:'field'},h('span',null,'可见范围'),h('div',{class:'segs'},segment('visibility','private','凭邀请链接'),segment('visibility','public','大厅公开'))),
        h('div',{class:'acts'},h('button',{type:'submit',class:'btn',disabled:S.busy || !!S.retry || setup.survivorIds.length!==3},signed?'创建房间':'登录并创建房间'))),retryBar()),
      h('details',{class:'limits'},h('summary',null,'豪宅场景规则与收录范围'),
        h('p',null,'幸存者在回合开始时带着五把钥匙在出口集合，或修好无线电并等到救援。追猎者让任意一名幸存者两次受伤即可获胜。'),
        h('ul',null,catalog.manifest.limitations.map(t=>h('li',null,t))),
        h('div',{class:'src'},catalog.manifest.sources.map(s=>h('a',{href:s.url,target:'_blank',rel:'noopener noreferrer'},s.title)))),
      h('p',{class:'hint'},h('a',{href:practiceUrl},'进入本地单人练习'))) ];
  }
  function waiting() {
    const room = S.room;
    const host = room.hostPlayerId === room.viewerPlayerId;
    const me = room.players.find(p => p.id === room.viewerPlayerId);
    const vacancies = room.capacity - room.players.length;
    const ready = room.players.every(p => p.id === room.hostPlayerId || p.ready);
    const locked = S.busy || Boolean(S.retry);
    const start = fillBots => run((r,rid) => S.api.start(r,{fillBots,requestId:rid}));
    const hunter = S.catalogs[MANOR_ID].killers?.find(p => p.id === (room.options.killerId || 'butcher'));
    const survivors = (room.options.survivorIds || ['william','anna','marco']).map(id =>
      S.catalogs[MANOR_ID].characters.find(p => p.id === id)?.name || id);
    const seatRows = Array.from({length:room.capacity},(_,i) => {
      const p = room.players[i];
      if (!p) return h('div',{class:'seat empty'},h('span',{class:'tok big ghost'},'+'),
        h('span',{class:'seat-name'},'空席'),h('span',{class:'seat-st'},'可邀请朋友或补人机'));
      return h('div',{class:'seat' + (p.ready || p.id === room.hostPlayerId ? ' ready' : '')},
        h('span',{class:'tok big',style:'--seat:#d9a870'},[...p.name][0]),
        h('span',{class:'seat-name'},p.name,p.id === room.viewerPlayerId ? h('em',null,'（我）') : null),
        h('span',{class:'seat-st'},p.id === room.hostPlayerId ? '房主' : p.ready ? '已准备' : '未准备'));
    });
    return [topbar(),h('section',{class:'wrap narrow ts-wait'},
      h('header',{class:'ts-lobby-banner'},h('p',{class:'eyebrow'},'TERRORSCAPE / 等待室'),h('h1',{class:'room-title'},room.name),
        h('p',null,'邀请链接在开局前接受新玩家。'),
        h('div',{class:'acts'},h('button',{class:'btn',type:'button',onclick:copyInvite},'复制邀请链接'),
          h('span',{class:'mono'},room.id))),
      h('div',{class:'h2row'},h('h2',null,'入座玩家'),h('span',{class:'mut'},room.players.length + ' / ' + room.capacity + ' 席')),
      h('div',{class:'seats'},seatRows),
      h('p',{class:'hint'},(room.options.killerSeat === 'first' ? '房主担任追猎者。' : '开局时末席担任追猎者，补位时可由电脑担任。') + '本局追猎者为' + (hunter?.name || '屠夫') + '，幸存者为' + survivors.join('、') + '。'),
      !ready ? h('p',{class:'status-line'},'等待其他玩家准备…') : null,
      h('div',{class:'acts'},host ? [
        h('button',{type:'button',class:'btn',disabled:locked || !ready,onclick:()=>start(vacancies > 0)},
          vacancies ? '补入 ' + vacancies + ' 名人机并开局' : '开始游戏'),
        vacancies > 0 && room.players.length >= 2 ? h('button',{type:'button',class:'btn ghost',disabled:locked || !ready,onclick:()=>start(false)},'仅真人开局') : null
      ] : h('button',{type:'button',class:'btn',disabled:locked,onclick:()=>run((r,rid)=>S.api.ready(r,!me.ready,{requestId:rid}))},me.ready?'取消准备':'准备'),
      armBtn('leave','离开房间','确定离开？',()=>run((r,rid)=>S.api.leave(r,{requestId:rid}))),deleteRoomButton(room)),
      retryBar())];
  }
  function dispose() { if(currentTable)currentTable.dispose(); currentTable=null;tableRoom=null; }
  function table() {
    const r = S.room;
    if (!currentTable || tableRoom !== r.id) {
      dispose();
      currentTable = globalThis.TerrorscapeTable.createTable({mode:'online',catalog:S.catalogs[MANOR_ID],lobby:'#/',onAction:act});
      tableRoom = r.id;
    }
    currentTable.update(r.game,r.status === 'closed' ? [] : r.legalActions,{roomId:r.id,seats:r.players,viewerId:r.viewerPlayerId,busy:S.busy || Boolean(S.retry),version:r.version,closed:r.status === 'closed'});
    return [retryBar(),currentTable.root,h('div',{class:'ts-room-admin'},h('span',null,'房间 '+r.id),
      h('button',{class:'btn ghost sm',type:'button',onclick:copyInvite},'复制房间链接'),
      r.status === 'playing' && r.viewerPlayerId === r.hostPlayerId ? armBtn('close','关闭房间','确认结束此房间？',()=>run((room,rid)=>S.api.close(room,{requestId:rid}))) : null,
      deleteRoomButton(r))];
  }
  return { landing, lobbyCard, waiting, table, dispose };
}
