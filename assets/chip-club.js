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
const rarityLevels = {
  'классические': ['Обычная', 1],
  'мясные': ['Необычная', 2],
  'острые': ['Необычная', 2],
  'концептуальные': ['Редкая', 4],
  'лимитированные': ['Лимитка', 8]
};
const rarity = p => rarityLevels[p.category];
function offersFor(stake, products) {
  if (!stake) return [];
  const level = rarity(stake)[1];
  const used = new Set();
  const offers = [];
  for (const factor of [2,3,4,6]) {
    const candidates = products.filter(p => p.id !== stake.id && !used.has(p.id) &&
      rarity(p)[1] >= level && Number.isInteger(level * factor / rarity(p)[1]));
    candidates.sort((a,b) => rarity(b)[1] - rarity(a)[1] || a.id.localeCompare(b.id));
    const prize = candidates[0];
    if (!prize) continue;
    used.add(prize.id);
    offers.push({prize, factor, count:level * factor / rarity(prize)[1], chance:90 / factor});
  }
  return offers;
}
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
export function createClub(React, products, useAccount, useCart, useLocation, Link) {
  const h = React.createElement;
  const {useState, useEffect, useRef} = React;
  const product = id => products.find(item => item.id === id);

  function Customers() {
    const buy = useBuy();
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
                h('button', {className:'club-action', onClick:()=>buy(limitedChip)}, 'Купить · 199 ₽')))))));
  }

  function useBuy() {
    const {user, setIsAuthOpen, transact} = useAccount();
    const {setIsCartOpen} = useCart();
    return async (item,count=1) => {
      if (!user) { setIsAuthOpen(true); return; }
      let notice;
      try {
        await transact(record => {
          const price = product(item.id).price;
          if (!Number.isSafeInteger(count) || count < 1 || count > 99) throw new Error('Проверь количество.');
          const total = price * count;
          if (record.balance < total) throw new Error('Недостаточно средств. Нужно '+total+' ₽, на балансе '+record.balance+' ₽.');
          record.balance -= total;
          record.chips[item.id] = (record.chips[item.id] || 0) + count;
          record.orders.unshift({id:crypto.randomUUID(),date:new Date().toLocaleDateString('ru-RU'),status:'Куплено',
            total,items:[{name:item.name,quantity:count,price}]});
          record.teeth += Math.floor(total / 100);
        });
        notice = 'Куплено: '+item.name+' ×'+count;
      } catch (error) { notice=error.message; }
      window.dispatchEvent(new CustomEvent('purchase-notice',{detail:notice}));
      setIsCartOpen(true);
    };
  }

  function Cart() {
    const {isCartOpen,setIsCartOpen}=useCart();
    const {user,chips,balance,transact}=useAccount();
    const [notice,tell]=useState('');
    const ref=useRef(null);
    useEffect(()=>{const listen=e=>tell(e.detail);window.addEventListener('purchase-notice',listen);
      return ()=>window.removeEventListener('purchase-notice',listen);},[]);
    useEffect(()=>{if(isCartOpen)ref.current.showModal();else {ref.current.close();tell('');}},[isCartOpen]);
    const rows=products.filter(p=>chips[p.id]>0);
    async function remove(id,all) {
      try {await transact(record=>{
        if(all || record.chips[id]<=1)delete record.chips[id];else if(record.chips[id])record.chips[id]--;
      });tell('Товар удалён.');} catch(e){tell(e.message);}
    }
    const close=()=>setIsCartOpen(false);
    return h('dialog',{ref,className:'one-cart','aria-label':'Корзина',onCancel:close,onClick:e=>{if(e.target===ref.current)close();}},
      h('div',{className:'cart-shell'},h('header',null,h('h2',null,'Корзина'),h('button',{onClick:close,'aria-label':'Закрыть корзину'},'×')),
        h('div',{className:'cart-lines'},notice && h('p',{role:'status'},notice),
          !rows.length && h('p',null,'Корзина пуста.'),
          ...rows.map(p=>h('article',{key:p.id},h('img',{src:p.image,alt:''}),h('div',null,h('h3',null,p.name),
            h('small',null,chips[p.id]+' шт. · '+p.weight),h('div',{className:'cart-qty'},
            h('button',{onClick:()=>remove(p.id,false),'aria-label':'Убрать одну пачку '+p.name},'−1'),
            h('button',{onClick:()=>remove(p.id,true)},'Удалить')))))),
        h('footer',null,user && h('strong',null,'Баланс · '+balance+' ₽'),h('button',{onClick:close},'Продолжить покупки'))));
  }

  function Workshop() {
    const {hash,search} = useLocation();
    const selectedCase=cases.find(box=>box.slug===new URLSearchParams(search).get("case"));
    const view = hash === "#upgrade" ? "upgrade" : "cases";
    const {user, restoring,setIsAuthOpen} = useAccount();
    const owner = user ? 'account:' + user.email : 'guest';
    return h('main', {className:'club-page'}, h('div', {className:'club-wrap'},
      view==='cases' && selectedCase && h(Link,{to:'/club/#cases',className:'product-back'},'Все кейсы'),
      h('h1', null, view==='upgrade'?'Апгрейдер':selectedCase?'Кейс «'+selectedCase.name+'»':'Кейсы'),
      view==='cases' && !selectedCase ? h('div',{className:'crate-grid case-gallery',id:'cases'},...cases.map(item=>
        h(Link,{key:item.slug,to:'/club/?case='+item.slug+'#cases',style:{'--accent':product(item.ids[0]).color}},
          h('div',{className:'crate-stack'},...item.ids.slice(0,3).map(id=>h('img',{key:id,src:product(id).image,alt:''}))),
          h('strong',null,item.name),h('small',null,'Вкусов: '+item.ids.length)))):
      restoring ? h('p',null,'Загрузка…') : !user ? h('button',{className:'club-action',onClick:()=>setIsAuthOpen(true)},'Войти или зарегистрироваться') : h(Album,{key:owner+view+(selectedCase?.slug||''),owner,view,box:selectedCase||cases[0]})));

  }

  function Album({owner, view, box}) {
    const {chips:items,transact} = useAccount();
    const [selected, select] = useState('');
    const [result, show] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [reel, setReel] = useState(null);
    const [wheel, setWheel] = useState(null);
    const round = useRef(0);
    const active = useRef(true);
    const locked = useRef(false);
    useEffect(()=>{active.current=true;return ()=>{active.current=false;};},[]);
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
    const [choice,setChoice] = useState(null);
    const owned = products.filter(p => items[p.id] > 0);
    const source = owned.find(p => p.id === selected);
    const offers = offersFor(source,products);
    const offer = offers.find(o=>o.factor===choice);
    const target = offer?.prize;
    const chance = offer?.chance || 0;

    async function mutate(edit, animate, message) {
      if (locked.current) return;
      locked.current = true;
      setBusy(true); setError(''); show(null);
      try {
        await transact(edit);
        if (!active.current) return;
        const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : motionMs;
        animate(++round.current, duration);
        if (duration) await new Promise(resolve => setTimeout(resolve, duration));
        if (active.current) { show(message()); if(view==='upgrade'){select('');setChoice(null);setWheel(null);} }
      } catch (e) {
        if (active.current) { setWheel(null); setError(e.name === 'Error' ? e.message : 'Не удалось сохранить коллекцию.'); }
      } finally { locked.current = false; if (active.current) setBusy(false); }
    }

    function openCase() {
      const id = dropFrom(box);
      const strip = Array.from({length:winnerSlot + 9}, () => dropFrom(box));
      strip[winnerSlot] = id;
      mutate(next => {
        next.chips[id] = (next.chips[id] || 0) + 1;

      }, (key, duration) => setReel({key, duration, strip}), () => ({id, text:'Из кейса «' + box.name + '» · +1 пачка в корзине.'}));
    }

    function upgrade() {
      if (!source || !offer || locked.current) return;
      const fraction = random();
      const won = fraction * 100 < chance;
      const snapshot = {source,target,chance,count:offer.count};
      setWheel({...snapshot,pending:true});
      mutate(record => {
        if (!record.chips[source.id]) throw new Error('Этой пачки уже нет в корзине.');
        if (--record.chips[source.id]===0) delete record.chips[source.id];
        if (won) record.chips[target.id] = (record.chips[target.id] || 0) + offer.count;
      }, (key,duration)=>setWheel({...snapshot,key,duration,angle:fraction*360}),
        ()=>({id:won?target.id:source.id,text:won?'Выигрыш в корзине · '+offer.count+' шт.':'Промах. Ставка списана.'}));
    }
    const displayChance = wheel?.chance ?? chance;
    const displayTarget = wheel?.target || target;
    function slot(label,item,left) {
      const body=[item && h('img',{key:'img',src:item.image,alt:''}),
        h('strong',{key:'name'},item?.name || (left?'Выбрать пачку':'Выигрыш')),
        h('small',{key:'meta'},item ? rarity(item)[0]+(left?'':' · '+(wheel?.count ?? offer?.count)+' шт.') : (left?'Из корзины':'По шансу или ×'))];
      return h('div',{className:'stake-slot'},h('small',null,label),left ?
        h('button',{onClick:()=>setMenu('source'),disabled:busy,'aria-haspopup':'dialog'},...body) :
        h('div',{className:'auto-prize','aria-live':'polite'},...body));
    }
    const pickerDialog = h('dialog',{ref:sheet,className:'upgrade-sheet','aria-label':'Пачки из корзины',onCancel:()=>setMenu(''),
      onClick:e=>{if(e.target===sheet.current)setMenu('');}},h('div',null,h('header',null,h('h2',null,'Пачки из корзины'),
        h('button',{onClick:()=>setMenu(''),'aria-label':'Закрыть'},'×')),
        h('div',{className:'upgrade-list'},!owned.length && h('p',null,'Корзина пуста. Купи пачку или открой кейс.'),
          ...owned.map(p=>h('button',{key:p.id,onClick:()=>{select(p.id);setChoice(null);setWheel(null);show(null);setMenu('');}},
            h('img',{src:p.image,alt:''}),h('span',null,p.name,h('small',null,rarity(p)[0])),h('b',null,items[p.id]+' шт.'))))));
    function presets(label,format) {
      return h('fieldset',{className:'up-presets'},h('legend',null,label),...offers.map(o=>h('button',{
        key:o.factor,disabled:busy,'aria-pressed':choice===o.factor,onClick:()=>{setChoice(o.factor);setWheel(null);show(null);}},format(o))));
    }
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
            h('button',{className:'club-action case-spin',disabled:busy,onClick:openCase},busy?'Прокрутка…':'Крутить'),
            view==='cases' && reward,
            h('ul',{className:'drop-odds','aria-label':'Шансы выпадения'},...box.ids.map((id,i)=>
              h('li',{key:id},h('img',{src:product(id).image,alt:''}),h('span',null,product(id).name),h('strong',null,tiers[box.ids.length][i]+'%')))))),
        h('section', {className:'club-up', id:'upgrade'},
          view==='upgrade' && h('div',{className:'upgrade-station'},
              h('div', {className:'upgrade-dial',style:{'--arc':displayChance+'%'}},
                h('div',{className:'dial-face'},displayTarget && h('img',{src:displayTarget.image,alt:''}),
                  h('strong',null,displayChance ? percent(displayChance) : '—'),h('small',null,'шанс выигрыша')),
                h('div',{key:wheel?.key ?? 'idle','aria-hidden':true,className:wheel && !wheel.pending && wheel.chance===displayChance?'dial-arm spinning':'dial-arm',
                  style:{'--angle':(1440+(wheel?.angle ?? 0))+'deg','--run':(wheel?.duration || 0)+'ms'}})),
              h('div',{className:'stake-slots'},slot('Ставка',wheel?.source || source,true),slot('Приз',displayTarget,false)),
              source && h('div',{className:'odds-choices'},presets('Шанс',o=>percent(o.chance)),presets('Ценность выигрыша',o=>'×'+o.factor)),
              h('small',null,source?'Чем больше ценность выигрыша, тем ниже шанс. Ставка — одна пачка.':'Выбери пачку в левой ячейке.'),
              h('button',{className:'club-action',disabled:busy||!offer,onClick:upgrade},busy?'Прокрутка…':'Крутить'),pickerDialog))),
      view==='upgrade' && reward,
      error && h('p', {role:'alert'}, error));
  }
  return {Workshop, Customers, Cart, useBuy};
}
