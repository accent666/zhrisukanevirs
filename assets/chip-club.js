export const limitedChip = {
  id: 'lit', name: 'LITЖрисука', category: 'лимитированные', price: 199, weight: '100 г',
  description: 'Фиолетовая кукуруза, чёрная смородина и кислый лайм в фанатской серии с Михаилом Литвиным.',
  color: '#ff83dc', spiceLevel: 2, mascotPose: 'Светится в ультрафиолете',
  image: new URL('../images/drop-lit.webp', import.meta.url).href
};

const picture = name => new URL('../images/' + name + '.webp', import.meta.url).href;
const cases = [
  {name:'Классический', ids:['cheese','cream','crab','tomato','salt','bacon']},
  {name:'Огненный', ids:['dragon','mushroom','mango','cheddar']},
  {name:'Подземный', ids:['sus','lit','eclipse']},
  {name:'Мясной', ids:['troll','bacon']},
  {name:'Морской', ids:['crab','kraken','shark','salt']},
  {name:'Орбитальный', ids:['alien','wasabi','mango']},
  {name:'Сырная лавка', ids:['cheese','cheddar','troll','shark']},
  {name:'Огород', ids:['tomato','cream','mushroom','wasabi']}

];
const ranks = ['Классика', 'Неон', 'Хром', 'Ультра'];
const empty = () => ({crumbs: 0, chips: {}});
const modes = [
  {chance:35, surcharge:0}, {chance:65, surcharge:1}, {chance:90, surcharge:3}
];
const motionMs = 2800;
const winnerSlot = 28;
const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
const draw = ids => ids[Math.floor(random() * ids.length)];
let connection;

function database() {
  if (!connection) connection = new Promise((resolve, reject) => {
    const open = indexedDB.open('zhrisukanevirs-chip-club', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('albums');
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  }).catch(error => { connection = undefined; throw error; });
  return connection;
}

// Read and update an album inside one transaction, including simultaneous openings in two tabs.
async function albumFor(owner, change) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('albums', change ? 'readwrite' : 'readonly');
    const store = tx.objectStore('albums');
    const read = store.get(owner);
    let album, failure;
    read.onsuccess = () => {
      album = read.result || empty();
      if (!change) return;
      try { change(album); store.put(album, owner); }
      catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => resolve(album);
    tx.onabort = () => reject(failure || tx.error);
  });
}

export function createClub(React, products, useAccount, useCart, useLocation, Link) {
  const h = React.createElement;
  const {useState, useEffect, useRef} = React;
  const product = id => products.find(item => item.id === id);

  function Customers() {
    const {addToCart} = useCart();
    return h('main', {className:'club-page'},
      h('div', {className:'club-wrap'},
        h('h1', null, 'Наши постоянные покупатели'),
        h('article', {className:'club-person'},
          h('img', {src:picture('belov-alien'), alt:'Инопланетянин в лаймовой куртке с начос'}),
          h('div', {className:'club-bio'},
            h('h2', null, 'Ярослав Белов'),
            h('p', null, 'Лимитированная серия клуба'),
            h('div', {className:'club-pick'},
              h('img', {src:limitedChip.image, alt:'Лимитированная пачка LITЖрисука'}),
              h('div', null, h('h3', null, limitedChip.name), h('p', null, 'Смородина и лайм · 100 г'),
                h('button', {className:'club-action', onClick:()=>addToCart(limitedChip)}, 'В корзину · 199 ₽')))))));
  }

  function Workshop() {
    const {hash} = useLocation();
    const view = hash === "#upgrade" ? "upgrade" : hash === "#cases" ? "cases" : "both";
    const {user, restoring} = useAccount();
    const owner = user ? 'account:' + user.email : 'guest';
    return h('main', {className:'club-page'}, h('div', {className:'club-wrap'},
      h('h1', null, 'Кейсы и апгрейдер'),
      h('nav',{className:'game-jumps','aria-label':'Режим игрового клуба'},
        h(Link,{to:'/club/#cases','aria-current':view==='cases'?'page':undefined},'Кейсы'),
        h(Link,{to:'/club/#upgrade','aria-current':view==='upgrade'?'page':undefined},'Апгрейдер')),
      restoring ? h('p', null, 'Открываем коллекцию…') : h(Album, {key:owner, owner, view})));
  }

  function Album({owner, view}) {
    const [album, setAlbum] = useState(null);
    const [caseIndex, setCase] = useState(0);
    const [selected, select] = useState('');
    const [result, show] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [modeIndex, setMode] = useState(1);
    const [reel, setReel] = useState(null);
    const [wheel, setWheel] = useState(null);
    const round = useRef(0);
    const active = useRef(true);
    const locked = useRef(false);
    useEffect(() => {
      active.current = true;
      let cancelled = false;
      const refresh = () => albumFor(owner).then(next => {
        if (!cancelled && !locked.current) setAlbum(next);
      }).catch(() => { if (!cancelled) setError('Не удалось открыть коллекцию. Разреши хранение данных и обнови страницу.'); });
      refresh();
      window.addEventListener('focus', refresh);
      return () => { cancelled = true; active.current = false; window.removeEventListener('focus', refresh); };
    }, [owner]);
    const items = album?.chips || {};
    const owned = products.filter(item => items[item.id]);
    const target = owned.find(item => item.id === selected) || owned[0];
    const rank = target ? items[target.id].rank : 0;
    const mode = modes[modeIndex];
    const cost = rank + 1 + mode.surcharge;
    const box = cases[caseIndex];

    async function mutate(edit, animate, message) {
      if (locked.current || !album) return;
      locked.current = true;
      setBusy(true); setError(''); show(null);
      try {
        const next = await albumFor(owner, edit);
        if (!active.current) return;
        const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : motionMs;
        animate(++round.current, duration);
        if (duration) await new Promise(resolve => setTimeout(resolve, duration));
        if (active.current) { setAlbum(next); show(message()); }
      } catch (e) {
        if (active.current) setError(e.name === 'Error' ? e.message : 'Не удалось сохранить коллекцию.');
      } finally { locked.current = false; if (active.current) setBusy(false); }
    }

    function openCase() {
      const id = draw(box.ids);
      const strip = Array.from({length:winnerSlot + 9}, () => draw(box.ids));
      strip[winnerSlot] = id;
      mutate(next => {
        next.chips[id] ||= {count:0, rank:0};
        next.chips[id].count += 1;
        next.crumbs += 1;
      }, (key, duration) => setReel({key, duration, strip}), () => ({id, text:'Из кейса «' + box.name + '» · +1 пачка и +1 крошка.'}));
    }

    function upgrade() {
      const id = target.id;
      const fraction = random();
      const won = fraction < mode.chance / 100;
      const angle = fraction * 360;
      mutate(next => {
        const chip = next.chips[id];
        if (chip.rank !== rank || rank >= ranks.length - 1 || next.crumbs < cost)
          throw new Error('Баланс изменился. Обнови страницу и выбери вкус ещё раз.');
        next.crumbs -= cost;
        if (won) chip.rank += 1;
      }, (key, duration) => setWheel({key, duration, angle, id}),
        () => ({id, text:won ? target.name + ' получает ранг «' + ranks[rank + 1] + '».'
          : 'Стрелка вне сектора. Вкус и ранг сохранены.'}));
    }

    return h(React.Fragment, null,
      h('div', {className:'club-machines view-'+view},
        h('section', {className:'club-box', id:'cases'},
          h('div', {className:'club-controls'},
            h('h2',null,'Выбери кейс'),
            h('div',{className:'crate-grid'},...cases.map((item,i)=>h('button',{
              key:item.name, disabled:busy, 'aria-pressed':caseIndex===i,
              style:{'--accent':product(item.ids[0]).color},
              onClick:()=>{setCase(i);setReel(null);show(null);}},
              h('div',{className:'crate-stack'},...item.ids.slice(0,3).map(id=>h('img',{key:id,src:product(id).image,alt:''}))),
              h('strong',null,item.name),h('small',null,'Вкусов: '+item.ids.length)))),
            h('h3',null,'Кейс «'+box.name+'»'),
            h('div', {className:'drop-reel', 'aria-hidden':true},
              h('div', {key:reel?.key ?? box.name, className:reel ? 'drop-track rolling' : 'drop-track',
                style:{'--travel':(-winnerSlot * 86 - 40) + 'px', '--run':(reel?.duration || 0) + 'ms'}},
                ...(reel?.strip || [...box.ids,...box.ids]).map((id,index) =>
                  h('div', {key:index, className:'drop-slot', 'data-chip':id,
                    style:{'--glow':product(id).color}}, h('img', {src:product(id).image, alt:''}))))),
            h('p', null, 'У всех вкусов в кейсе равный шанс. За открытие — одна крошка.'),
            h('details', null, h('summary', null, 'Что внутри'), h('p', null, box.ids.map(id => product(id).name).join(' · '))),
            h('button', {className:'club-action', disabled:busy || !album, onClick:openCase}, 'Открыть бесплатно'))),
        h('section', {className:'club-up', id:'upgrade'},
          h('div', {className:'club-balance'}, 'Крошки ', h('strong', null, album?.crumbs ?? '…')),
          h('h2', null, 'Апгрейдер'), h('p', null, 'Выбери вкус и потрать крошки, чтобы поднять его ранг.'),
          h('div', {className:'upgrade-dial', style:{'--arc':mode.chance+'%'}},
            h('div', {className:'dial-face'}, target && h('img',{src:target.image,alt:''}),
              h('strong',null,mode.chance+'%'), h('small',null,'шанс улучшения')),
            h('div', {key:wheel?.key ?? 'idle', 'aria-hidden':true,
              className:wheel ? 'dial-arm spinning' : 'dial-arm',
              style:{'--angle':(1440 + (wheel?.angle ?? 0))+'deg', '--run':(wheel?.duration || 0)+'ms'}})),
          target ? h(React.Fragment, null,
            h('fieldset',{className:'chip-picker'},h('legend',null,'Выбери пачку из коллекции'),
              h('div',null,...owned.map(item=>h('button',{key:item.id,disabled:busy,'aria-pressed':item.id===target.id,
                onClick:()=>{select(item.id);setWheel(null);show(null);}},
                h('img',{src:item.image,alt:''}),h('span',null,item.name,h('small',null,ranks[items[item.id].rank]+' · ×'+items[item.id].count)))))),
            h('div', {className:'club-switch', role:'group', 'aria-label':'Шанс улучшения'},
              ...modes.map((option,i)=>h('button',{key:option.chance, disabled:busy || rank===3,
                'aria-pressed':modeIndex===i, onClick:()=>{setMode(i);setWheel(null);}},option.chance+'%'))),
            h('small',null,'Попади стрелкой в лаймовый сектор. При промахе расходуются только крошки.'),
            h('div', {className:'club-rank'}, ranks[rank], rank < 3 && ' → ' + ranks[rank+1]),
            h('button', {className:'club-action', onClick:upgrade, disabled:busy || rank===3 || album.crumbs<cost},
              rank===3 ? 'Максимальный ранг' : 'Улучшить за ' + cost + ' кр.'))
            : h('p', {className:'club-tip'}, 'Открой первый кейс, чтобы выбрать чипсы.'))),
      h('div', {role:'status', className:'club-result'}, result && h(React.Fragment, null,
        h('img', {src:product(result.id).image, alt:''}), h('div',null,h('strong',null,product(result.id).name),h('p',null,result.text)))),
      error && h('p', {role:'alert'}, error),
      h('section', {className:'club-album'},
        h('header', null, h('h2', null, 'Альбом вкусов'), h('span', null, owned.length + ' / ' + products.length)),
        h('div', {className:'club-shelf'}, ...products.map(item => {
          const chip = items[item.id];
          return h('article', {key:item.id, className:chip ? 'found' : ''},
            h('img', {src:item.image, alt:'', loading:'lazy'}), h('div', null, h('h3', null, item.name),
              h('small', null, chip ? ranks[chip.rank] + ' · ×' + chip.count : 'Ещё не открыт')));
        }))));
  }
  return {Workshop, Customers};
}
