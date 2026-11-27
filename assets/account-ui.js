import {registerAccount, logIn, restoreSession, endSession, onSessionChange, updateAccount} from './account-db.js?v=11';

const mascot = new URL('../images/mascot-hero.png', import.meta.url).href;
const fields = [['name', 'Имя', 'name'], ['email', 'Почта', 'email'],
  ['phone', 'Телефон', 'tel'], ['city', 'Город', 'address-level2'],
  ['address', 'Адрес', 'street-address']];
const tabs = [['orders', 'Мои заказы'], ['profile', 'Профиль'], ['teeth', 'Зубы'], ['donate','Донат']];
const rubles = new Intl.NumberFormat('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0});

function errorText(error) {
  return error.name === 'Error' ? error.message : 'Не удалось сохранить данные в браузере. Попробуй ещё раз.';
}

export function createAccountUI(React, Context, useUser, useNavigate, useLocation) {
  const {createElement: el, useEffect, useRef, useState} = React;

  function button(label, onClick, className, props = {}) {
    return el('button', {type: 'button', className, onClick, ...props}, label);
  }

  function Provider({children}) {
    const [account, setAccount] = useState(null);
    const [restoring, setRestoring] = useState(true);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const revision = useRef(0);

    useEffect(() => {
      let active = true;
      async function refresh() {
        const attempt = ++revision.current;
        const current = await restoreSession().catch(() => null);
        if (active && attempt === revision.current) {
          setAccount(current);
          setRestoring(false);
        }
      }
      refresh();
      const unsubscribe = onSessionChange(refresh);
      return () => { active = false; unsubscribe(); };
    }, []);

    const authenticate = async (mode, credentials) => {
      ++revision.current;
      try {
        setAccount(await (mode === 'register' ? registerAccount(credentials) : logIn(credentials)));
        setIsAuthOpen(false);
      } finally {
        setRestoring(false);
      }
    };
    const logout = async () => {
      ++revision.current;
      setAccount(null);
      await endSession();
    };
    const save = async edit => {
      if (!account) throw new Error('Войди в аккаунт.');
      const current = revision.current;
      const updated = await updateAccount(account.profile.email, edit);
      if (current === revision.current) setAccount(updated);
    };

    return el(Context.Provider, {value: {
      user: account?.profile ?? null, restoring, authenticate, logout, isAuthOpen, setIsAuthOpen,
      balance: account?.balance ?? 0, chips: account?.chips ?? {}, transact: save,
      orders: account?.orders ?? [], teeth: account?.teeth ?? 0,
      updateProfile: profile => save(record => {
        for (const field of ['name', 'phone', 'city', 'address']) {
          record.profile[field] = profile[field].trim();
        }
        if (!record.profile.name) throw new Error('Введи имя.');
      }),
      addOrder: order => account ? save(record => {
        if (record.orders.some(item => item.id === order.id)) return;
        record.orders.unshift(order);
        record.teeth += Math.floor(order.total / 100);
      }) : Promise.resolve()
    }}, children);
  }

  function AuthDialog() {
    const {isAuthOpen, setIsAuthOpen, authenticate} = useUser();
    const [mode, setMode] = useState('login');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const dialog = useRef(null);
    const form = useRef(null);
    const registering = mode === 'register';

    useEffect(() => {
      if (isAuthOpen && !dialog.current.open) dialog.current.showModal();
      if (!isAuthOpen && dialog.current.open) dialog.current.close();
      if (!isAuthOpen) {
        form.current.reset();
        setMode('login');
        setError('');
      }
    }, [isAuthOpen]);

    async function submit(event) {
      event.preventDefault();
      if (busy) return;
      setBusy(true);
      setError('');
      try {
        await authenticate(mode, Object.fromEntries(new FormData(event.currentTarget)));
      } catch (failure) {
        setError(errorText(failure));
      } finally {
        setBusy(false);
      }
    }

    return el('dialog', {className: 'den-dialog', ref: dialog, 'aria-labelledby': 'den-auth-title',
      onCancel: event => { event.preventDefault(); if (!busy) setIsAuthOpen(false); },
      onClick: event => { if (event.target === dialog.current && !busy) setIsAuthOpen(false); }},
      el('div', {className: 'den-dialog-inner'},
        button('×', () => setIsAuthOpen(false), 'den-close', {'aria-label': 'Закрыть', disabled: busy}),
        el('img', {src: mascot, alt: '', className: 'den-dialog-mascot'}),
        el('h2', {id: 'den-auth-title'}, registering ? 'ВСТУПАЙ В СТАЮ' : 'ВХОД В ЛОГОВО'),
        el('div', {className: 'den-tabs den-auth-tabs', role: 'group', 'aria-label': 'Режим входа'},
          ...[['login', 'Вход'], ['register', 'Регистрация']].map(([id, text]) =>
            button(text, () => {setMode(id); setError('');}, 'den-tab', {key: id, 'aria-pressed': mode === id, disabled: busy}))),
        el('form', {ref: form, onSubmit: submit, className: 'den-fields'},
          registering && el('label', null, 'Имя', el('input', {name: 'name', autoComplete: 'name', required: true, maxLength: 60})),
          el('label', null, 'Почта', el('input', {name: 'email', type: 'email', autoComplete: 'username', required: true, maxLength: 254})),
          el('label', null, 'Пароль', el('input', {key: mode, name: 'password', type: 'password',
            autoComplete: registering ? 'new-password' : 'current-password',
            required: true, minLength: registering ? 8 : undefined, maxLength: 128})),
          error && el('p', {role: 'alert', className: 'den-error'}, error),
          button(busy ? 'Подожди…' : registering ? 'Создать аккаунт' : 'Войти', undefined, 'den-primary', {type: 'submit', disabled: busy})),
        el('p', {className: 'den-local'}, 'Аккаунт хранится в этом браузере.')));
  }

  function MemberProfile({user}) {
    const {orders, teeth, logout, updateProfile,balance,transact} = useUser();
    const navigate = useNavigate();
    const route=useLocation();
    const [tab, setTab] = useState(route.hash==='#donate'?'donate':'orders');
    const [message, setMessage] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(()=>{if(route.hash==='#donate')setTab('donate');},[route.key]);
    const discount = Math.min(Math.floor(teeth / 100) * 10, 50);
    const progress = discount === 50 ? 100 : teeth % 100;

    async function saveProfile(event) {
      event.preventDefault();
      const profile = Object.fromEntries(new FormData(event.currentTarget));
      setBusy(true);
      setMessage(null);
      try {
        await updateProfile(profile);
        setMessage({text: 'Профиль сохранён.'});
      } catch (error) {
        setMessage({error: true, text: errorText(error)});
      } finally {
        setBusy(false);
      }
    }

    return el('main', {className: 'den-profile'},
      el('div', {className: 'den-shell'},
        el('header', {className: 'den-hero'},
          el('img', {src: mascot, alt: '', className: 'den-hero-mascot'}),
          el('div', {className: 'den-hero-copy'}, el('p', {className: 'den-kicker'}, 'Личный кабинет'),
            el('h1', null, 'ЛОГОВО ' + user.name),
            el('div', {className: 'den-stats'},
              el('span', null, el('strong', null, teeth), ' зубов'),
              el('span', null, el('strong', null, discount + '%'), ' скидка')))),
        el('nav', {className: 'den-tabs den-profile-tabs', 'aria-label': 'Разделы кабинета'},
          ...tabs.map(([id, label]) => button(label, () => {setTab(id); setMessage(null);}, 'den-tab', {
            key: id, 'aria-current': tab === id ? 'page' : undefined
          })),
          button('Выйти', () => { logout().catch(() => {}); }, 'den-exit')),
        el('section', {key: tab, className: 'den-panel', 'aria-labelledby': 'den-panel-title'},
          el('h2', {id: 'den-panel-title'}, tabs.find(([id]) => id === tab)[1]),
          tab === 'orders' && (orders.length ? el('div', {className: 'den-orders'},
            ...orders.map(order => el('article', {className: 'den-order', key: order.id},
              el('header', null, el('strong', null, order.id), el('span', null, order.date)),
              el('ul', null, ...order.items.map((item, index) =>
                el('li', {key: index},
                  el('span', null, item.name + ' × ' + item.quantity),
                  el('span', null, rubles.format(item.price * item.quantity))))),
              el('footer', null, el('span', null, order.status), el('strong', null, rubles.format(order.total))))))
            : el('div', {className: 'den-empty'},
              el('p', null, 'Пока ни одного заказа. Пора пополнить запасы хруста.'),
              button('В каталог', () => navigate('/catalog'), 'den-primary'))),
          tab === 'profile' && el('form', {onSubmit: saveProfile, className: 'den-fields den-edit'},
            ...fields.map(([name, label, autocomplete]) => el('label', {key: name}, label,
              el('input', {name, defaultValue: user[name], autoComplete: autocomplete, required: name === 'name',
                type: name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'text',
                readOnly: name === 'email', maxLength: name === 'address' ? 160 : 60}))),
            button(busy ? 'Сохраняем…' : 'Сохранить профиль', undefined, 'den-primary', {type: 'submit', disabled: busy}),
            message && el('p', {role: message.error ? 'alert' : 'status', className: message.error ? 'den-error' : 'den-success'}, message.text)),
          tab === 'donate' && el('div', {className:'den-loyalty'},el('strong',null,'Баланс · '+balance+' ₽'),
            el('p',null,'Демо-пополнение игровыми рублями.'),
            button('Пополнить на 100 ₽',async()=>{if(busy)return;setBusy(true);try{await transact(record=>{record.balance+=100;});setMessage({text:'Начислено 100 ₽.'});}catch(e){setMessage({text:errorText(e)});}finally{setBusy(false);}},'den-primary',{disabled:busy}),
            message && el('p',{role:'status'},message.text)),
          tab === 'teeth' && el('div', {className: 'den-loyalty'},
            el('p', null, discount === 50 ? 'Максимальный уровень открыт.' : 'До следующего уровня: ' + (100 - progress) + ' зубов.'),
            el('progress', {max: 100, value: progress, 'aria-label': 'Прогресс до следующей скидки'}),
            el('ul', {className: 'den-levels'}, ...[10, 20, 30, 40, 50].map(level =>
              el('li', {key: level, className: discount >= level ? 'den-unlocked' : ''},
                el('strong', null, level + '%'), el('span', null, level * 10 + ' зубов')))),
            el('p', {className: 'den-local'}, 'За каждые 100 ₽ в заказе начисляется 1 зуб.')))));
  }

  function Profile() {
    const {user, restoring, setIsAuthOpen} = useUser();
    if (user) return el(MemberProfile, {user, key: user.email});
    return el('main', {className: 'den-profile den-guest'},
      el('section', {className: 'den-panel den-gate'},
        el('img', {src: mascot, alt: '', className: 'den-gate-mascot'}),
        el('h1', null, 'ВХОД В ЛОГОВО'),
        restoring ? el('p', {role: 'status'}, 'Открываем кабинет…') :
          el(React.Fragment, null, el('p', null, 'Здесь живут твои заказы, профиль и зубы.'),
            button('Войти или зарегистрироваться', () => setIsAuthOpen(true), 'den-primary'))));
  }

  return {Provider, AuthDialog, Profile};
}
