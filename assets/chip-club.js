export const limitedChip = {
  id: 'lit', name: 'LITЖрисука', category: 'лимитированные', price: 199, weight: '100 г',
  description: 'Фиолетовая кукуруза, чёрная смородина и кислый лайм в фанатской серии с Михаилом Литвиным.',
  color: '#ff83dc', spiceLevel: 2, mascotPose: 'Светится в ультрафиолете',
  image: new URL('../images/drop-lit.webp', import.meta.url).href
};

const picture = name => new URL('../images/' + name + '.webp', import.meta.url).href;
const cases = [
  {name:'Классика чипсов', slug:'classic', ids:['cheese','cream','crab','tomato','salt','bacon']},
  {name:'Острые перцы', slug:'fire', ids:['dragon','mushroom','mango','cheddar']},
  {name:'Блогерские лимитки', slug:'underground', ids:['sus','lit','eclipse']},
  {name:'Бекон и BBQ', slug:'meat', ids:['troll','bacon']},
  {name:'Морские вкусы', slug:'sea', ids:['crab','kraken','shark','salt']},
  {name:'Фрукты и васаби', slug:'orbit', ids:['alien','wasabi','mango']},
  {name:'Сырное ассорти', slug:'cheese', ids:['cheese','cheddar','troll','shark']},
  {name:'Зелень и овощи', slug:'garden', ids:['tomato','cream','mushroom','wasabi']}

];
const multipliers = [1, 2, 3, 4];
const rarityLevels = {
  'классические': ['Обычная', 1],
  'мясные': ['Необычная', 2],
  'острые': ['Необычная', 2],
  'концептуальные': ['Редкая', 4],
  'лимитированные': ['Лимитка', 8]
};
const rarity = p => rarityLevels[p.category];
const upgradeOdds = (stake, prize, count) => Math.round(900 * rarity(stake)[1] / (rarity(prize)[1] * count)) / 10;
const percent = value => value.toLocaleString('ru-RU') + '%';
const empty = () => ({crumbs: 0, chips: {}});
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

  function usePrizes() {
    const {user,restoring}=useAccount();
    const owner=user?'account:'+user.email:'guest';
    const [snapshot,setSnapshot]=useState(null);
    useEffect(()=>{
      if(restoring)return;
      let active=true;
      const load=()=>albumFor(owner).then(album=>{if(active)setSnapshot({owner,chips:album.chips});})
        .catch(()=>{if(active)setSnapshot({owner,error:true});});
      load();
      window.addEventListener('chip-inventory',load);
      window.addEventListener('focus',load);
      return ()=>{active=false;window.removeEventListener('chip-inventory',load);window.removeEventListener('focus',load);};
    },[owner,restoring]);
    return !restoring && snapshot?.owner===owner?snapshot:null;
  }

  function Cart() {
    const {items,isCartOpen,setIsCartOpen,totalPrice,updateQuantity,addToCart}=useCart();
    const prizes=usePrizes();
    const ref=useRef(null);
    const close=()=>setIsCartOpen(false);
    useEffect(()=>{
      const dialog=ref.current;
      if(isCartOpen && !dialog.open)dialog.showModal();
      else if(!isCartOpen && dialog.open)dialog.close();
    },[isCartOpen]);
    const rows=products.map(product=>({
      product, paid:items.find(row=>row.product.id===product.id)?.quantity || 0,
      prize:prizes?.chips?.[product.id]
    })).filter(row=>row.paid || row.prize);
    return h('dialog',{ref,className:'one-cart','aria-labelledby':'cart-title',onCancel:close,
      onClick:event=>{if(event.target===ref.current)close();}},
      h('div',{className:'cart-shell'},
        h('header',null,h('h2',{id:'cart-title'},'Корзина'),h('button',{onClick:close,'aria-label':'Закрыть корзину'},'×')),
        h('div',{className:'cart-lines'},
          !prizes && h('p',null,'Загружаем пачки…'),
          prizes?.error && h('p',{role:'alert'},'Не удалось загрузить товары.'),
          prizes?.chips && !rows.length && h('p',null,'Корзина пуста. Выбери вкус в каталоге.'),
          ...rows.map(({product:p,paid,prize})=>h('article',{key:p.id},
            h('img',{src:p.image,alt:''}),
            h('div',null,h('h3',null,p.name),
              h('small',{className:'cart-pack-size'},p.weight,prize ? ' · '+prize.count+' шт. бесплатно' : ''),
              h('div',{className:'cart-qty'},
                h('button',{disabled:paid===0,onClick:()=>updateQuantity(p.id,paid-1),'aria-label':'Уменьшить '+p.name},'−'),
                h('span',null,paid+(prize?.count || 0)),h('button',{onClick:()=>addToCart(p),'aria-label':'Увеличить '+p.name},'+'),
                h('strong',null,paid*p.price+' ₽')))))),
        h('footer',null,items.length>0&&h(Link,{to:'/checkout',onClick:close,className:'acid-button'},'Оформить заказ · '+totalPrice+' ₽'),
          h('button',{onClick:close},'Продолжить покупки'))));
  }

  function Workshop() {
    const {hash,search} = useLocation();
    const selectedCase=cases.find(box=>box.slug===new URLSearchParams(search).get("case"));
    const view = hash === "#upgrade" ? "upgrade" : "cases";
    const {user, restoring} = useAccount();
    const owner = user ? 'account:' + user.email : 'guest';
    return h('main', {className:'club-page'}, h('div', {className:'club-wrap'},
      view==='cases' && selectedCase && h(Link,{to:'/club/#cases',className:'product-back'},'Все кейсы'),
      h('h1', null, view==='upgrade'?'Апгрейдер':selectedCase?'Кейс «'+selectedCase.name+'»':'Кейсы'),
      view==='cases' && !selectedCase ? h('div',{className:'crate-grid case-gallery',id:'cases'},...cases.map(item=>
        h(Link,{key:item.slug,to:'/club/?case='+item.slug+'#cases',style:{'--accent':product(item.ids[0]).color}},
          h('div',{className:'crate-stack'},...item.ids.slice(0,3).map(id=>h('img',{key:id,src:product(id).image,alt:''}))),
          h('strong',null,item.name),h('small',null,'Вкусов: '+item.ids.length)))):
      restoring ? h('p',null,'Загрузка…') : h(Album,{key:owner+view+(selectedCase?.slug||''),owner,view,box:selectedCase||cases[0]})));

  }

  function Album({owner, view, box}) {
    const [album, setAlbum] = useState(null);
    const [selected, select] = useState('');
    const [result, show] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const location=useLocation();
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
    const cart = useCart();
    const [menu, setMenu] = useState('');
    const sheet = useRef(null);
    useEffect(() => {
      const dialog = sheet.current;
      if (!menu || !dialog) return;
      dialog.showModal();
      const overflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      return () => { dialog.close(); document.documentElement.style.overflow = overflow; };
    }, [menu]);
    const [copies, setCopies] = useState(2);
    const [desired, setDesired] = useState('');
    const paid = id => cart.items.find(row => row.product.id === id)?.quantity || 0;
    const quantity = id => paid(id) + (items[id]?.count || 0);
    const owned = products.filter(p => quantity(p.id) > 0);
    const source = owned.find(p => p.id === selected) || owned[0];
    const options = products.filter(p => source && rarity(p)[1] >= rarity(source)[1] &&
      rarity(p)[1] * copies > rarity(source)[1]).sort((a,b) => rarity(a)[1] - rarity(b)[1]);
    const target = options.find(p => p.id === desired) || options[0];

    const chance = source && target ? upgradeOdds(source,target,copies) : 0;

    async function mutate(edit, animate, message, refund) {
      if (locked.current || !album) return;
      locked.current = true;
      setBusy(true); setError(''); show(null);
      try {
        let next;
        try { next = await albumFor(owner, edit); }
        catch (failure) { refund?.(); throw failure; }
        if (!active.current) return;
        const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : motionMs;
        animate(++round.current, duration);
        if (duration) await new Promise(resolve => setTimeout(resolve, duration));
        if (active.current) { setAlbum(next); show(message()); }
      } catch (e) {
        if (active.current) { setWheel(null); setError(e.name === 'Error' ? e.message : 'Не удалось сохранить коллекцию.'); }
      } finally { locked.current = false; if (active.current) setBusy(false); }
    }

    function openCase() {
      const id = dropFrom(box);
      const strip = Array.from({length:winnerSlot + 9}, () => dropFrom(box));
      strip[winnerSlot] = id;
      mutate(next => {
        next.chips[id] ||= {count:0, rank:0};
        next.chips[id].count += 1;

      }, (key, duration) => setReel({key, duration, strip}), () => ({id, text:'Из кейса «' + box.name + '» · +1 пачка в корзине.'}));
    }

    function upgrade() {
      if (!source || !target || locked.current || !album) return;
      const fromCart = !items[source.id]?.count;
      const fraction = random();
      const won = fraction * 100 < chance;
      const snapshot = {source,target,chance};
      setWheel({...snapshot, pending:true});
      if (fromCart) cart.updateQuantity(source.id, paid(source.id) - 1);
      mutate(next => {
        if (!fromCart) {
          const stake = next.chips[source.id];
          if (!stake?.count) throw new Error('Этой пачки уже нет в корзине.');
          if (--stake.count === 0) delete next.chips[source.id];
        }
        if (won) {
          next.chips[target.id] ||= {count:0};
          next.chips[target.id].count += copies;
        }
      }, (key, duration) => setWheel({...snapshot,key, duration, angle:fraction * 360}),
        () => ({id:won ? target.id : source.id, text:won ? 'В корзину добавлено: ' + copies + ' шт.' : 'Промах. Ставка в одну пачку списана.'}),
        fromCart ? () => cart.addToCart(source, 1, false) : undefined);
    }

    function choose(setter, value) {
      setter(value); setWheel(null); show(null);
    }
    function presets(label, values, current, setter, format) {
      return h('fieldset',{className:'up-presets'},h('legend',null,label),
        ...values.map(n=>h('button',{key:n, disabled:busy,'aria-pressed':current===n,onClick:()=>choose(setter,n)},format(n))));
    }
    const displayChance = busy && wheel ? wheel.chance : chance;
    const displayTarget = busy && wheel ? wheel.target : target;
    function picker(label, side, item) {
      return h('div',{className:'pack-slot'},h('small',null,label),
        h('button',{disabled:busy || (side==='source' ? !owned.length : !options.length),
          onClick:()=>setMenu(side),'aria-haspopup':'dialog','aria-label':label},
          item && h('img',{src:item.image,alt:''}),
          h('span',null,h('strong',null,item?.name || 'Нет пачки'),h('small',null,item ? rarity(item)[0] : '—')),
          h('b',null,'Выбрать')));
    }
    const pickingSource = menu === 'source';
    const list = pickingSource ? owned : options;
    const pickerDialog = h('dialog',{ref:sheet,className:'upgrade-sheet','aria-labelledby':'upgrade-sheet-title',
      onCancel:()=>setMenu(''),onClick:e=>{if(e.target===sheet.current)setMenu('');}},
      h('div',null,h('header',null,h('h2',{id:'upgrade-sheet-title'},pickingSource?'Пачка из корзины':'Выбери выигрыш'),
        h('button',{onClick:()=>setMenu(''),'aria-label':'Закрыть'},'×')),
        h('div',{className:'upgrade-list'},...list.map(p=>h('button',{key:p.id,'aria-pressed':p.id===(pickingSource?source:target)?.id,
          onClick:()=>{choose(pickingSource?select:setDesired,p.id);setMenu('');}},
          h('img',{src:p.image,alt:'',loading:'lazy'}),h('span',null,h('strong',null,p.name),h('small',null,rarity(p)[0])),
          h('b',null,pickingSource ? quantity(p.id)+' шт.' : percent(upgradeOdds(source,p,copies))))))));
    const reward=h('div', {role:'status', className:'club-result'}, result && h(React.Fragment, null,
        h('img', {src:product(result.id).image, alt:''}), h('div',null,h('strong',null,product(result.id).name),h('p',null,result.text))));
    return h(React.Fragment, null,
      h('div', {className:'club-machines view-'+view},
        h('section', {className:'club-box', id:'cases'},
          h('div', {className:'club-controls'},
            h('div', {className:'drop-reel', 'aria-hidden':true},
              h('div', {key:reel?.key ?? box.name, className:reel ? 'drop-track rolling' : 'drop-track',
                style:{'--travel':(-winnerSlot * 86 - 40) + 'px', '--run':(reel?.duration || 0) + 'ms'}},
                ...(reel?.strip || [...box.ids,...box.ids]).map((id,index) =>
                  h('div', {key:index, className:'drop-slot', 'data-chip':id,
                    style:{'--glow':product(id).color}}, h('img', {src:product(id).image, alt:''}))))),
            h('button',{className:'club-action case-spin',disabled:busy||!album,onClick:openCase},busy?'Прокрутка…':'Крутить'),
            view==='cases' && reward,
            h('ul',{className:'drop-odds','aria-label':'Шансы выпадения'},...box.ids.map((id,i)=>
              h('li',{key:id},h('img',{src:product(id).image,alt:''}),h('span',null,product(id).name),h('strong',null,tiers[box.ids.length][i]+'%')))))),
        h('section', {className:'club-up', id:'upgrade'},
          view==='upgrade' && h('div',{className:'up-board'},
            picker('Ставка · 1 пачка','source',busy ? wheel?.source || source : source),
            h('div',{className:'up-console'},
              h('div', {className:'upgrade-dial',style:{'--arc':displayChance+'%'}},
                h('div',{className:'dial-face'},displayTarget && h('img',{src:displayTarget.image,alt:''}),
                  h('strong',null,displayChance ? percent(displayChance) : '—'),h('small',null,'шанс выигрыша')),
                h('div',{key:wheel?.key ?? 'idle','aria-hidden':true,className:wheel && !wheel.pending && wheel.chance===displayChance?'dial-arm spinning':'dial-arm',
                  style:{'--angle':(1440+(wheel?.angle ?? 0))+'deg','--run':(wheel?.duration || 0)+'ms'}})),
              presets('Пачек при выигрыше',multipliers,copies,setCopies,n=>'×'+n),
              h('button',{className:'club-action',disabled:busy||!source||!target||!album,onClick:upgrade},busy?'Прокрутка…':'Крутить'),
              h('small',null,!source && !busy ? 'Добавь пачку из каталога или открой кейс.' : !target && !busy ? 'Для этой редкости выбери ×2 или больше.' : 'Чем реже выигрыш и больше пачек, тем ниже шанс. При промахе ставка сгорает.')),
            picker('Выигрыш · ×'+copies,'target',busy ? displayTarget : target),pickerDialog))),
      view==='upgrade' && reward,
      error && h('p', {role:'alert'}, error));
  }
  return {Workshop, Customers, Cart, usePrizes};
}
