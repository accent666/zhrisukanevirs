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
const upgradeChance = [90,65,35,0];
const tiers = {2:[70,30],3:[55,30,15],4:[45,30,17,8],6:[33,25,18,12,8,4]};
function dropFrom(box) {
  let roll=random()*100;
  const chances=tiers[box.ids.length];
  for (let i=0;i<chances.length;i++) {
    roll-=chances[i];
    if (roll<0) return box.ids[i];
  }
  return box.ids[box.ids.length-1];
}
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
    tx.oncomplete = () => {
      if(change) window.dispatchEvent(new CustomEvent('chip-inventory',{detail:owner}));
      resolve(album);
    };
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

  function Inventory({close}) {
    const {user,restoring}=useAccount();
    const owner=user?'account:'+user.email:'guest';
    const [opened,setOpened]=useState(false);
    const [snapshot,setSnapshot]=useState(null);
    const [search,setSearch]=useState('');
    useEffect(()=>{
      if(!opened || restoring)return;
      let active=true;
      const load=()=>albumFor(owner).then(album=>{if(active)setSnapshot({owner,album});})
        .catch(()=>{if(active)setSnapshot({owner,error:true});});
      load();
      window.addEventListener('chip-inventory',load);
      window.addEventListener('focus',load);
      return ()=>{active=false;window.removeEventListener('chip-inventory',load);window.removeEventListener('focus',load);};
    },[opened,owner,restoring]);
    const current=!restoring && snapshot?.owner===owner?snapshot:null;
    const owned=products.filter(p=>current?.album?.chips[p.id]);
    const list=owned.filter(p=>p.name.toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru')));
    return h('div',{className:'inventory-area '+(opened?'inventory-open':'')},
      h('div',{className:'inv-tabs'},...['Покупки','Инвентарь'].map((label,i)=>h('button',{
        key:label,'aria-pressed':opened===Boolean(i),onClick:()=>setOpened(Boolean(i))},label))),
      opened && h('section',null,h('h3',null,'Мои чипсы'),
        !current?h('p',null,'Загрузка…'):current.error?h('p',null,'Не удалось загрузить инвентарь.'):
        owned.length?h(React.Fragment,null,
          h('input',{type:'search','aria-label':'Найти вкус',placeholder:'Найти вкус',value:search,onChange:e=>setSearch(e.target.value)}),
          list.length===0&&h('p',null,'Такого вкуса нет.'),
          ...list.map(p=>h(Link,{key:p.id,to:'/club/?chip='+p.id+'#upgrade',onClick:close,className:'inv-item'},
            h('img',{src:p.image,alt:''}),h('span',null,h('strong',null,p.name),
            h('small',null,ranks[current.album.chips[p.id].rank]+' · ×'+current.album.chips[p.id].count)),h('b',null,'→')))):
          h(React.Fragment,null,h('p',null,'Здесь появятся пачки из кейсов.'),h(Link,{to:'/club/#cases',onClick:close},'Выбрать кейс →'))));
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
    const location=useLocation();
    const [filter,setFilter]=useState('');
    const requestedChip=new URLSearchParams(location.search).get('chip');
    useEffect(()=>{if(requestedChip){select(requestedChip);setWheel(null);show(null);}},[requestedChip,location.key]);
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
    const chance=upgradeChance[rank];
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
      const id = dropFrom(box);
      const strip = Array.from({length:winnerSlot + 9}, () => dropFrom(box));
      strip[winnerSlot] = id;
      mutate(next => {
        next.chips[id] ||= {count:0, rank:0};
        next.chips[id].count += 1;

      }, (key, duration) => setReel({key, duration, strip}), () => ({id, text:'Из кейса «' + box.name + '» · +1 пачка в инвентаре.'}));
    }

    function upgrade() {
      const id = target.id;
      const fraction = random();
      const won = fraction < chance / 100;
      const angle = fraction * 360;
      mutate(next => {
        const chip = next.chips[id];
        if (chip.rank !== rank || rank >= ranks.length - 1)
          throw new Error('Баланс изменился. Обнови страницу и выбери вкус ещё раз.');

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
            h('ul',{className:'drop-odds','aria-label':'Шансы выпадения'},...box.ids.map((id,i)=>
              h('li',{key:id},h('img',{src:product(id).image,alt:''}),h('span',null,product(id).name),h('strong',null,tiers[box.ids.length][i]+'%')))),
            h('button', {className:'club-action', disabled:busy || !album, onClick:openCase}, busy?'Прокрутка…':'Крутить'))),
        h('section', {className:'club-up', id:'upgrade'},
          h('h2', null, 'Апгрейдер'), h('p', null, 'Выбери пачку из инвентаря. С каждым рангом шанс улучшения ниже.'),
          h('div', {className:'upgrade-dial', style:{'--arc':chance+'%'}},
            h('div', {className:'dial-face'}, target && h('img',{src:target.image,alt:''}),
              h('strong',null,rank===3?'MAX':chance+'%'), h('small',null,'шанс улучшения')),
            h('div', {key:wheel?.key ?? 'idle', 'aria-hidden':true,
              className:wheel ? 'dial-arm spinning' : 'dial-arm',
              style:{'--angle':(1440 + (wheel?.angle ?? 0))+'deg', '--run':(wheel?.duration || 0)+'ms'}})),
          target ? h(React.Fragment, null,
            h('fieldset',{className:'chip-picker'},h('legend',null,'Выбери пачку из коллекции'),
              owned.length>4 && h('input',{type:'search',value:filter,'aria-label':'Поиск по инвентарю',placeholder:'Найти пачку',onChange:e=>setFilter(e.target.value)}),
              h('div',null,...owned.filter(item=>item.name.toLowerCase().includes(filter.trim().toLowerCase())).map(item=>h('button',{key:item.id,disabled:busy,'aria-pressed':item.id===target.id,
                onClick:()=>{select(item.id);setWheel(null);show(null);}},
                h('img',{src:item.image,alt:''}),h('span',null,item.name,h('small',null,ranks[items[item.id].rank]+' · ×'+items[item.id].count)))))),
            h('small',null,'При попадании в лаймовый сектор ранг растёт. При промахе пачка остаётся у тебя.'),
            h('div', {className:'club-rank'}, ranks[rank], rank < 3 && ' → ' + ranks[rank+1]),
            h('button', {className:'club-action', onClick:upgrade, disabled:busy || rank===3},
              rank===3 ? 'Максимальный ранг' : busy?'Прокрутка…':'Крутить'))
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
  return {Workshop, Customers, Inventory};
}
