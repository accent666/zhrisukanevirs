export const limitedChip = {
  id: 'lit', name: 'LITЖрисука', category: 'лимитированные', price: 199, weight: '100 г',
  description: 'Фиолетовая кукуруза, чёрная смородина и кислый лайм в голографической пачке.',
  color: '#ff83dc', spiceLevel: 2, mascotPose: 'Светится в ультрафиолете',
  image: new URL('../images/lit.webp', import.meta.url).href
};

const picture = name => new URL('../images/' + name + '.webp', import.meta.url).href;
const cases = [
  {name: 'Огненный', ids: ['dragon', 'mushroom', 'mango', 'cheddar', 'troll']},
  {name: 'Орбитальный', ids: ['kraken', 'alien', 'shark', 'wasabi', 'lit']}
];
const ranks = ['Классика', 'Неон', 'Хром', 'Ультра'];
const empty = () => ({crumbs: 0, chips: {}});
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

export function createClub(React, products, useAccount, useCart) {
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
    const {user, restoring} = useAccount();
    const owner = user ? 'account:' + user.email : 'guest';
    return h('main', {className:'club-page'}, h('div', {className:'club-wrap'},
      h('h1', null, 'Кейсы и апгрейдер'),
      restoring ? h('p', null, 'Открываем коллекцию…') : h(Album, {key:owner, owner})));
  }

  function Album({owner}) {
    const [album, setAlbum] = useState(null);
    const [caseIndex, setCase] = useState(0);
    const [selected, select] = useState('');
    const [result, show] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
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
    const cost = (rank + 1) * 2;
    const box = cases[caseIndex];

    async function mutate(edit, message) {
      if (locked.current || !album) return;
      locked.current = true;
      setBusy(true); setError('');
      try {
        const next = await albumFor(owner, edit);
        if (active.current) { setAlbum(next); show(message(next)); }
      } catch (e) {
        if (active.current) setError(e.name === 'Error' ? e.message : 'Не удалось сохранить коллекцию.');
      } finally { locked.current = false; if (active.current) setBusy(false); }
    }

    function openCase() {
      const id = box.ids[Math.floor(Math.random() * box.ids.length)];
      mutate(next => {
        next.chips[id] ||= {count:0, rank:0};
        next.chips[id].count += 1;
        next.crumbs += 1;
      }, () => ({id, text:'Из кейса выпал вкус «' + product(id).name + '». +1 крошка.'}));
    }

    function upgrade() {
      const id = target.id;
      mutate(next => {
        const chip = next.chips[id];
        if (chip.rank !== rank || rank >= ranks.length - 1 || next.crumbs < cost)
          throw new Error('Баланс изменился. Обнови страницу и выбери вкус ещё раз.');
        next.crumbs -= cost;
        chip.rank += 1;
      }, () => ({id, text:target.name + ' получает ранг «' + ranks[rank + 1] + '».'}));
    }

    return h(React.Fragment, null,
      h('div', {className:'club-machines'},
        h('section', {className:'club-box'},
          h('img', {className:'crate-art', src:picture('crate'), alt:'Кейс с неоновыми замками'}),
          h('div', {className:'club-controls'},
            h('h2', null, 'Открыть кейс'),
            h('div', {className:'club-switch'}, ...cases.map((item,i) =>
              h('button', {key:item.name, onClick:()=>setCase(i), 'aria-pressed':caseIndex===i}, item.name))),
            h('p', null, 'Внутри один из пяти вкусов и одна крошка.'),
            h('details', null, h('summary', null, 'Что внутри'), h('p', null, box.ids.map(id => product(id).name).join(' · '))),
            h('button', {className:'club-action', disabled:busy || !album, onClick:openCase}, 'Открыть бесплатно'))),
        h('section', {className:'club-up'},
          h('div', {className:'club-balance'}, 'Крошки ', h('strong', null, album?.crumbs ?? '…')),
          h('h2', null, 'Апгрейдер'), h('p', null, 'Выбери вкус и потрать крошки, чтобы поднять его ранг.'),
          target ? h(React.Fragment, null,
            h('label', null, 'Вкус из коллекции', h('select', {value:target.id, onChange:e=>select(e.target.value)},
              ...owned.map(item=>h('option', {key:item.id,value:item.id}, item.name)))),
            h('div', {className:'club-rank'}, ranks[rank], rank < 3 && ' → ' + ranks[rank+1]),
            h('button', {className:'club-action', onClick:upgrade, disabled:busy || rank===3 || album.crumbs<cost},
              rank===3 ? 'Максимальный ранг' : 'Улучшить за ' + cost + ' кр.'))
            : h('p', {className:'club-tip'}, 'Открой первый кейс, чтобы выбрать чипсы.'))),
      h('div', {role:'status', className:'club-result'}, result && h(React.Fragment, null,
        h('img', {src:product(result.id).image, alt:''}), h('span', null,result.text))),
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
